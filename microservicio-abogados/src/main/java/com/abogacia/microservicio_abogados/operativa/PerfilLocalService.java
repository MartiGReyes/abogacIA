package com.abogacia.microservicio_abogados.operativa;

import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import com.abogacia.microservicio_abogados.gestor.RegistrarAbogadoGestor;

@Service
@ConditionalOnProperty(name="abogados.desarrollo-local.enabled",havingValue="true")
@Transactional
public class PerfilLocalService {
    public static final String AVISO="perfil-local-v1";
    private final JdbcTemplate jdbc; private final DatosOperativos crypto;
    public PerfilLocalService(JdbcTemplate jdbc,DatosOperativos crypto) {
        this.jdbc=jdbc;this.crypto=crypto;
        var db=jdbc.queryForMap("select current_database() db,current_user usuario");
        if(!"contacto_operativo_test".equals(db.get("db"))||!"operativa_runtime".equals(db.get("usuario")))
            throw new IllegalStateException("Base local no autorizada.");
    }
    public record Alta(String nombre,String dni,String telefono,String especialidad,boolean consentimiento,String avisoVersion) {
        @Override public String toString(){return "AltaLocal[datos omitidos]";}
    }
    public Map<String,Object> registrar(Alta a) {
        if(!a.consentimiento()||!AVISO.equals(a.avisoVersion()))throw OperativaService.error(HttpStatus.BAD_REQUEST,"Confirmá la titularidad y el permiso de contacto.");
        String nombre=OperativaService.texto(a.nombre(),100,true),dni=OperativaService.texto(a.dni(),8,true),telefono;
        if(!dni.matches("[0-9]{7,8}"))throw OperativaService.error(HttpStatus.BAD_REQUEST,"Ingresá un DNI de 7 u 8 dígitos sin puntos.");
        try{telefono=DatosOperativos.telefono(a.telefono());}catch(IllegalArgumentException e){throw OperativaService.error(HttpStatus.BAD_REQUEST,e.getMessage());}
        if(nombre.replaceAll("[^0-9]","").contains(dni)||nombre.replaceAll("[^0-9]","").contains(telefono))throw OperativaService.error(HttpStatus.BAD_REQUEST,"Usá un nombre o alias sin DNI ni teléfono.");
        if(!RegistrarAbogadoGestor.ESPECIALIDADES.contains(a.especialidad()))throw OperativaService.error(HttpStatus.BAD_REQUEST,"Elegí una especialidad válida.");
        // Never replace a previously stored real profile silently. One local owner per runtime.
        jdbc.execute("select pg_advisory_xact_lock(5182002)");
        if(jdbc.queryForObject("select count(*) from operativa.perfil_local",Long.class)>0)throw OperativaService.error(HttpStatus.CONFLICT,"Ya existe un perfil local. Podés habilitar o revocar su contacto.");
        UUID id=UUID.randomUUID();
        jdbc.update("insert into operativa.perfil_local(id,nombre_visible,dni_cifrado,telefono_cifrado,especialidad,matricula_prueba,permitido) values(?,?,?,?,?,?,true)",id,nombre,crypto.cifrar(dni,id,"dni"),crypto.cifrar(telefono,id,"telefono"),a.especialidad(),"PRUEBA-"+id);
        return propio();
    }
    private Map<String,Object> tarjeta(Map<String,Object> r) {
        var dto=new LinkedHashMap<String,Object>();UUID id=(UUID)r.get("id");
        dto.put("idAbogado",id.toString());dto.put("nombre",r.get("nombre_visible"));dto.put("apellido","");
        dto.put("especialidades",List.of(r.get("especialidad")));dto.put("tipoPerfil","PRUEBA_LOCAL");
        dto.put("perfilPrueba",true);dto.put("matriculaVerificada",false);dto.put("identidadVerificada",false);
        dto.put("leyenda","Perfil de prueba — matrícula no verificada");dto.put("identidad","Identidad declarada; no verificada por Didit");
        dto.put("contactoHabilitado",r.get("permitido"));
        String numero=crypto.descifrar((byte[])r.get("telefono_cifrado"),id,"telefono");
        dto.put("telefonoEnmascarado","+54 9 ••••••"+numero.substring(numero.length()-4));return dto;
    }
    public Map<String,Object> propio() {
        var rows=jdbc.queryForList("select * from operativa.perfil_local");
        if(rows.isEmpty())return Map.of("existe",false,"avisoVersion",AVISO);
        var dto=tarjeta(rows.getFirst());dto.put("existe",true);dto.put("avisoVersion",AVISO);return dto;
    }
    public void permiso(UUID id,boolean permitido) {
        if(jdbc.update("update operativa.perfil_local set permitido=? where id=?",permitido,id)!=1)throw OperativaService.error(HttpStatus.NOT_FOUND,"Perfil local no disponible.");
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> listar(String especialidad) {
        String filtro=especialidad==null?"":especialidad.trim();
        return jdbc.queryForList("select * from operativa.perfil_local where (?='' or especialidad=?)",filtro,filtro).stream().map(this::tarjeta).toList();
    }
    public OperativaService.DestinoContacto destino(UUID id) {
        var rows=jdbc.queryForList("select * from operativa.perfil_local where id=? and permitido",id);
        if(rows.isEmpty())throw OperativaService.error(HttpStatus.CONFLICT,"Contacto no disponible");
        var r=rows.getFirst();return new OperativaService.DestinoContacto((String)r.get("nombre_visible"),crypto.descifrar((byte[])r.get("telefono_cifrado"),id,"telefono"),crypto.descifrar((byte[])r.get("dni_cifrado"),id,"dni"),(String)r.get("matricula_prueba"));
    }
    public void validarConsulta(String consulta) {
        String numeros=consulta.replaceAll("[^0-9]","");
        for(var r:jdbc.queryForList("select id,dni_cifrado,telefono_cifrado from operativa.perfil_local")) {
            UUID id=(UUID)r.get("id");
            if(numeros.contains(crypto.descifrar((byte[])r.get("dni_cifrado"),id,"dni"))||numeros.contains(crypto.descifrar((byte[])r.get("telefono_cifrado"),id,"telefono")))throw OperativaService.error(HttpStatus.BAD_REQUEST,"Retirá los datos personales del registro de la consulta.");
        }
    }
}

package com.abogacia.microservicio_abogados.operativa;

import com.abogacia.microservicio_abogados.entity.AbogadoRegistrado;
import com.abogacia.microservicio_abogados.repository.AbogadoRepository;
import com.abogacia.microservicio_abogados.contacto.AutorizacionWhatsApp;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;

/** Encrypted columns of an existing professional account, never an independent profile. */
@Service
@ConditionalOnProperty(name="abogados.cuentas-prueba.enabled",havingValue="true")
@Transactional
public class CuentaPruebaService {
    private final JdbcTemplate jdbc;private final DatosOperativos crypto;private final AbogadoRepository abogados;private final AutorizacionWhatsApp whatsapp;
    public CuentaPruebaService(JdbcTemplate j,DatosOperativos c,AbogadoRepository a,AutorizacionWhatsApp w){
        jdbc=j;crypto=c;abogados=a;whatsapp=w;
        var db=j.queryForMap("select current_database() db,current_user usuario");
        if(!"contacto_operativo_test".equals(db.get("db"))||!"operativa_runtime".equals(db.get("usuario")))throw new IllegalStateException("Base de cuentas de prueba no autorizada.");
    }
    public static boolean marcada(AbogadoRegistrado a){return a.getNroMatricula()!=null&&a.getNroMatricula().startsWith("PRUEBA-");}
    public boolean cuenta(AbogadoRegistrado a){
        return marcada(a)&&!a.esSolicitud()&&a.getEstado()!=null&&"REGISTRADO".equals(a.getEstado().getNombreEstado())
            &&!Boolean.TRUE.equals(a.getDniVerificado())&&!Boolean.TRUE.equals(a.getMatriculaVerificada())
            &&!"APROBADA".equals(a.getVerificacionDni())&&!"VALIDADA".equals(a.getValidacionMatricula())
            &&jdbc.queryForObject("select count(*) from operativa.cuenta_prueba where id_abogado=?",Long.class,a.getIdAbogado())==1;
    }
    private Map<String,Object> fila(AbogadoRegistrado a){
        if(!cuenta(a))throw OperativaService.error(HttpStatus.FORBIDDEN,"Cuenta de prueba no disponible.");
        return jdbc.queryForMap("select * from operativa.cuenta_prueba where id_abogado=?",a.getIdAbogado());
    }
    private String dato(Map<String,Object> r,String campo){return r.get(campo+"_cifrado") instanceof byte[] b?crypto.descifrar(b,(UUID)r.get("contexto"),campo):"";}
    public String telefono(AbogadoRegistrado a){return dato(fila(a),"telefono");}
    public String dni(AbogadoRegistrado a){return dato(fila(a),"dni");}
    public boolean disponible(AbogadoRegistrado a){
        if(!cuenta(a)||!whatsapp.permitido(a.getIdAbogado()))return false;
        try{return !dni(a).isBlank()&&!DatosOperativos.telefono(telefono(a)).isBlank();}catch(IllegalArgumentException e){return false;}
    }
    public void guardarTelefono(AbogadoRegistrado a,String valor){
        String numero;try{numero=DatosOperativos.telefono(valor);}catch(IllegalArgumentException e){throw OperativaService.error(HttpStatus.BAD_REQUEST,e.getMessage());}
        var r=fila(a);if(!numero.equals(dato(r,"telefono")))whatsapp.revocar(a.getIdAbogado());
        jdbc.update("update operativa.cuenta_prueba set telefono_cifrado=? where id_abogado=?",crypto.cifrar(numero,(UUID)r.get("contexto"),"telefono"),a.getIdAbogado());
        a.setNroCelular("CIFRADO");
    }
    public void guardarDni(AbogadoRegistrado a,String valor){
        if(valor==null||!valor.matches("[0-9]{7,8}"))throw OperativaService.error(HttpStatus.BAD_REQUEST,"Ingresá un DNI de 7 u 8 dígitos sin puntos.");
        var r=fila(a);jdbc.update("update operativa.cuenta_prueba set dni_cifrado=? where id_abogado=?",crypto.cifrar(valor,(UUID)r.get("contexto"),"dni"),a.getIdAbogado());
        whatsapp.revocar(a.getIdAbogado());
    }
    public void completarPerfil(AbogadoRegistrado a,Map<String,Object> dto){
        var r=fila(a);dto.put("cuentaPrueba",true);dto.put("dniCargado",r.get("dni_cifrado")!=null);
        dto.put("dni",r.get("dni_cifrado")==null?"Pendiente de carga":"Ingresado y cifrado");dto.put("nroCelular",dato(r,"telefono"));
        dto.put("leyenda","Cuenta de prueba — matrícula no verificada");dto.put("verificacionDni","DECLARADA_NO_VERIFICADA");dto.put("validacionMatricula","FICTICIA_NO_VERIFICADA");
    }
    @Transactional(readOnly=true)
    public List<Map<String,Object>> listar(String especialidad){
        return jdbc.queryForList("select id_abogado from operativa.cuenta_prueba order by id_abogado").stream()
            .map(r->abogados.findById(((Number)r.get("id_abogado")).longValue()).orElse(null))
            .filter(Objects::nonNull).filter(this::cuenta)
            .filter(a->especialidad==null||especialidad.isBlank()||a.getEspecialidades().stream().anyMatch(e->e.equalsIgnoreCase(especialidad)))
            .map(a->{Map<String,Object> d=new LinkedHashMap<>();d.put("idAbogado",a.getIdAbogado());d.put("nombre",a.getNombre());d.put("apellido",a.getApellido());d.put("especialidades",a.getEspecialidades().stream().sorted().toList());
                d.put("cuentaPrueba",true);d.put("perfilPrueba",true);d.put("matriculaVerificada",false);d.put("identidadVerificada",false);d.put("contactoHabilitado",disponible(a));
                d.put("leyenda","Cuenta de prueba — matrícula no verificada");String n=telefono(a);if(!n.isBlank())d.put("telefonoEnmascarado","+54 9 ••••••"+n.substring(n.length()-4));return d;}).toList();
    }
    public void validarConsulta(String consulta){
        String numeros=consulta.replaceAll("[^0-9]","");
        for(var r:jdbc.queryForList("select * from operativa.cuenta_prueba"))for(String campo:List.of("dni","telefono")){
            String valor=dato(r,campo);if(!valor.isBlank()&&numeros.contains(valor))throw OperativaService.error(HttpStatus.BAD_REQUEST,"Retirá los datos personales del registro de la consulta.");
        }
    }
}

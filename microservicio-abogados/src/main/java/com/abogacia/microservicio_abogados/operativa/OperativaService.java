package com.abogacia.microservicio_abogados.operativa;

import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.net.*;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.abogacia.microservicio_abogados.gestor.RegistrarAbogadoGestor;

@Service
@Profile("contacto-operativo-test")
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="abogados.legacy-operativa.enabled",havingValue="true")
@Transactional
public class OperativaService {
    public static final String AVISO="operativa-v1";
    public static final String LEYENDA="Perfil de prueba operativa — matrícula no verificada";
    public static final String IDENTIDAD="Identidad declarada; no verificada por Didit";
    private final JdbcTemplate jdbc;
    private final DatosOperativos crypto;
    private final byte[] operatorHash;
    public OperativaService(JdbcTemplate jdbc, DatosOperativos crypto,@Value("${OP_OPERATOR_CODE_FILE}") String file) throws java.io.IOException {
        this.jdbc=jdbc;this.crypto=crypto;
        String code=Files.readString(Path.of(file)).trim();
        if(code.length()<40)throw new IllegalStateException("Acceso operativo insuficiente.");
        operatorHash=DatosOperativos.hash(code).getBytes(StandardCharsets.US_ASCII);
        var db=jdbc.queryForMap("select current_database() db, current_user usuario");
        if(!"contacto_operativo_test".equals(db.get("db")) || !"operativa_runtime".equals(db.get("usuario")))
            throw new IllegalStateException("La conexión operativa no es la autorizada.");
    }
    public record Sesion(UUID campania, String rol, Instant vence, String hash) {
        @Override public String toString(){return "Sesion[datos omitidos]";}
    }
    public record Acceso(String token, Sesion sesion) {
        @Override public String toString(){return "Acceso[datos omitidos]";}
    }
    public record Alta(String nombre, String dni, String telefono, String especialidad, boolean consentimiento, String avisoVersion) {
        @Override public String toString(){return "Alta[datos omitidos]";}
    }
    public record Contacto(String nombre, String telefono, String resumen, String mensajeConfirmado, boolean consentimiento, String avisoVersion) {
        @Override public String toString(){return "Contacto[datos omitidos]";}
    }
    static ResponseStatusException error(HttpStatus status,String razon){return new ResponseStatusException(status,razon);}
    private static Timestamp ts(Instant fecha){return Timestamp.from(fecha);}
    static String texto(String value,int max,boolean obligatorio) {
        if(value==null)value="";
        value=value.trim();
        if(value.length()>max || (obligatorio&&value.isBlank()) || value.chars().anyMatch(c->c<32&&c!='\n'&&c!='\t'))
            throw error(HttpStatus.BAD_REQUEST,"Revisá los campos y sus longitudes.");
        return value;
    }
    public Sesion sesion(String token,String rol) {
        if(token==null || !token.matches("[A-Za-z0-9_-]{43}"))throw error(HttpStatus.UNAUTHORIZED,"Ingresá al circuito privado.");
        String hash=DatosOperativos.hash(token);
        var rows=jdbc.query("select s.campania_id,s.rol,s.vence_en from operativa.sesion s join operativa.campania c on c.id=s.campania_id where s.hash=? and not s.revocada and s.vence_en>now() and c.activa and c.vence_en>now()",
            (r,n)->new Sesion(r.getObject(1,UUID.class),r.getString(2),r.getTimestamp(3).toInstant(),hash),hash);
        if(rows.isEmpty())throw error(HttpStatus.UNAUTHORIZED,"La sesión privada venció o fue cerrada.");
        var s=rows.getFirst();
        if(rol!=null&&!s.rol().equals(rol))throw error(HttpStatus.FORBIDDEN,"Tu acceso no permite esta operación.");
        return s;
    }
    private UUID campania() {
        jdbc.execute("select pg_advisory_xact_lock(5182001)");
        var ids=jdbc.query("select id from operativa.campania where activa and vence_en>now() order by creada_en desc limit 1",(r,n)->r.getObject(1,UUID.class));
        if(!ids.isEmpty())return ids.getFirst();
        UUID id=UUID.randomUUID();
        jdbc.update("insert into operativa.campania(id,creada_en,vence_en,activa) values(?,now(),now()+interval '24 hours',true)",id);
        return id;
    }
    private Acceso emitir(UUID campania,String rol) {
        String token=crypto.token();
        Instant fin=jdbc.queryForObject("select vence_en from operativa.campania where id=?",Timestamp.class,campania).toInstant();
        Instant vence=Instant.now().plusSeconds(rol.equals("OPERADOR")?28800:7200);
        if(vence.isAfter(fin))vence=fin;
        String hash=DatosOperativos.hash(token);
        jdbc.update("insert into operativa.sesion(hash,campania_id,rol,vence_en,revocada) values(?,?,?,?,false)",hash,campania,rol,ts(vence));
        return new Acceso(token,new Sesion(campania,rol,vence,hash));
    }
    public Acceso loginOperador(String codigo) {
        codigo=texto(codigo,100,true);
        if(!MessageDigest.isEqual(operatorHash,DatosOperativos.hash(codigo).getBytes(StandardCharsets.US_ASCII)))
            throw error(HttpStatus.UNAUTHORIZED,"Código de acceso inválido o vencido.");
        return emitir(campania(),"OPERADOR");
    }
    public Acceso loginParticipante(String codigo) {
        codigo=texto(codigo,100,true);
        var filas=jdbc.queryForList("select i.campania_id from operativa.invitacion i join operativa.campania c on c.id=i.campania_id where i.hash=? and not i.consumida and i.vence_en>now() and c.activa and c.vence_en>now() for update of i",DatosOperativos.hash(codigo));
        if(filas.isEmpty())throw error(HttpStatus.UNAUTHORIZED,"Código de acceso inválido o vencido.");
        UUID campania=(UUID)filas.getFirst().get("campania_id");
        if(!hayPerfilActivo(campania))throw error(HttpStatus.UNAUTHORIZED,"La prueba no está habilitada.");
        jdbc.update("update operativa.invitacion set consumida=true where hash=?",DatosOperativos.hash(codigo));
        return emitir(campania,"PARTICIPANTE");
    }
    private boolean hayPerfilActivo(UUID campania) {
        return jdbc.queryForObject("select count(*) from operativa.perfil where campania_id=? and activo and vence_en>now()",Long.class,campania)>0;
    }
    public Map<String,Object> invitacion(Sesion sesion) {
        if(!hayPerfilActivo(sesion.campania()))throw error(HttpStatus.CONFLICT,"Primero registrá y activá tu perfil operativo.");
        String code=crypto.token();Instant vence=Instant.now().plusSeconds(900);
        jdbc.update("insert into operativa.invitacion(hash,campania_id,vence_en,consumida) values(?,?,?,false)",DatosOperativos.hash(code),sesion.campania(),ts(vence));
        return Map.of("codigo",code,"venceEn",vence,"aviso","Un uso, 15 minutos. Compartilo solo con el participante elegido, fuera de la URL.");
    }
    public void salir(Sesion s){jdbc.update("update operativa.sesion set revocada=true where hash=?",s.hash());}
    public Acceso nuevaCampania(Sesion s) {
        jdbc.update("update operativa.campania set activa=false where id=?",s.campania());
        jdbc.update("update operativa.sesion set revocada=true where campania_id=?",s.campania());
        jdbc.update("update operativa.perfil set activo=false where campania_id=?",s.campania());
        return emitir(campania(),"OPERADOR");
    }
    public Map<String,Object> alta(Sesion s,Alta r) {
        if(!r.consentimiento()||!AVISO.equals(r.avisoVersion()))throw error(HttpStatus.BAD_REQUEST,"Aceptá el aviso operativo vigente y confirmá que el número es tuyo.");
        String nombre=texto(r.nombre(),100,true),dni=texto(r.dni(),8,true),telefono;
        if(!dni.matches("[0-9]{7,8}"))throw error(HttpStatus.BAD_REQUEST,"Ingresá un DNI de 7 u 8 dígitos sin puntos.");
        try{telefono=DatosOperativos.telefono(r.telefono());}catch(IllegalArgumentException e){throw error(HttpStatus.BAD_REQUEST,e.getMessage());}
        String numerosNombre=nombre.replaceAll("[^0-9]","");
        if(numerosNombre.contains(dni)||numerosNombre.contains(telefono))throw error(HttpStatus.BAD_REQUEST,"Usá un nombre o alias sin DNI ni teléfono.");
        if(!RegistrarAbogadoGestor.ESPECIALIDADES.contains(r.especialidad()))throw error(HttpStatus.BAD_REQUEST,"Elegí una especialidad de la lista.");
        UUID id=UUID.randomUUID();
        jdbc.update("insert into operativa.perfil(id,campania_id,nombre_visible,dni_cifrado,telefono_cifrado,version_clave,especialidad,matricula_prueba,tipo_perfil,identidad_estado,matricula_estado,activo,creado_en,vence_en,consentimiento_contacto_en,aviso_version) select ?,?,?,?,?, 'v1',?,?,'PRUEBA_OPERATIVA','DECLARADA_NO_VERIFICADA','FICTICIA_NO_VERIFICADA',false,now(),vence_en,now(),? from operativa.campania where id=? and activa and vence_en>now()",
            id,s.campania(),nombre,crypto.cifrar(dni,id,"dni"),crypto.cifrar(telefono,id,"telefono"),r.especialidad(),"PRUEBA-"+id,AVISO,s.campania());
        return perfilOperador(s);
    }
    private Map<String,Object> tarjeta(Map<String,Object> r) {
        Map<String,Object> dto=new LinkedHashMap<>();
        dto.put("id",r.get("id"));dto.put("nombre",r.get("nombre_visible"));dto.put("especialidad",r.get("especialidad"));
        dto.put("leyenda",LEYENDA);dto.put("identidad",IDENTIDAD);dto.put("activo",r.get("activo"));dto.put("venceEn",((Timestamp)r.get("vence_en")).toInstant());
        dto.put("tipoPerfil","PRUEBA_OPERATIVA");dto.put("matriculaVerificada",false);dto.put("identidadVerificada",false);
        if(r.get("telefono_cifrado") instanceof byte[] cifrado) {
            String numero=crypto.descifrar(cifrado,(UUID)r.get("id"),"telefono");
            dto.put("telefonoEnmascarado","+54 9 ••••••"+numero.substring(numero.length()-4));
        }
        return dto;
    }
    public Map<String,Object> perfilOperador(Sesion s) {
        var rows=jdbc.queryForList("select * from operativa.perfil where campania_id=?",s.campania());
        if(rows.isEmpty())return Map.of("existe",false);
        var r=rows.getFirst();UUID id=(UUID)r.get("id");var dto=tarjeta(r);
        String telefono=crypto.descifrar((byte[])r.get("telefono_cifrado"),id,"telefono");
        dto.put("existe",true);dto.put("telefonoEnmascarado","+54 9 ••••••"+telefono.substring(telefono.length()-4));
        dto.put("dni","Ingresado y cifrado; identidad no verificada");dto.put("matriculaPrueba",r.get("matricula_prueba"));return dto;
    }
    public void activar(Sesion s,UUID id,boolean activo) {
        int cambios=jdbc.update("update operativa.perfil set activo=? where id=? and campania_id=? and vence_en>now()",activo,id,s.campania());
        if(cambios!=1)throw error(HttpStatus.NOT_FOUND,"Perfil operativo no disponible.");
        if(!activo){
            jdbc.update("update operativa.sesion set revocada=true where campania_id=? and rol='PARTICIPANTE'",s.campania());
            jdbc.update("update operativa.invitacion set consumida=true where campania_id=?",s.campania());
        }
    }
    public List<Map<String,Object>> recomendaciones(Sesion s,String especialidad) {
        if(especialidad==null)especialidad="";
        return jdbc.queryForList("select id,nombre_visible,especialidad,activo,vence_en,telefono_cifrado from operativa.perfil where campania_id=? and activo and vence_en>now() and (?='' or especialidad=?)",s.campania(),especialidad,especialidad).stream().map(this::tarjeta).toList();
    }
    private Map<String,Object> destino(Sesion s,UUID id) {
        var rows=jdbc.queryForList("select * from operativa.perfil where id=? and campania_id=? and activo and vence_en>now()",id,s.campania());
        if(rows.isEmpty())throw error(HttpStatus.NOT_FOUND,"Perfil operativo no disponible.");return rows.getFirst();
    }
    public record DestinoContacto(String nombre,String numero,String dni,String matricula) {
        @Override public String toString(){return "DestinoContacto[datos omitidos]";}
    }
    public DestinoContacto destinoContacto(Sesion s,UUID id){
        var r=destino(s,id);
        return new DestinoContacto((String)r.get("nombre_visible"),crypto.descifrar((byte[])r.get("telefono_cifrado"),id,"telefono"),crypto.descifrar((byte[])r.get("dni_cifrado"),id,"dni"),(String)r.get("matricula_prueba"));
    }
    public void validarConsulta(Sesion s,String texto) {
        if(!hayPerfilActivo(s.campania()))throw error(HttpStatus.FORBIDDEN,"La campaña no tiene un perfil activo.");
        var r=jdbc.queryForMap("select id,dni_cifrado,telefono_cifrado from operativa.perfil where campania_id=?",s.campania());
        UUID id=(UUID)r.get("id");String numeros=texto.replaceAll("[^0-9]","");
        if(numeros.contains(crypto.descifrar((byte[])r.get("dni_cifrado"),id,"dni"))
            || numeros.contains(crypto.descifrar((byte[])r.get("telefono_cifrado"),id,"telefono")))
            throw error(HttpStatus.BAD_REQUEST,"Usá una consulta técnica sin los datos personales del registro.");
    }
}

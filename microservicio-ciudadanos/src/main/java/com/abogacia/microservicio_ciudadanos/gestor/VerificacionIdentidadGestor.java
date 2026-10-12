package com.abogacia.microservicio_ciudadanos.gestor;

import com.abogacia.microservicio_ciudadanos.didit.*;
import com.abogacia.microservicio_ciudadanos.entity.*;
import com.abogacia.microservicio_ciudadanos.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.Instant;
import java.util.*;
import java.security.*;
import java.nio.charset.StandardCharsets;

@Service
public class VerificacionIdentidadGestor {
    private final CiudadanoRepository ciudadanos;
    private final VerificacionIdentidadRepository verificaciones;
    private final PasswordEncoder passwords;
    private final DiditClient client;
    private final DiditConfig config;
    private final VerificarDniCiudadanoGestor resultados;
    private final TransactionTemplate tx;
    private final String dummy;
    public VerificacionIdentidadGestor(CiudadanoRepository ciudadanos,VerificacionIdentidadRepository verificaciones,
            PasswordEncoder passwords,DiditClient client,DiditConfig config,VerificarDniCiudadanoGestor resultados,PlatformTransactionManager tm){
        this.ciudadanos=ciudadanos;this.verificaciones=verificaciones;this.passwords=passwords;
        this.client=client;this.config=config;this.resultados=resultados;tx=new TransactionTemplate(tm);
        dummy=passwords.encode(UUID.randomUUID().toString());
    }
    public record Acceso(String token,Instant vence) {
        @Override public String toString(){return "Acceso[token omitido]";}
    }
    /** Account summary without personal data. */
    public record Cuenta(String estado,boolean correoConfirmado,String verificacionDni) {
        static Cuenta de(Ciudadano c){
            return new Cuenta(c.getEstado().getNombreEstado(),c.getCorreoConfirmado(),c.getVerificacionDni()==null?"PENDIENTE":c.getVerificacionDni());
        }
    }
    public record Estado(Cuenta cuenta,String sesionEstado,String url,boolean puedeReintentar,String avisoVersion,String seguimiento) {
        @Override public String toString(){return "Estado[datos omitidos]";}
    }
    private record Trabajo(Long id,String sesion,String referencia,String operacion) {}

    public DiditConfig.Aviso aviso(){return config.aviso();}

    public Acceso acceso(String mail,String password){
        var existente=ciudadanos.findByMail(mail.trim()).orElse(null);
        boolean valid=password.getBytes(StandardCharsets.UTF_8).length<=72;
        boolean coincide=passwords.matches(valid?password:"",existente==null?dummy:existente.getContrasenaHash());
        if(!valid || !coincide || existente==null)throw denied();
        return tx.execute(s->{
            var c=ciudadanos.findByIdForUpdate(existente.getIdCiudadano()).orElseThrow();
            if(!c.getCorreoConfirmado() || c.getEstado()==null || "BAJA".equals(c.getEstado().getNombreEstado()))throw denied();
            byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);
            String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            Instant vence=Instant.now().plusSeconds(900);
            c.setAccesoRegistroHash(hash(token));c.setAccesoRegistroVence(vence);
            return new Acceso(token,vence);
        });
    }
    private Long titular(String token){
        if(token==null || !token.matches("[A-Za-z0-9_-]{43}"))throw denied();
        var c=ciudadanos.findByAccesoRegistroHash(hash(token)).orElseThrow(VerificacionIdentidadGestor::denied);
        if(c.getAccesoRegistroVence()==null || !c.getAccesoRegistroVence().isAfter(Instant.now()) || !c.getCorreoConfirmado()
                || "BAJA".equals(c.getEstado().getNombreEstado()))throw denied();
        return c.getIdCiudadano();
    }
    private void comprobarAcceso(Ciudadano c,String token){
        if(!hash(token).equals(c.getAccesoRegistroHash()) || !c.getAccesoRegistroVence().isAfter(Instant.now())
                || "BAJA".equals(c.getEstado().getNombreEstado()))throw denied();
    }
    public Estado estado(String token,boolean consultar){
        Long id=titular(token);
        if(consultar)reconciliar(id,false);
        return resumen(id);
    }
    public void cerrar(String token){
        Long id=titular(token);
        tx.executeWithoutResult(s->{
            var c=ciudadanos.findByIdForUpdate(id).orElseThrow();comprobarAcceso(c,token);
            c.setAccesoRegistroHash(null);c.setAccesoRegistroVence(null);
        });
    }
    public Estado crear(String token,boolean consentimiento,String version){
        Long id=titular(token);
        var aviso=config.aviso();
        if(!aviso.disponible())throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,aviso.texto());
        if(!consentimiento || !aviso.version().equals(version))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Debés aceptar el aviso de privacidad vigente.");
        Trabajo trabajo=tx.execute(s->{
            var c=ciudadanos.findByIdForUpdate(id).orElseThrow();comprobarAcceso(c,token);
            var v=verificaciones.findById(id).orElseGet(()->new VerificacionIdentidad(id));
            Instant now=Instant.now();
            if(v.leaseHasta!=null && v.leaseHasta.isAfter(now))throw busy();
            if(v.sesion!=null && !Set.of("Expired","Abandoned").contains(v.estado)){
                v.avisoVersion=version;v.avisoHash=hash(aviso.texto());v.consentimiento=true;v.consentimientoFecha=now;
                return null;
            }
            if(!"PENDIENTE".equals(c.getEstado().getNombreEstado()) || "RECHAZADA".equals(c.getVerificacionDni()))throw new ResponseStatusException(HttpStatus.CONFLICT,"La solicitud requiere revisión; no se creará otra sesión.");
            if(v.referencia==null || v.sesion!=null){
                if(v.intentos>=3)throw new ResponseStatusException(HttpStatus.CONFLICT,"Se alcanzó el límite de intentos. Solicitá revisión.");
                v.referencia=UUID.randomUUID().toString();v.intentos++;v.consultas=0;v.errores=0;
                v.inicio=now;v.sesion=null;v.url=null;c.setSesionDidit(null);
            }
            if(v.errores>=5)throw new ResponseStatusException(HttpStatus.CONFLICT,"Se alcanzó el límite de recuperación. Solicitá revisión.");
            if(v.ultimaConsulta!=null && v.ultimaConsulta.plusSeconds(30).isAfter(now))throw busy();
            v.workflow=config.workflowId();v.avisoVersion=version;v.avisoHash=hash(aviso.texto());
            v.consentimiento=true;v.consentimientoFecha=now;v.estado="CREANDO";
            v.operacion=UUID.randomUUID().toString();v.leaseHasta=now.plusSeconds(30);v.ultimaConsulta=now;
            v.proximaConsulta=null;verificaciones.save(v);
            return new Trabajo(id,null,v.referencia,v.operacion);
        });
        if(trabajo==null)return resumen(id);
        try {
            var sesion=client.crear(trabajo.referencia());
            tx.executeWithoutResult(s->{
                var c=ciudadanos.findByIdForUpdate(id).orElseThrow();var v=verificaciones.findById(id).orElseThrow();
                if(!trabajo.operacion().equals(v.operacion))return;
                if("BAJA".equals(c.getEstado().getNombreEstado())){v.estado="BAJA";v.proximaConsulta=null;v.leaseHasta=null;return;}
                v.sesion=sesion.session_id();v.url=sesion.url();v.workflowVersion=sesion.workflow_version();
                v.estado="Not Started";v.leaseHasta=null;v.errorCodigo=null;v.proximaConsulta=Instant.now().plusSeconds(60);
                c.setSesionDidit(v.sesion);c.setVerificacionDni("PENDIENTE");
            });
        } catch(ResponseStatusException e){fallo(trabajo,true);throw e;}
        return resumen(id);
    }
    private Estado resumen(Long id){
        return tx.execute(s->{
            var c=ciudadanos.findById(id).orElseThrow();var v=verificaciones.findById(id).orElse(null);
            boolean reintento=v==null || ("ERROR_CREACION".equals(v.estado) && v.errores<5)
                    || (v.intentos<3 && Set.of("Expired","Abandoned").contains(v.estado));
            return new Estado(Cuenta.de(c),v==null?"SIN_SESION":v.estado,
                    v!=null && !Set.of("Expired","Abandoned","Declined","Kyc Expired","BAJA").contains(v.estado)?v.url:null,
                    reintento,v==null?null:v.avisoVersion,v==null?null:v.errorCodigo);
        });
    }
    public void reconciliar(Long id,boolean periodica){
        Trabajo trabajo=tx.execute(s->{
            var c=ciudadanos.findByIdForUpdate(id).orElse(null);if(c==null)return null;
            var v=verificaciones.findById(id).orElse(null);Instant now=Instant.now();
            if(v==null || v.sesion==null)return null;
            if("BAJA".equals(c.getEstado().getNombreEstado())){v.proximaConsulta=null;return null;}
            if(v.leaseHasta!=null && v.leaseHasta.isAfter(now))return null;
            if(v.ultimaConsulta!=null && v.ultimaConsulta.plusSeconds(30).isAfter(now))return null;
            if(periodica && (v.proximaConsulta==null || v.proximaConsulta.isAfter(now)))return null;
            if(v.consultas>=240 || v.inicio.plusSeconds(7*86400).isBefore(now)){
                v.proximaConsulta=null;v.errorCodigo="LIMITE_CONSULTAS";return null;
            }
            if(Set.of("Approved","Declined","Expired","Abandoned","Kyc Expired").contains(v.estado))return null;
            v.operacion=UUID.randomUUID().toString();v.leaseHasta=now.plusSeconds(30);
            v.consultas++;v.ultimaConsulta=now;v.proximaConsulta=now.plusSeconds(300);
            return new Trabajo(id,v.sesion,v.referencia,v.operacion);
        });
        if(trabajo==null)return;
        try {
            var decision=client.consultar(trabajo.sesion());
            if(!trabajo.referencia().equals(decision.vendor_data()))throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Resultado de sesión no vinculada.");
            var resultado=DiditVerificadorIdentidad.evaluar(decision);
            tx.executeWithoutResult(s->{
                var c=ciudadanos.findByIdForUpdate(id).orElseThrow();var v=verificaciones.findById(id).orElseThrow();
                if(!trabajo.operacion().equals(v.operacion) || !trabajo.sesion().equals(c.getSesionDidit()))return;
                resultados.aplicar(c,resultado);
                v.estado=Set.of("Approved","Declined","Not Started","In Progress","In Review","Resubmitted","Awaiting User","Expired","Abandoned","Kyc Expired")
                        .contains(decision.status()==null?"":decision.status())?decision.status():"INCOMPLETA";
                if("Approved".equals(v.estado) && resultado.estado()==VerificadorIdentidad.Estado.PENDIENTE)v.estado="INCOMPLETA";
                v.leaseHasta=null;v.errores=0;v.errorCodigo=null;
                if(resultado.estado()!=VerificadorIdentidad.Estado.PENDIENTE || Set.of("Expired","Abandoned","Kyc Expired").contains(v.estado))v.proximaConsulta=null;
            });
        } catch(ResponseStatusException e){fallo(trabajo,false);if(!periodica)throw e;}
    }
    private void fallo(Trabajo t,boolean creando){
        tx.executeWithoutResult(s->{
            ciudadanos.findByIdForUpdate(t.id()).orElseThrow();var v=verificaciones.findById(t.id()).orElseThrow();
            if(!t.operacion().equals(v.operacion))return;
            v.leaseHasta=null;v.errores++;v.errorCodigo="DIDIT_NO_DISPONIBLE";
            if(creando){v.estado="ERROR_CREACION";v.proximaConsulta=null;}
            else v.proximaConsulta=Instant.now().plusSeconds(Math.min(3600,300L << Math.min(v.errores,3)));
        });
    }
    public static String hash(String value){
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException e){throw new IllegalStateException();}
    }
    private static ResponseStatusException denied(){return new ResponseStatusException(HttpStatus.UNAUTHORIZED,"No se pudo autorizar el acceso a la solicitud.");}
    private static ResponseStatusException busy(){return new ResponseStatusException(HttpStatus.CONFLICT,"Hay una operación en curso. Intentá nuevamente en unos segundos.");}
}

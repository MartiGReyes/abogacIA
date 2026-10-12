package com.abogacia.microservicio_abogados.gestor;

import com.abogacia.microservicio_abogados.didit.*;
import com.abogacia.microservicio_abogados.dto.AbogadoResponse;
import com.abogacia.microservicio_abogados.entity.*;
import com.abogacia.microservicio_abogados.repository.*;
import org.springframework.stereotype.Service;
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
    private final AbogadoRepository abogados;
    private final VerificacionIdentidadRepository verificaciones;
    private final DiditClient client;
    private final DiditConfig config;
    private final VerificarDniAbogadoGestor resultados;
    private final TransactionTemplate tx;
    @org.springframework.beans.factory.annotation.Autowired
    private DiditPruebaLocal pruebaLocal;
    private boolean pruebaHabilitada(){return pruebaLocal!=null && pruebaLocal.habilitada();}
    public DiditConfig.Aviso aviso(){
        if(!pruebaHabilitada())return config.aviso();
        var aviso=config.avisoPruebaLocal();
        return new DiditConfig.Aviso(false,aviso.version(),aviso.texto());
    }
    public VerificacionIdentidadGestor(AbogadoRepository abogados,VerificacionIdentidadRepository verificaciones,
            DiditClient client,DiditConfig config,VerificarDniAbogadoGestor resultados,PlatformTransactionManager tm){
        this.abogados=abogados;this.verificaciones=verificaciones;
        this.client=client;this.config=config;this.resultados=resultados;tx=new TransactionTemplate(tm);
    }
    /** Identity data read from the approved document, shown back to its owner for review. */
    public record Datos(String dni,String nombre,String apellido,java.time.LocalDate fechaNacimiento,String genero,String domicilio) {
        @Override public String toString(){return "Datos[datos omitidos]";}
    }
    public record Estado(AbogadoResponse cuenta,String sesionEstado,String url,boolean puedeReintentar,String avisoVersion,String seguimiento,Datos datos) {
        @Override public String toString(){return "Estado[datos omitidos]";}
    }
    private record Trabajo(Long id,String sesion,String referencia,String operacion) {}

    /** The temporary token is issued when the registration request starts (RegistrarAbogadoGestor.iniciar). */
    public Long titular(String token){
        if(token==null || !token.matches("[A-Za-z0-9_-]{43}"))throw denied();
        var a=abogados.findByAccesoRegistroHash(hash(token)).orElseThrow(VerificacionIdentidadGestor::denied);
        if(a.getAccesoRegistroVence()==null || !a.getAccesoRegistroVence().isAfter(Instant.now())
                || "BAJA".equals(a.getEstado().getNombreEstado()))throw denied();
        return a.getIdAbogado();
    }
    private void comprobarAcceso(AbogadoRegistrado a,String token){
        if(!hash(token).equals(a.getAccesoRegistroHash()) || !a.getAccesoRegistroVence().isAfter(Instant.now())
                || "BAJA".equals(a.getEstado().getNombreEstado()))throw denied();
    }
    public Estado estado(String token,boolean consultar){
        Long id=titular(token);
        if(pruebaHabilitada() && !pruebaLocal.permite(id))throw denied();
        if(consultar)reconciliar(id,false);
        return resumen(id);
    }
    public void cerrar(String token){
        Long id=titular(token);
        tx.executeWithoutResult(s->{
            var a=abogados.findByIdForUpdate(id).orElseThrow();comprobarAcceso(a,token);
            a.setAccesoRegistroHash(null);a.setAccesoRegistroVence(null);
        });
    }
    public Estado crear(String token,boolean consentimiento,String version){
        Long id=titular(token);
        boolean prueba=pruebaHabilitada();
        if(prueba && !pruebaLocal.permite(id))throw denied();
        var aviso=prueba?config.avisoPruebaLocal():config.aviso();
        if(!aviso.disponible())throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,aviso.texto());
        if(!consentimiento || !aviso.version().equals(version))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Debés aceptar el aviso de privacidad vigente.");
        Trabajo trabajo=tx.execute(s->{
            var a=abogados.findByIdForUpdate(id).orElseThrow();comprobarAcceso(a,token);
            if(prueba && !pruebaLocal.permite(a.getIdAbogado()))throw denied();
            var v=verificaciones.findById(id).orElseGet(()->new VerificacionIdentidad(id));
            Instant now=Instant.now();
            // Consume exactly one attempt, including failures and ambiguous remote responses.
            if(prueba && (v.intentos>0 || v.referencia!=null || v.sesion!=null || a.getSesionDidit()!=null))
                throw new ResponseStatusException(HttpStatus.CONFLICT,"El intento único de prueba ya fue consumido; no se creará otra sesión.");
            if(v.leaseHasta!=null && v.leaseHasta.isAfter(now))throw busy();
            if(v.sesion!=null && !Set.of("Expired","Abandoned").contains(v.estado)){
                v.avisoVersion=version;v.avisoHash=hash(aviso.texto());v.consentimiento=true;v.consentimientoFecha=now;
                return null;
            }
            if(!"PENDIENTE".equals(a.getEstado().getNombreEstado()) || "RECHAZADA".equals(a.getVerificacionDni()))throw new ResponseStatusException(HttpStatus.CONFLICT,"La solicitud requiere revisión; no se creará otra sesión.");
            if(v.referencia==null || v.sesion!=null){
                if(v.intentos>=3)throw new ResponseStatusException(HttpStatus.CONFLICT,"Se alcanzó el límite de intentos. Solicitá revisión.");
                v.referencia=UUID.randomUUID().toString();v.intentos++;v.consultas=0;v.errores=0;
                v.inicio=now;v.sesion=null;v.url=null;a.setSesionDidit(null);
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
            if(prueba && !pruebaLocal.permite(id))throw denied();
            var sesion=client.crear(trabajo.referencia());
            tx.executeWithoutResult(s->{
                var a=abogados.findByIdForUpdate(id).orElseThrow();var v=verificaciones.findById(id).orElseThrow();
                if(!trabajo.operacion().equals(v.operacion))return;
                if("BAJA".equals(a.getEstado().getNombreEstado())){v.estado="BAJA";v.proximaConsulta=null;v.leaseHasta=null;return;}
                v.sesion=sesion.session_id();v.url=sesion.url();v.workflowVersion=sesion.workflow_version();
                v.estado="Not Started";v.leaseHasta=null;v.errorCodigo=null;v.proximaConsulta=Instant.now().plusSeconds(60);
                a.setSesionDidit(v.sesion);a.setVerificacionDni("PENDIENTE");a.setDniVerificado(false);
            });
        } catch(ResponseStatusException e){fallo(trabajo,true);throw e;}
        return resumen(id);
    }
    private Estado resumen(Long id){
        return tx.execute(s->{
            var a=abogados.findById(id).orElseThrow();var v=verificaciones.findById(id).orElse(null);
            boolean reintento=v==null || ("ERROR_CREACION".equals(v.estado) && v.errores<5)
                    || (v.intentos<3 && Set.of("Expired","Abandoned").contains(v.estado));
            if(pruebaHabilitada())reintento=pruebaLocal.permite(id) && (v==null || v.intentos==0);
            Datos datos="APROBADA".equals(a.getVerificacionDni())
                    ?new Datos(a.getDni(),a.getNombre(),a.getApellido(),a.getFechaNacimiento(),a.getGenero(),a.getDomicilio()):null;
            return new Estado(AbogadoResponse.de(a),v==null?"SIN_SESION":v.estado,
                    v!=null && !Set.of("Expired","Abandoned","Declined","Kyc Expired","BAJA").contains(v.estado)?v.url:null,
                    reintento,v==null?null:v.avisoVersion,v==null?null:v.errorCodigo,datos);
        });
    }
    public void reconciliar(Long id,boolean periodica){
        if(pruebaHabilitada() && (periodica || !pruebaLocal.permite(id)))return;
        Trabajo trabajo=tx.execute(s->{
            var a=abogados.findByIdForUpdate(id).orElse(null);if(a==null)return null;
            var v=verificaciones.findById(id).orElse(null);Instant now=Instant.now();
            if(v==null || v.sesion==null)return null;
            if("BAJA".equals(a.getEstado().getNombreEstado())){v.proximaConsulta=null;return null;}
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
                var a=abogados.findByIdForUpdate(id).orElseThrow();var v=verificaciones.findById(id).orElseThrow();
                if(!trabajo.operacion().equals(v.operacion) || !trabajo.sesion().equals(a.getSesionDidit()))return;
                resultados.aplicar(a,resultado);
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
            abogados.findByIdForUpdate(t.id()).orElseThrow();var v=verificaciones.findById(t.id()).orElseThrow();
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

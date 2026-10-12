package com.abogacia.microservicio_ciudadanos;

import com.abogacia.microservicio_ciudadanos.didit.*;
import com.abogacia.microservicio_ciudadanos.entity.*;
import com.abogacia.microservicio_ciudadanos.repository.*;
import com.abogacia.microservicio_ciudadanos.gestor.*;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Import(DiditCiudadanosTest.ClienteLocal.class)
class DiditCiudadanosTest {
    // Ephemeral synthetic credentials. No real keys, credentials or provider sessions are used.
    static final String key=UUID.randomUUID().toString(), workflow=UUID.randomUUID().toString();
    static final HttpServer upstream;
    static final Map<String,String> sesiones=new ConcurrentHashMap<>();
    static final AtomicInteger creates=new AtomicInteger(), httpStatus=new AtomicInteger(200);
    static volatile String doc="Approved", life="Approved", face="Approved", global="Approved", dni="12.345.678", personal="";
    static {
        try {
            upstream=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
            upstream.createContext("/v3/session/",exchange->{
                if(!key.equals(exchange.getRequestHeaders().getFirst("x-api-key"))){exchange.sendResponseHeaders(401,-1);exchange.close();return;}
                String response;
                if(exchange.getRequestMethod().equals("POST")){
                    creates.incrementAndGet();
                    String body=new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8);
                    var matcher=java.util.regex.Pattern.compile("\\\"vendor_data\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"").matcher(body);
                    if(!matcher.find())throw new IllegalStateException();
                    String reference=matcher.group(1);
                    String sid=sesiones.entrySet().stream().filter(e->e.getValue().equals(reference)).map(Map.Entry::getKey).findFirst().orElseGet(()->{
                        String id=UUID.randomUUID().toString();sesiones.put(id,reference);return id;
                    });
                    response="{\"session_id\":\""+sid+"\",\"url\":\"https://verify.didit.me/test/opaque\",\"workflow_id\":\""+workflow+"\",\"vendor_data\":\""+reference+"\",\"workflow_version\":1}";
                } else {
                    String sid=exchange.getRequestURI().getPath().split("/")[3];
                    response="{\"session_id\":\""+sid+"\",\"workflow_id\":\""+workflow+"\",\"vendor_data\":\""+sesiones.get(sid)+"\",\"status\":\""+global+"\","
                        +"\"id_verifications\":[{\"status\":\""+doc+"\",\"document_type\":\"Identity Card\",\"issuing_state\":\"ARG\",\"verification_method\":\"document\",\"document_number\":\""+dni+"\",\"personal_number\":\""+personal+"\",\"front_image\":\"must-not-be-persisted\"}]"
                        +",\"liveness_checks\":[{\"status\":\""+life+"\"}],\"face_matches\":[{\"status\":\""+face+"\"}]}";
                }
                int status=httpStatus.get()==200?(exchange.getRequestMethod().equals("POST")?201:200):httpStatus.get();
                byte[] bytes=response.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type","application/json");exchange.sendResponseHeaders(status,bytes.length);
                exchange.getResponseBody().write(bytes);exchange.close();
            });
            upstream.start();
        }catch(Exception e){throw new ExceptionInInitializerError(e);}
    }
    @TestConfiguration static class ClienteLocal {
        @Bean @Primary DiditClient clienteLocal(DiditConfig config){
            return new DiditClient(config,"http://127.0.0.1:"+upstream.getAddress().getPort()) {
                @Override public Sesion crear(String ref){assertFalse(TransactionSynchronizationManager.isActualTransactionActive());return super.crear(ref);}
                @Override public Decision consultar(String id){assertFalse(TransactionSynchronizationManager.isActualTransactionActive());return super.consultar(id);}
            };
        }
    }
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r){
        r.add("DIDIT_API_KEY",()->key);r.add("DIDIT_WORKFLOW_ID",()->workflow);r.add("DIDIT_PRIVACY_READY",()->true);
        for(String name:List.of("DIDIT_NOTICE_VERSION","DIDIT_DATA_CONTROLLER","DIDIT_PRIVACY_CONTACT","DIDIT_RETENTION_NOTICE","DIDIT_DATA_LOCATION_NOTICE","DIDIT_MODEL_USE_NOTICE"))
            r.add(name,()->"Fixture ficticia de prueba; no representa una política real");
    }
    @AfterAll static void stop(){upstream.stop(0);}
    @Autowired VerificacionIdentidadGestor gestor;
    @Autowired VerificacionIdentidadRepository verificaciones;
    @Autowired CiudadanoRepository ciudadanos;
    @Autowired EstadoRepository estados;
    @Autowired PasswordEncoder passwords;
    @Autowired DiditConfig config;
    @Autowired DiditClient client;
    @Autowired VerificarDniCiudadanoGestor resultados;
    @Autowired ValidarCredencialesCiudadanoGestor credenciales;
    @Autowired org.springframework.transaction.PlatformTransactionManager tm;
    @Autowired WebApplicationContext context;
    Long id;String password,token;
    @BeforeEach void setup(){
        verificaciones.deleteAll();ciudadanos.deleteAll();sesiones.clear();creates.set(0);httpStatus.set(200);
        doc=life=face=global="Approved";dni="12.345.678";personal="";
        password=UUID.randomUUID().toString();
        Ciudadano c=new Ciudadano();c.setNombre("Prueba");c.setApellido("Didit");c.setDni("12345678");
        c.setFechaNacimiento(LocalDate.now().minusYears(30));c.setMail("didit@example.com");
        c.setContrasenaHash(passwords.encode(password));c.setCorreoConfirmado(true);c.setVerificacionDni("PENDIENTE");
        c.setEstado(estados.findByNombreEstado("PENDIENTE").orElseThrow());id=ciudadanos.save(c).getIdCiudadano();
        token=gestor.acceso("didit@example.com",password).token();
    }
    void crear(){gestor.crear(token,true,config.aviso().version());}
    void permitirConsulta(){var v=verificaciones.findById(id).orElseThrow();v.ultimaConsulta=Instant.now().minusSeconds(60);v.proximaConsulta=Instant.now().minusSeconds(1);verificaciones.save(v);}
    String cuenta(){return ciudadanos.findById(id).orElseThrow().getEstado().getNombreEstado();}
    String identidad(){return ciudadanos.findById(id).orElseThrow().getVerificacionDni();}

    @Test void pendienteNoIniciaSesionHastaAprobarIdentidad(){
        assertThrows(ResponseStatusException.class,()->credenciales.validar("didit@example.com",password));
        crear();permitirConsulta();new ReconciliarDidit(verificaciones,gestor,true).reconciliar();
        assertEquals("REGISTRADO",cuenta());assertEquals("APROBADA",identidad());
        assertEquals(id,credenciales.validar("didit@example.com",password));
    }
    @Test void dniDelDocumentoDistintoAlRegistradoRechaza(){
        crear();permitirConsulta();dni="23456789";gestor.estado(token,true);
        assertEquals("PENDIENTE",cuenta());assertEquals("RECHAZADA",identidad());
        crear();assertEquals(1,creates.get());assertEquals("RECHAZADA",identidad());
    }
    @Test void personalNumberDeQuinceDigitosNoBloquea(){
        personal="123456789012345";crear();permitirConsulta();gestor.estado(token,true);
        assertEquals("REGISTRADO",cuenta());
    }
    @Test void rechazoBiometricoBloquea(){
        crear();permitirConsulta();face="Declined";gestor.estado(token,true);
        assertEquals("PENDIENTE",cuenta());assertEquals("RECHAZADA",identidad());
    }
    @Test void sesionCreadaYRetomadaSinDuplicados(){
        crear();var v=verificaciones.findById(id).orElseThrow();assertTrue(v.consentimiento);assertNotNull(v.avisoHash);
        crear();assertEquals(1,creates.get());assertEquals("PENDIENTE",cuenta());
    }
    @Test void consentimientoYAvisoSonObligatorios(){
        assertThrows(ResponseStatusException.class,()->gestor.crear(token,false,config.aviso().version()));
        assertThrows(ResponseStatusException.class,()->gestor.crear(token,true,"viejo"));
        var sinAviso=new DiditConfig("","","",false,"","","","","","");assertFalse(sinAviso.aviso().disponible());
        var bloqueado=new VerificacionIdentidadGestor(ciudadanos,verificaciones,passwords,client,sinAviso,resultados,tm);
        assertThrows(ResponseStatusException.class,()->bloqueado.crear(token,true,"x"));assertEquals(0,creates.get());
    }
    @Test void correoSinConfirmarYCredencialesIncorrectasNoAcceden(){
        assertThrows(ResponseStatusException.class,()->gestor.acceso("didit@example.com","incorrecta"));
        var c=ciudadanos.findById(id).orElseThrow();c.setCorreoConfirmado(false);ciudadanos.save(c);
        assertThrows(ResponseStatusException.class,()->gestor.acceso("didit@example.com",password));
        assertThrows(ResponseStatusException.class,()->gestor.estado(token,false));
    }
    @Test void cerrarAccesoRevocaEnServidor(){gestor.cerrar(token);assertThrows(ResponseStatusException.class,()->gestor.estado(token,false));}
    @Test void erroresDeDiditNoApruebanNiExponenClave(){
        crear();permitirConsulta();httpStatus.set(500);
        var e=assertThrows(ResponseStatusException.class,()->gestor.estado(token,true));
        assertFalse(e.getReason().contains(key));assertEquals("PENDIENTE",cuenta());
    }
    @Test void bajaNoSeReactiva(){
        crear();var c=ciudadanos.findById(id).orElseThrow();c.setEstado(estados.findByNombreEstado("BAJA").orElseThrow());ciudadanos.save(c);
        permitirConsulta();gestor.reconciliar(id,true);assertEquals("BAJA",cuenta());
    }
    @Test void dniSeComparaConElRegistrado(){
        assertTrue(DiditVerificadorIdentidad.coincideDni("12345678","12345678"));
        assertTrue(DiditVerificadorIdentidad.coincideDni("1234567","01234567"));
        assertFalse(DiditVerificadorIdentidad.coincideDni("12345678","12345679"));
        for(String dni:Arrays.asList(null,"","123456","12.345.678"))assertFalse(DiditVerificadorIdentidad.coincideDni(dni,"12345678"));
        assertFalse(DiditVerificadorIdentidad.coincideDni("12345678",""));
    }
    @Test void apiPublicaSoloConTokenTemporal()throws Exception{
        var mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        mvc.perform(get("/api/ciudadanos/verificacion/aviso")).andExpect(status().isOk()).andExpect(jsonPath("$.disponible").value(true));
        mvc.perform(get("/api/ciudadanos/verificacion/estado")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/ciudadanos/verificacion/estado").header("X-Registro-Token",token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.cuenta.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.cuenta.dni").doesNotExist());
        mvc.perform(options("/api/ciudadanos/verificacion/estado").header("Origin","http://localhost:5173")
                .header("Access-Control-Request-Method","GET").header("Access-Control-Request-Headers","X-Registro-Token"))
                .andExpect(status().isOk());
    }
}

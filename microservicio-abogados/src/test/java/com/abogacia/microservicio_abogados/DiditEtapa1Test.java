package com.abogacia.microservicio_abogados;

import com.abogacia.microservicio_abogados.didit.*;
import com.abogacia.microservicio_abogados.entity.*;
import com.abogacia.microservicio_abogados.repository.*;
import com.abogacia.microservicio_abogados.gestor.*;
import com.abogacia.microservicio_abogados.dto.IniciarSolicitudRequest;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import java.time.Instant;
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
@Import(DiditEtapa1Test.ClienteLocal.class)
class DiditEtapa1Test {
    // Ephemeral synthetic credentials. No real keys, credentials or provider sessions are used.
    static final String key=UUID.randomUUID().toString(), workflow=UUID.randomUUID().toString();
    static final HttpServer upstream;
    static final Map<String,String> sesiones=new ConcurrentHashMap<>();
    static final AtomicInteger creates=new AtomicInteger(), httpStatus=new AtomicInteger(200);
    static volatile String doc="Approved", life="Approved", face="Approved", global="Approved", dni="12.345.678";
    static volatile boolean incompleta=false, vendorAjeno=false, bloquear=false;
    static volatile CountDownLatch entered=new CountDownLatch(1), release=new CountDownLatch(1);
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
                    if(bloquear){entered.countDown();try{release.await(5,TimeUnit.SECONDS);}catch(InterruptedException e){Thread.currentThread().interrupt();}}
                    response="{\"session_id\":\""+sid+"\",\"url\":\"https://verify.didit.me/test/opaque\",\"workflow_id\":\""+workflow+"\",\"vendor_data\":\""+reference+"\",\"workflow_version\":1}";
                } else {
                    String sid=exchange.getRequestURI().getPath().split("/")[3];
                    response="{\"session_id\":\""+sid+"\",\"workflow_id\":\""+workflow+"\",\"vendor_data\":\""+(vendorAjeno?"ajeno":sesiones.get(sid))+"\",\"status\":\""+global+"\","
                        +"\"id_verifications\":"+(incompleta?"[]":"[{\"status\":\""+doc+"\",\"document_type\":\"Identity Card\",\"issuing_state\":\"ARG\",\"verification_method\":\"document\",\"document_number\":\""+dni+"\",\"front_image\":\"must-not-be-persisted\"}]")
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
    @Autowired AbogadoRepository abogados;
    @Autowired EstadoRepository estados;
    @Autowired PadronEvidenciaRepository padron;
    @Autowired PasswordEncoder passwords;
    @Autowired DiditConfig config;
    @Autowired DiditClient client;
    @Autowired VerificarDniAbogadoGestor resultados;
    @Autowired RegistrarAbogadoGestor registro;
    @Autowired org.springframework.transaction.PlatformTransactionManager tm;
    @Autowired WebApplicationContext context;
    Long id;String password,token;
    @BeforeEach void setup(){
        verificaciones.deleteAll();abogados.deleteAll();padron.deleteAll();sesiones.clear();creates.set(0);httpStatus.set(200);
        doc=life=face=global="Approved";dni="12.345.678";incompleta=vendorAjeno=bloquear=false;
        entered=new CountDownLatch(1);release=new CountDownLatch(1);
        password=UUID.randomUUID().toString();
        // The request issues the temporary token; the account is then completed directly to isolate Didit behaviour.
        token=registro.iniciar(new IniciarSolicitudRequest("12345678","didit@example.com","3511234567")).token();
        AbogadoRegistrado a=abogados.findByMail("didit@example.com").orElseThrow();
        a.setNombre("Prueba");a.setApellido("Didit");a.setContrasenaHash(passwords.encode(password));a.setCorreoConfirmado(true);a.setValidacionMatricula("VALIDADA");
        a.setNroMatricula("10-999");a.setColegioProfesional("Colegio de Abogados de Río Tercero");a.setProvincia("Córdoba");
        id=abogados.save(a).getIdAbogado();
        padron.save(new PadronEvidencia("10-999","12345678","PRUEBA DIDIT","ACTIVO","test",1,"test"));
    }
    void crear(){gestor.crear(token,true,config.aviso().version());}
    VerificacionIdentidadGestor prueba(Long autorizado,Instant vence){
        var env=new org.springframework.mock.env.MockEnvironment();
        env.setActiveProfiles("didit-local-test");
        env.withProperty("DIDIT_DEV_TEST_ENABLED","true")
            .withProperty("DIDIT_DEV_TEST_ABOGADO_ID",autorizado.toString())
            .withProperty("DIDIT_DEV_TEST_EXPIRES_AT",vence.toString())
            .withProperty("server.address","127.0.0.1")
            .withProperty("DIDIT_RECONCILIATION_ENABLED","false");
        var avisoConfig=new DiditConfig(key,workflow,"http://localhost:5173/verificar-identidad",false,
            "1.0","Responsable sintético","contacto sintético","Retención ilimitada ficticia","Ubicación ficticia","Uso ficticio");
        var g=new VerificacionIdentidadGestor(abogados,verificaciones,client,avisoConfig,resultados,tm);
        org.springframework.test.util.ReflectionTestUtils.setField(g,"pruebaLocal",new DiditPruebaLocal(env));
        return g;
    }
    @Test void pruebaLocalBloqueaOtraCuentaYNoHabilitaAvisoGeneral(){
        var g=prueba(id+1,Instant.now().plusSeconds(300));
        assertFalse(g.aviso().disponible());assertTrue(g.aviso().texto().contains("PRUEBA REAL"));
        assertThrows(ResponseStatusException.class,()->g.crear(token,true,g.aviso().version()));
        assertThrows(ResponseStatusException.class,()->g.estado(token,true));
        assertEquals(0,creates.get());assertTrue(verificaciones.findById(id).isEmpty());
    }
    @Test void pruebaLocalExigeConsentimientoAvisoVigenteYAutenticacion(){
        var g=prueba(id,Instant.now().plusSeconds(300));
        assertThrows(ResponseStatusException.class,()->g.crear(token,false,g.aviso().version()));
        assertThrows(ResponseStatusException.class,()->g.crear(token,true,"1.0"));
        assertThrows(ResponseStatusException.class,()->g.crear("invalido",true,g.aviso().version()));
        assertEquals(0,creates.get());assertTrue(verificaciones.findById(id).isEmpty());
    }
    @Test void pruebaLocalSoloCreaUnaVezInclusoTrasReinicioYVencimientoSesion(){
        var g=prueba(id,Instant.now().plusSeconds(300));
        var r=g.crear(token,true,g.aviso().version());assertNotNull(r.url());
        assertEquals(1,creates.get());assertFalse(r.puedeReintentar());
        var v=verificaciones.findById(id).orElseThrow();v.estado="Expired";v.leaseHasta=null;verificaciones.save(v);
        var reiniciado=prueba(id,Instant.now().plusSeconds(300));
        assertThrows(ResponseStatusException.class,()->reiniciado.crear(token,true,reiniciado.aviso().version()));
        assertEquals(1,creates.get());
    }
    @Test void pruebaLocalFalloConsumeIntentoSinSegundoPost(){
        var g=prueba(id,Instant.now().plusSeconds(300));httpStatus.set(503);
        assertThrows(ResponseStatusException.class,()->g.crear(token,true,g.aviso().version()));
        assertEquals(1,verificaciones.findById(id).orElseThrow().intentos);
        httpStatus.set(200);
        assertThrows(ResponseStatusException.class,()->g.crear(token,true,g.aviso().version()));
        assertEquals(1,creates.get());
    }
    @Test void pruebaLocalConcurrenteSoloEnviaUnPost() throws Exception {
        var g=prueba(id,Instant.now().plusSeconds(300));bloquear=true;
        var executor=Executors.newSingleThreadExecutor();
        try {
            var primera=executor.submit(()->g.crear(token,true,g.aviso().version()));
            assertTrue(entered.await(5,TimeUnit.SECONDS));
            assertThrows(ResponseStatusException.class,()->g.crear(token,true,g.aviso().version()));
            release.countDown();assertNotNull(primera.get(10,TimeUnit.SECONDS).url());
            assertEquals(1,creates.get());assertEquals(1,verificaciones.findById(id).orElseThrow().intentos);
        } finally {release.countDown();executor.shutdownNow();}
    }
    @Test void pruebaLocalCaducadaNoCrea(){
        var g=prueba(id,Instant.now().plusMillis(100));
        try{Thread.sleep(150);}catch(InterruptedException e){Thread.currentThread().interrupt();throw new AssertionError(e);}
        assertThrows(ResponseStatusException.class,()->g.crear(token,true,g.aviso().version()));
        assertEquals(0,creates.get());
    }
    void permitirConsulta(){var v=verificaciones.findById(id).orElseThrow();v.ultimaConsulta=Instant.now().minusSeconds(60);v.proximaConsulta=Instant.now().minusSeconds(1);verificaciones.save(v);}
    String cuenta(){return abogados.findById(id).orElseThrow().getEstado().getNombreEstado();}
    @Test void sesionCreadaYRetomadaSinDuplicados(){
        crear();var v=verificaciones.findById(id).orElseThrow();assertTrue(v.consentimiento);assertNotNull(v.consentimientoFecha);assertNotNull(v.avisoHash);
        assertEquals(1,creates.get());gestor.crear(token,true,config.aviso().version());assertEquals(1,creates.get());assertEquals("PENDIENTE",cuenta());
    }
    @Test void consentimientoYVersionSonObligatorios(){
        assertThrows(ResponseStatusException.class,()->gestor.crear(token,false,config.aviso().version()));
        assertThrows(ResponseStatusException.class,()->gestor.crear(token,true,"viejo"));assertEquals(0,creates.get());
        var sinAviso=new DiditConfig("","", "",false,"","","","","","");assertFalse(sinAviso.aviso().disponible());
        var bloqueado=new VerificacionIdentidadGestor(abogados,verificaciones,client,sinAviso,resultados,tm);
        assertThrows(ResponseStatusException.class,()->bloqueado.crear(token,true,"x"));assertEquals(0,creates.get());
    }
    @Test void cerrarAccesoRevocaEnServidor(){gestor.cerrar(token);assertThrows(ResponseStatusException.class,()->gestor.estado(token,false));}
    @Test void consultasConcurrentesUsanLeaseYLimpianResultadosViejos(){
        crear();permitirConsulta();var v=verificaciones.findById(id).orElseThrow();v.leaseHasta=Instant.now().plusSeconds(20);verificaciones.save(v);
        gestor.reconciliar(id,true);assertEquals("PENDIENTE",cuenta());
        v=verificaciones.findById(id).orElseThrow();v.leaseHasta=null;v.consultas=240;verificaciones.save(v);
        gestor.reconciliar(id,true);assertNull(verificaciones.findById(id).orElseThrow().proximaConsulta);assertEquals("PENDIENTE",cuenta());
    }
    @Test void tokenInvalidoOExpiradoNoAutoriza(){
        assertThrows(ResponseStatusException.class,()->gestor.estado("x".repeat(43),false));
        assertThrows(ResponseStatusException.class,()->gestor.estado(null,false));
        var a=abogados.findById(id).orElseThrow();a.setAccesoRegistroVence(Instant.now().minusSeconds(1));abogados.save(a);
        assertThrows(ResponseStatusException.class,()->gestor.estado(token,false));
    }
    @Test void cuentaCreadaNoSeReemplazaConOtraSolicitud(){
        assertThrows(ResponseStatusException.class,()->registro.iniciar(new IniciarSolicitudRequest("12345678","otro@example.com","1")));
        assertThrows(ResponseStatusException.class,()->registro.iniciar(new IniciarSolicitudRequest("23456789","didit@example.com","1")));
    }
    @Test void aprobacionCompletaYPollPeriodicoHabilitan(){
        crear();permitirConsulta();new ReconciliarDidit(verificaciones,gestor,true).reconciliar();
        assertEquals("REGISTRADO",cuenta());assertEquals("APROBADA",abogados.findById(id).orElseThrow().getVerificacionDni());
    }
    @ParameterizedTest @ValueSource(strings={"documento","vida","cara","global"}) void rechazoDeCadaComponenteBloquea(String parte){
        crear();permitirConsulta();switch(parte){case "documento"->doc="Declined";case "vida"->life="Declined";case "cara"->face="Declined";default->global="Declined";}
        gestor.estado(token,true);assertEquals("PENDIENTE",cuenta());assertEquals("RECHAZADA",abogados.findById(id).orElseThrow().getVerificacionDni());
    }
    @Test void dniDiferenteNoHabilita(){crear();permitirConsulta();dni="23456789";gestor.estado(token,true);assertEquals("PENDIENTE",cuenta());}
    @Test void informacionIncompletaOSesionAjenaNoHabilitan(){
        crear();permitirConsulta();incompleta=true;gestor.estado(token,true);assertEquals("PENDIENTE",cuenta());
        permitirConsulta();vendorAjeno=true;assertThrows(ResponseStatusException.class,()->gestor.estado(token,true));assertEquals("PENDIENTE",cuenta());
    }
    @ParameterizedTest @ValueSource(ints={401,403,429,500}) void erroresHttpNoApruebanNiExponenClave(int status){
        crear();permitirConsulta();httpStatus.set(status);
        var e=assertThrows(ResponseStatusException.class,()->gestor.estado(token,true));assertFalse(e.getReason().contains(key));assertNull(e.getCause());assertEquals("PENDIENTE",cuenta());
    }
    @Test void recuperacionDeCreacionInciertaUsaMismaReferencia(){
        httpStatus.set(503);assertThrows(ResponseStatusException.class,()->crear());var ref=verificaciones.findById(id).orElseThrow().referencia;
        httpStatus.set(200);permitirConsulta();crear();assertEquals(ref,verificaciones.findById(id).orElseThrow().referencia);assertEquals(1,sesiones.size());
    }
    @Test void expiracionPermiteNuevoIntentoLimitado(){
        crear();permitirConsulta();global="Expired";gestor.estado(token,true);permitirConsulta();crear();
        assertEquals(2,verificaciones.findById(id).orElseThrow().intentos);
    }
    @Test void matriculaRevocadaYBajaNoSeReactivan(){
        crear();permitirConsulta();padron.deleteAll();gestor.estado(token,true);assertEquals("PENDIENTE",cuenta());
        var a=abogados.findById(id).orElseThrow();a.setEstado(estados.findByNombreEstado("BAJA").orElseThrow());abogados.save(a);
        gestor.reconciliar(id,true);assertEquals("BAJA",cuenta());assertThrows(ResponseStatusException.class,()->gestor.estado(token,false));
    }
    @Test void concurrenciaNoCreaDosSesiones()throws Exception{
        bloquear=true;
        try(var executor=Executors.newSingleThreadExecutor()){
            var first=executor.submit(()->gestor.crear(token,true,config.aviso().version()));
            assertTrue(entered.await(5,TimeUnit.SECONDS));
            assertThrows(ResponseStatusException.class,()->crear());release.countDown();first.get(10,TimeUnit.SECONDS);
            assertEquals(1,creates.get());assertEquals(1,verificaciones.count());
        }finally{release.countDown();}
    }
    @Test void apiNoAceptaIdsArbitrariosYNuncaDaLoginProfesionalPendiente()throws Exception{
        var mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        mvc.perform(get("/api/abogados/verificacion/estado")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/abogados/verificacion/sesion").header("X-Registro-Token",token).contentType("application/json")
                .content("{\"consentimiento\":true,\"avisoVersion\":\"x\",\"idAbogado\":999}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/interno/abogados/validar-credenciales").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic("test-service","test-only-password"))
                .contentType("application/json").content("{\"mail\":\"didit@example.com\",\"contrasena\":\""+password+"\"}")).andExpect(status().isUnauthorized());
    }
    @Test void normalizacionNoEliminaLetrasNiConfundeDni(){
        assertEquals("12345678",DiditVerificadorIdentidad.normalizarDni("12.345.678"));
        for(String value:List.of("12x345678","+12345678","12345678-9","12 345 678"))assertEquals("",DiditVerificadorIdentidad.normalizarDni(value));
        assertThrows(RuntimeException.class,()->DiditClient.verificarUrl("https://verify.didit.me.evil.test/session"));
    }
    @Test void personalNumberSoloBloqueaSiEsUnDniDistinto(){
        var aprobado=List.of(new DiditClient.Reporte("Approved",null,null,null,null,null,null));
        java.util.function.Function<String,VerificadorIdentidad.Estado> evaluar=personal->DiditVerificadorIdentidad.evaluar(
                new DiditClient.Decision(UUID.randomUUID().toString(),workflow,"ref","Approved",
                        List.of(new DiditClient.Reporte("Approved",null,"Identity Card","ARG","12345678",personal,"document")),aprobado,aprobado)).estado();
        for(String personal:Arrays.asList(null,"","123456789012345","12.345.678","12345678"))
            assertEquals(VerificadorIdentidad.Estado.APROBADA,evaluar.apply(personal));
        assertEquals(VerificadorIdentidad.Estado.PENDIENTE,evaluar.apply("23456789"));
    }
}

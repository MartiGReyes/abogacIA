package com.abogacia.microservicio_abogados;

import com.abogacia.microservicio_abogados.didit.*;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;

/** Exercises the real HTTP client only against a loopback server with synthetic data. */
class DiditClientHttpTest {
    private HttpServer server;
    private DiditClient client;
    private final String key=UUID.randomUUID().toString();
    private final String workflow=UUID.randomUUID().toString();
    private final String session=UUID.randomUUID().toString();
    private final String reference=UUID.randomUUID().toString();
    private final AtomicReference<Request> captured=new AtomicReference<>();
    private int status=201;
    private String response;
    private record Request(String method,String path,String key,String contentType,String accept,String body) {}

    @BeforeEach void start() throws Exception {
        response="{\"session_id\":\""+session+"\",\"workflow_id\":\""+workflow
                +"\",\"vendor_data\":\""+reference+"\",\"url\":\"https://verify.didit.me/session/synthetic\"}";
        server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/",exchange->{
            captured.set(new Request(exchange.getRequestMethod(),exchange.getRequestURI().toString(),
                    exchange.getRequestHeaders().getFirst("x-api-key"),
                    exchange.getRequestHeaders().getFirst("Content-Type"),
                    exchange.getRequestHeaders().getFirst("Accept"),
                    new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8)));
            byte[] bytes=response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type","application/json");
            exchange.sendResponseHeaders(status,bytes.length);
            exchange.getResponseBody().write(bytes);exchange.close();
        });
        server.start();
        var config=new DiditConfig(key,workflow,"http://localhost:5173/verificar-identidad",false,
                "1.0","equipo sintético","contacto sintético","retención sintética","ubicación sintética","uso sintético");
        client=new DiditClient(config,"http://127.0.0.1:"+server.getAddress().getPort());
    }
    @AfterEach void stop(){server.stop(0);}

    @Test void createUsesOfficialContractAndReadsLinkWithoutOptionalWorkflowVersion(){
        var result=client.crear(reference);
        var request=captured.get();
        assertEquals("POST",request.method());assertEquals("/v3/session/",request.path());
        assertEquals(key,request.key());assertEquals("application/json",request.contentType());
        assertEquals("application/json",request.accept());
        var body=JsonMapper.builder().build().readTree(request.body());
        assertEquals(5,body.size());
        assertEquals(workflow,body.get("workflow_id").asText());
        assertEquals(reference,body.get("vendor_data").asText());
        assertEquals("es",body.get("language").asText());
        assertEquals("http://localhost:5173/verificar-identidad",body.get("callback").asText());
        assertEquals("ARG",body.get("expected_details").get("id_country").asText());
        assertEquals("ID",body.get("expected_details").get("expected_document_types").get(0).asText());
        assertEquals(session,result.session_id());assertNull(result.workflow_version());
        assertEquals("https://verify.didit.me/session/synthetic",result.url());
    }

    @Test void retrieveUsesOfficialContractAndReadsStatusAndFeatureResults(){
        status=200;
        response="{\"session_id\":\""+session+"\",\"workflow_id\":\""+workflow
                +"\",\"vendor_data\":\""+reference+"\",\"status\":\"In Review\","
                +"\"session_url\":\"https://verify.didit.me/session/synthetic\","
                +"\"id_verifications\":[{\"status\":\"Approved\",\"verification_method\":\"document\"}],"
                +"\"liveness_checks\":[{\"status\":\"Approved\"}],\"face_matches\":[{\"status\":\"In Review\"}]}";
        var result=client.consultar(session);
        var request=captured.get();
        assertEquals("GET",request.method());assertEquals("/v3/session/"+session+"/decision/",request.path());
        assertEquals(key,request.key());assertEquals("",request.body());
        assertEquals("In Review",result.status());assertEquals(reference,result.vendor_data());
        assertEquals("document",result.id_verifications().getFirst().verification_method());
        assertEquals("Approved",result.liveness_checks().getFirst().status());
        assertEquals("In Review",result.face_matches().getFirst().status());
    }

    @ParameterizedTest @ValueSource(ints={401,403,429,500})
    void upstreamErrorsDoNotExposeHeadersBodyOrCause(int error){
        status=error;response="{\"detail\":\""+key+" synthetic-personal-data\"}";
        var exception=assertThrows(ResponseStatusException.class,()->client.crear(reference));
        assertEquals(503,exception.getStatusCode().value());assertNull(exception.getCause());
        assertFalse(exception.toString().contains(key));
        assertFalse(exception.toString().contains("synthetic-personal-data"));
    }
}

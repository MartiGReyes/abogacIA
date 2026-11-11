package com.abogacia.microservicio_abogados.operativa;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import jakarta.servlet.http.Cookie;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class LexiOperativaTest {
    @Test void reenviaSoloConsultaAlContratoExistenteSinDatosDelRegistro() throws Exception {
        var recibido=new AtomicReference<String>();
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/orientacion",x->{recibido.set(new String(x.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));byte[] bytes="{\"orientacion\":\"Respuesta sintética del servidor de prueba\"}".getBytes(StandardCharsets.UTF_8);x.getResponseHeaders().add("Content-Type","application/json");x.sendResponseHeaders(200,bytes.length);x.getResponseBody().write(bytes);x.close();});
        server.start();
        try {
            var service=mock(OperativaService.class);
            var sesion=new OperativaService.Sesion(UUID.randomUUID(),"PARTICIPANTE",Instant.now().plusSeconds(300),"hash");
            when(service.sesion("synthetic","PARTICIPANTE")).thenReturn(sesion);
            var controller=new OperativaController(service,"http://127.0.0.1:"+server.getAddress().getPort()+"/orientacion");
            var request=new MockHttpServletRequest();request.addHeader("Origin","http://localhost:5182");request.setCookies(new Cookie("po_session","synthetic"));
            assertEquals(200,controller.orientar(new OperativaController.Consulta("Consulta técnica sintética"),request).getStatusCode().value());
            assertEquals("{\"chatInput\":\"Consulta técnica sintética\"}",recibido.get());
            verify(service).validarConsulta(sesion,"Consulta técnica sintética");
            request.removeHeader("Origin");assertThrows(org.springframework.web.server.ResponseStatusException.class,()->controller.orientar(new OperativaController.Consulta("otra"),request));
        } finally {server.stop(0);}
    }
}

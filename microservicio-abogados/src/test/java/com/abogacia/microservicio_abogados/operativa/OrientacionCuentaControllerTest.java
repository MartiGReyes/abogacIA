package com.abogacia.microservicio_abogados.operativa;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrientacionCuentaControllerTest {
    @Test void accesoPublicoConservaLaRestriccionDeOrigen(){
        var datos=mock(CuentaPruebaService.class);var relay=new OrientacionCuentaController(datos,"http://127.0.0.1:1/no-invocar");
        var request=new MockHttpServletRequest();request.addHeader("Host","localhost:5182");request.addHeader("Origin","https://externo.invalid");
        var ex=assertThrows(org.springframework.web.server.ResponseStatusException.class,()->relay.orientar(new OperativaController.Consulta("Consulta sintética"),request));assertEquals(403,ex.getStatusCode().value());verifyNoInteractions(datos);
    }
    @Test void visitanteSinJwtObtieneOrientacionSinNegociacionH2cYEnviaSoloLaConsulta() throws Exception {
        var headers=new AtomicReference<Map<String,java.util.List<String>>>();var cuerpo=new AtomicReference<String>();
        var servidor=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        servidor.createContext("/webhook",x->{
            headers.set(x.getRequestHeaders());cuerpo.set(new String(x.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));
            // Reproduce an upstream that does not respond to h2c upgrade requests.
            if(x.getRequestHeaders().getFirst("Upgrade")!=null){x.close();return;}
            byte[] b="{\"orientacion\":\"Respuesta sintética\"}".getBytes(StandardCharsets.UTF_8);
            x.getResponseHeaders().add("Content-Type","application/json");x.sendResponseHeaders(200,b.length);x.getResponseBody().write(b);x.close();
        });servidor.start();
        try{
            var datos=mock(CuentaPruebaService.class);var relay=new OrientacionCuentaController(datos,"http://127.0.0.1:"+servidor.getAddress().getPort()+"/webhook");
            var request=new MockHttpServletRequest();request.addHeader("Host","localhost:5182");request.addHeader("Origin","http://localhost:5182");
            var respuesta=relay.orientar(new OperativaController.Consulta("Consulta sintética"),request);
            assertEquals(Map.of("orientacion","Respuesta sintética"),respuesta.getBody());
            assertFalse(headers.get().keySet().stream().anyMatch(k->k.equalsIgnoreCase("Upgrade")||k.equalsIgnoreCase("HTTP2-Settings")||k.equalsIgnoreCase("Authorization")));
            assertEquals("{\"chatInput\":\"Consulta sintética\"}",cuerpo.get());verify(datos).validarConsulta("Consulta sintética");
        }finally{servidor.stop(0);}
    }
}

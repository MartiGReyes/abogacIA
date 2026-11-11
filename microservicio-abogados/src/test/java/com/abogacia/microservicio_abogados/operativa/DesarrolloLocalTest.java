package com.abogacia.microservicio_abogados.operativa;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.env.MockEnvironment;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

class DesarrolloLocalTest {
    private MockEnvironment entorno() {return new OperativaConfigTest().correcto().withProperty("ABOGADOS_LOCAL_RUNTIME","aislado-loopback");}
    @Test void impideProduccionYCombinacionesDePerfilesOBases() {
        assertDoesNotThrow(()->DesarrolloLocalConfig.validar(entorno()));
        for(String p:java.util.List.of("spring.datasource.url","spring.datasource.username","spring.jpa.hibernate.ddl-auto","spring.sql.init.mode","ABOGADOS_LOCAL_RUNTIME","OP_ENCRYPTION_KEY_FILE"))
            assertThrows(IllegalStateException.class,()->DesarrolloLocalConfig.validar(entorno().withProperty(p,"produccion")));
        for(String p:java.util.List.of("prod","production","abogados-dev","default")) {
            var e=entorno();e.setActiveProfiles(p);assertThrows(IllegalStateException.class,()->DesarrolloLocalConfig.validar(e));
            e.setActiveProfiles("contacto-operativo-test",p);assertThrows(IllegalStateException.class,()->DesarrolloLocalConfig.validar(e));
        }
    }
    @Test void escrituraSoloAceptaHostYOrigenLocalesSinAccesoCruzado() {
        var r=new MockHttpServletRequest();r.addHeader("Host","localhost:5182");r.addHeader("Origin","http://localhost:5182");
        assertDoesNotThrow(()->PerfilLocalController.origen(r,true));r.removeHeader("Origin");
        assertThrows(RuntimeException.class,()->PerfilLocalController.origen(r,true));
        r.addHeader("Origin","https://externo.invalid");assertThrows(RuntimeException.class,()->PerfilLocalController.origen(r,true));
        r.removeHeader("Origin");r.addHeader("Origin","http://localhost:5182");r.addHeader("Host","externo.invalid");r.removeHeader("Host");r.addHeader("Host","externo.invalid");
        assertThrows(RuntimeException.class,()->PerfilLocalController.origen(r,false));
    }
    @Test void conservaContratoDeLexiSinEnviarDatosDelPerfilNiRequerirSesion() throws Exception {
        var recibido=new AtomicReference<String>();var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/orientacion",x->{recibido.set(new String(x.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));byte[] b="{\"orientacion\":\"Respuesta sintética\"}".getBytes(StandardCharsets.UTF_8);x.getResponseHeaders().add("Content-Type","application/json");x.sendResponseHeaders(200,b.length);x.getResponseBody().write(b);x.close();});server.start();
        try {
            var s=mock(PerfilLocalService.class);var c=new PerfilLocalController(s,"http://127.0.0.1:"+server.getAddress().getPort()+"/orientacion");
            var r=new MockHttpServletRequest();r.addHeader("Host","localhost:5182");r.addHeader("Origin","http://localhost:5182");
            assertEquals(200,c.orientar(new OperativaController.Consulta("Consulta sintética"),r).getStatusCode().value());
            assertEquals("{\"chatInput\":\"Consulta sintética\"}",recibido.get());verify(s).validarConsulta("Consulta sintética");
        }finally{server.stop(0);}
    }
}

package com.abogacia.microservicio_abogados.operativa;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import static org.mockito.Mockito.mock;

/** Local upstream HTTP only; no real DB, model, accounts or credentials. */
class LexiRelayContratoTest {
 @org.junit.jupiter.api.Test void conservaEstadosPorHttp() throws Exception {
  var body=new AtomicReference<String>();
  var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
  server.createContext("/orientar",ex->{
   String request=new String(ex.getRequestBody().readAllBytes(),StandardCharsets.UTF_8);
   if(!request.equals("{\"chatInput\":\"Me despidieron sin causa\"}"))throw new AssertionError("Contrato de entrada inesperado");
   byte[] bytes=body.get().getBytes(StandardCharsets.UTF_8);
   ex.getResponseHeaders().set("Content-Type","application/json");ex.sendResponseHeaders(200,bytes.length);ex.getResponseBody().write(bytes);ex.close();
  });server.start();
  try {
   String url="http://127.0.0.1:"+server.getAddress().getPort()+"/orientar";
   var req=new MockHttpServletRequest();req.addHeader("Host","127.0.0.1:5182");req.addHeader("Origin","http://127.0.0.1:5182");
   var query=new OperativaController.Consulta("Me despidieron sin causa");
   var cuenta=new OrientacionCuentaController(mock(CuentaPruebaService.class),url);
   var perfil=new PerfilLocalController(mock(PerfilLocalService.class),url);
   var operativa=new OperativaController(mock(OperativaService.class),url);
   @SuppressWarnings("unchecked") Supplier<ResponseEntity<?>>[] relays=new Supplier[]{
    (Supplier<ResponseEntity<?>>)()->cuenta.orientar(query,req),
    (Supplier<ResponseEntity<?>>)()->perfil.orientar(query,req),
    (Supplier<ResponseEntity<?>>)()->operativa.orientar(query,req)};
   int assertions=0;
   for(var relay:relays){
    for(String estado:new String[]{"RESPONDIDA","FUERA_DE_ALCANCE","LENGUAJE_INAPROPIADO"}){
     body.set("{\"orientacion\":\"Orientación sintética\",\"estado\":\""+estado+"\",\"mostrarAbogados\":true}");
     var response=relay.get();var r=(Map<?,?>)response.getBody();
     if(response.getStatusCode().value()!=200||!estado.equals(r.get("estado"))||!Boolean.valueOf(estado.equals("RESPONDIDA")).equals(r.get("mostrarAbogados")))throw new AssertionError("Contrato alterado por relay");
     if(!response.getHeaders().getCacheControl().contains("no-store"))throw new AssertionError("Cache inesperada");
     String expected=switch(estado){case "FUERA_DE_ALCANCE"->"No puedo responder esa consulta";case "LENGUAJE_INAPROPIADO"->"Tu mensaje incumple las normas de uso de Lexi. Reformulá tu consulta con respeto";default->"Orientación sintética";};
     if(!expected.equals(r.get("orientacion")))throw new AssertionError("Texto fijo alterado");assertions++;
    }
    body.set("{\"orientacion\":\"Sin clasificar\"}");
    try{relay.get();throw new AssertionError("Autorización implícita");}catch(ResponseStatusException expected){if(expected.getStatusCode().value()!=503)throw expected;}assertions++;
   }
   System.out.println("Relays Java HTTP: "+assertions+" escenarios aprobados; sin datos ni servicios reales");
  }finally{server.stop(0);}
 }
}

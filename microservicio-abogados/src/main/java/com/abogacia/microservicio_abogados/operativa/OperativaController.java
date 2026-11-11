package com.abogacia.microservicio_abogados.operativa;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.*;
import java.util.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@RestController
@Profile("contacto-operativo-test")
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="abogados.legacy-operativa.enabled",havingValue="true")
@RequestMapping("/api/pruebas-operativas")
public class OperativaController {
    private static final String COOKIE="po_session";
    private final OperativaService service;
    private final String lexi;
    private final RestClient client;
    private final Map<String,Intentos> fallos=new HashMap<>();
    private record Intentos(int cantidad,Instant hasta) {}
    public record Codigo(String codigo) { @Override public String toString(){return "Codigo[omitido]";} }
    public record Consulta(String chatInput) { @Override public String toString(){return "Consulta[omitida]";} }
    public OperativaController(OperativaService service,@Value("${OP_LEXI_URL}") String lexi) {
        this.service=service;this.lexi=lexi;
        var factory=new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build());
        factory.setReadTimeout(Duration.ofSeconds(65));client=RestClient.builder().requestFactory(factory).build();
    }
    private static void origen(HttpServletRequest request) {
        if(!Set.of("http://localhost:5182","http://127.0.0.1:5182").contains(Objects.toString(request.getHeader("Origin"),"")))
            throw OperativaService.error(HttpStatus.FORBIDDEN,"Origen de la prueba no permitido.");
    }
    private static String token(HttpServletRequest r) {
        if(r.getCookies()!=null)for(var cookie:r.getCookies())if(COOKIE.equals(cookie.getName()))return cookie.getValue();
        return null;
    }
    private OperativaService.Sesion sesion(HttpServletRequest r,String rol){return service.sesion(token(r),rol);}
    private static ResponseEntity<?> respuesta(Object body){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);}
    private static ResponseEntity<?> acceso(OperativaService.Acceso a) {
        var cookie=ResponseCookie.from(COOKIE,a.token()).httpOnly(true).sameSite("Strict").path("/api")
            .maxAge(Math.max(0,Duration.between(Instant.now(),a.sesion().vence()).toSeconds())).build();
        var anterior=ResponseCookie.from(COOKIE,"").httpOnly(true).sameSite("Strict").path("/api/pruebas-operativas").maxAge(0).build();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header(HttpHeaders.SET_COOKIE,cookie.toString(),anterior.toString()).body(info(a.sesion()));
    }
    private static Map<String,Object> info(OperativaService.Sesion s) {return Map.of("rol",s.rol(),"campania",s.campania(),"venceEn",s.vence(),"avisoVersion",OperativaService.AVISO);}
    private synchronized void limitar(String ip) {
        fallos.entrySet().removeIf(e->e.getValue().hasta().isBefore(Instant.now()));
        var valor=fallos.get(ip);
        if(valor!=null&&valor.cantidad()>=8)throw OperativaService.error(HttpStatus.TOO_MANY_REQUESTS,"Demasiados intentos. Esperá cinco minutos.");
        if(fallos.size()>1000)throw OperativaService.error(HttpStatus.TOO_MANY_REQUESTS,"Intentá nuevamente más tarde.");
    }
    private synchronized void fallo(String ip) {var previo=fallos.get(ip);fallos.put(ip,new Intentos(previo==null?1:previo.cantidad()+1,Instant.now().plusSeconds(300)));}
    @PostMapping("/acceso/{tipo}")
    public ResponseEntity<?> login(@PathVariable String tipo,@RequestBody Codigo body,HttpServletRequest r) {
        origen(r);limitar(r.getRemoteAddr());
        try {
            var a=switch(tipo){case "organizador"->service.loginOperador(body.codigo());case "participante"->service.loginParticipante(body.codigo());default->throw OperativaService.error(HttpStatus.NOT_FOUND,"Acceso no disponible.");};
            synchronized(this){fallos.remove(r.getRemoteAddr());}return acceso(a);
        } catch(ResponseStatusException ex){if(ex.getStatusCode().value()==401)fallo(r.getRemoteAddr());throw ex;}
    }
    @GetMapping("/sesion") public ResponseEntity<?> actual(HttpServletRequest r){return acceso(new OperativaService.Acceso(token(r),sesion(r,null)));}
    @PostMapping("/salir") public ResponseEntity<?> salir(HttpServletRequest r){origen(r);service.salir(sesion(r,null));return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header(HttpHeaders.SET_COOKIE,ResponseCookie.from(COOKIE,"").httpOnly(true).sameSite("Strict").path("/api").maxAge(0).build().toString()).body(Map.of("cerrada",true));}
    @PostMapping("/campanias/nueva") public ResponseEntity<?> nueva(HttpServletRequest r){origen(r);return acceso(service.nuevaCampania(sesion(r,"OPERADOR")));}
    @PostMapping("/invitaciones") public ResponseEntity<?> invitar(HttpServletRequest r){origen(r);return respuesta(service.invitacion(sesion(r,"OPERADOR")));}
    @PostMapping("/perfiles") public ResponseEntity<?> crear(@RequestBody OperativaService.Alta alta,HttpServletRequest r){origen(r);return respuesta(service.alta(sesion(r,"OPERADOR"),alta));}
    @GetMapping("/perfiles/me") public ResponseEntity<?> propio(HttpServletRequest r){return respuesta(service.perfilOperador(sesion(r,"OPERADOR")));}
    @PostMapping("/perfiles/{id}/activar") public ResponseEntity<?> activar(@PathVariable UUID id,HttpServletRequest r){origen(r);service.activar(sesion(r,"OPERADOR"),id,true);return respuesta(Map.of("activo",true));}
    @PostMapping("/perfiles/{id}/desactivar") public ResponseEntity<?> desactivar(@PathVariable UUID id,HttpServletRequest r){origen(r);service.activar(sesion(r,"OPERADOR"),id,false);return respuesta(Map.of("activo",false));}
    @GetMapping("/recomendaciones") public ResponseEntity<?> recomendar(@RequestParam(defaultValue="") String especialidad,HttpServletRequest r){return respuesta(service.recomendaciones(sesion(r,"PARTICIPANTE"),OperativaService.texto(especialidad,100,false)));}
    @PostMapping("/orientacion") public ResponseEntity<?> orientar(@RequestBody Consulta body,HttpServletRequest r) {
        origen(r);var s=sesion(r,"PARTICIPANTE");String consulta=OperativaService.texto(body.chatInput(),2000,true);service.validarConsulta(s,consulta);
        try {
            var result=client.post().uri(URI.create(lexi)).contentType(MediaType.APPLICATION_JSON).body(Map.of("chatInput",consulta)).retrieve().body(Map.class);
            if(result==null || !(result.get("orientacion") instanceof String texto) || texto.isBlank() || texto.length()>20000)
                throw new IllegalStateException();
            return respuesta(Map.of("orientacion",texto));
        } catch(Exception ex){throw OperativaService.error(HttpStatus.SERVICE_UNAVAILABLE,"Lexi no está disponible. No se modificó su workflow; podés reintentar.");}
    }
}

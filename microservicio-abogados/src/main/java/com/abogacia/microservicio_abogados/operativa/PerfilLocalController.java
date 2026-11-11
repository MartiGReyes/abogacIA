package com.abogacia.microservicio_abogados.operativa;

import java.util.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

@RestController
@ConditionalOnProperty(name="abogados.desarrollo-local.enabled",havingValue="true")
public class PerfilLocalController {
    private final PerfilLocalService service;private final RestClient client;private final String lexi;
    public PerfilLocalController(PerfilLocalService s,@Value("${OP_LEXI_URL}") String lexi) {
        service=s;this.lexi=lexi;
        var factory=new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build());
        factory.setReadTimeout(Duration.ofSeconds(65));client=RestClient.builder().requestFactory(factory).build();
    }
    public static void origen(HttpServletRequest r,boolean escritura) {
        if(!Set.of("localhost:5182","127.0.0.1:5182").contains(Objects.toString(r.getHeader("Host"),""))
            ||(escritura&&!Set.of("http://localhost:5182","http://127.0.0.1:5182").contains(Objects.toString(r.getHeader("Origin"),"")))
            ||"cross-site".equals(r.getHeader("Sec-Fetch-Site")))throw OperativaService.error(HttpStatus.FORBIDDEN,"Acceso exclusivo del entorno local.");
    }
    private static ResponseEntity<?> ok(Object v){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(v);}
    @GetMapping("/api/abogados/desarrollo/perfil") public ResponseEntity<?> propio(HttpServletRequest r){origen(r,false);return ok(service.propio());}
    @PostMapping("/api/abogados/desarrollo/perfil") public ResponseEntity<?> alta(@RequestBody PerfilLocalService.Alta a,HttpServletRequest r){origen(r,true);return ok(service.registrar(a));}
    public record Permiso(UUID id,Boolean permitido) {}
    @PostMapping("/api/abogados/desarrollo/whatsapp") public ResponseEntity<?> permiso(@RequestBody Permiso p,HttpServletRequest r){origen(r,true);if(p.id()==null||p.permitido()==null)throw OperativaService.error(HttpStatus.BAD_REQUEST,"Indicá el permiso.");service.permiso(p.id(),p.permitido());return ok(service.propio());}
    @PostMapping("/api/lexi/orientacion") public ResponseEntity<?> orientar(@RequestBody OperativaController.Consulta body,HttpServletRequest r) {
        origen(r,true);String consulta=OperativaService.texto(body.chatInput(),2000,true);service.validarConsulta(consulta);
        try {
            var result=client.post().uri(URI.create(lexi)).contentType(MediaType.APPLICATION_JSON).body(Map.of("chatInput",consulta)).retrieve().body(Map.class);
            if(result==null||!(result.get("orientacion") instanceof String texto)||texto.isBlank()||texto.length()>20000)throw new IllegalStateException();
            return ok(Map.of("orientacion",texto));
        }catch(Exception ex){throw OperativaService.error(HttpStatus.SERVICE_UNAVAILABLE,"Lexi no está disponible. Podés reintentar.");}
    }
}

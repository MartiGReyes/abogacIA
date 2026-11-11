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
@ConditionalOnProperty(name="abogados.cuentas-prueba.enabled",havingValue="true")
public class OrientacionCuentaController {
    private final CuentaPruebaService service;private final RestClient client;private final String lexi;
    public OrientacionCuentaController(CuentaPruebaService s,@Value("${OP_LEXI_URL}") String lexi){
        // n8n accepts HTTP/1.1; h2c upgrade is handled as an unrelated upgrade and can leave POSTs unanswered.
        service=s;this.lexi=lexi;var factory=new JdkClientHttpRequestFactory(HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build());
        factory.setReadTimeout(Duration.ofSeconds(65));client=RestClient.builder().requestFactory(factory).build();
    }
    @PostMapping("/api/lexi/orientacion") public ResponseEntity<?> orientar(@RequestBody OperativaController.Consulta body,HttpServletRequest request){
        PerfilLocalController.origen(request,true);String consulta=OperativaService.texto(body.chatInput(),2000,true);service.validarConsulta(consulta);
        try{
            var result=client.post().uri(URI.create(lexi)).contentType(MediaType.APPLICATION_JSON).body(Map.of("chatInput",consulta)).retrieve().body(Map.class);
            if(result==null||!(result.get("orientacion") instanceof String texto)||texto.isBlank()||texto.length()>20000)throw new IllegalStateException();
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("orientacion",texto));
        }catch(Exception ex){throw OperativaService.error(HttpStatus.SERVICE_UNAVAILABLE,"Lexi no está disponible. Podés reintentar.");}
    }
}

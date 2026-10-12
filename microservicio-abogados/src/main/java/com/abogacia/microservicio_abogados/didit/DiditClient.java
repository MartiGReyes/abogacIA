package com.abogacia.microservicio_abogados.didit;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.*;

@Component
public class DiditClient {
    private final RestClient http;
    private final DiditConfig config;
    @org.springframework.beans.factory.annotation.Autowired
    public DiditClient(DiditConfig config) {
        this(config,"https://verification.didit.me");
    }
    // Only tests supply a local HTTP server; production host is fixed.
    public DiditClient(DiditConfig config,String base) {
        this.config=config;
        var factory=new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NEVER).connectTimeout(Duration.ofSeconds(3)).build());
        factory.setReadTimeout(Duration.ofSeconds(8));
        http=RestClient.builder().baseUrl(base).requestFactory(factory)
                .defaultHeader("Accept",MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader("x-api-key",config.key).build();
    }
    @JsonIgnoreProperties(ignoreUnknown=true)
    public record Sesion(String session_id,String url,String workflow_id,String vendor_data,Integer workflow_version) {
        @Override public String toString(){return "Sesion[datos omitidos]";}
    }
    @JsonIgnoreProperties(ignoreUnknown=true)
    public record Reporte(String status,String node_id,String document_type,String issuing_state,
                         String document_number,String personal_number,String verification_method) {
        @Override public String toString(){return "Reporte[datos omitidos]";}
    }
    @JsonIgnoreProperties(ignoreUnknown=true)
    public record Decision(String session_id,String workflow_id,String vendor_data,String status,
                           List<Reporte> id_verifications,List<Reporte> liveness_checks,List<Reporte> face_matches) {
        @Override public String toString(){return "Decision[datos omitidos]";}
    }
    public Sesion crear(String referencia) {
        try {
            var result=http.post().uri("/v3/session/").contentType(MediaType.APPLICATION_JSON).body(Map.of("workflow_id",config.workflow,
                    "vendor_data",referencia,"callback",config.callback,"language","es",
                    "expected_details",Map.of("id_country","ARG","expected_document_types",List.of("ID"))))
                    .retrieve().body(Sesion.class);
            if(result==null || !config.workflow.equals(result.workflow_id()) || !referencia.equals(result.vendor_data())) throw unavailable();
            UUID.fromString(result.session_id());
            verificarUrl(result.url());
            return result;
        } catch (Exception e) { throw unavailable(); }
    }
    public Decision consultar(String sesion) {
        try {
            UUID.fromString(sesion);
            var result=http.get().uri("/v3/session/{id}/decision/",sesion).retrieve().body(Decision.class);
            if(result==null || !sesion.equals(result.session_id()) || !config.workflow.equals(result.workflow_id())) throw unavailable();
            return result;
        } catch (Exception e) { throw unavailable(); }
    }
    public static void verificarUrl(String url) {
        URI uri=URI.create(url);
        if(!"https".equals(uri.getScheme()) || !"verify.didit.me".equals(uri.getHost())
                || uri.getUserInfo()!=null || (uri.getPort()!=-1 && uri.getPort()!=443)) throw unavailable();
    }
    static ResponseStatusException unavailable() {
        // Never attach upstream bodies, exception messages, headers or causes.
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Didit no está disponible o devolvió información incompleta. Intentá nuevamente más tarde.");
    }
}

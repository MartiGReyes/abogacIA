package com.abogacia.microservicio_ciudadanos.didit;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.*;
import java.util.function.Supplier;

@Component
public class DiditClient {
    private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(DiditClient.class);
    // Con conexiones inestables se reintentan las fallas de red y los errores transitorios de Didit.
    // Crear es seguro de repetir: Didit devuelve la misma sesión para el mismo vendor_data.
    private static final int INTENTOS=3;
    private static final long PRESUPUESTO_MS=12_000;
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
                .followRedirects(HttpClient.Redirect.NEVER).connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(12));
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
            var result=conReintentos("crear sesión",()->http.post().uri("/v3/session/").contentType(MediaType.APPLICATION_JSON).body(Map.of("workflow_id",config.workflow,
                    "vendor_data",referencia,"callback",config.callback,"language","es",
                    "expected_details",Map.of("id_country","ARG","expected_document_types",List.of("ID"))))
                    .retrieve().body(Sesion.class));
            if(result==null || !config.workflow.equals(result.workflow_id()) || !referencia.equals(result.vendor_data())) throw unavailable();
            UUID.fromString(result.session_id());
            verificarUrl(result.url());
            return result;
        } catch (Exception e) { throw unavailable(); }
    }
    public Decision consultar(String sesion) {
        try {
            UUID.fromString(sesion);
            var result=conReintentos("consultar decisión",()->http.get().uri("/v3/session/{id}/decision/",sesion).retrieve().body(Decision.class));
            if(result==null || !sesion.equals(result.session_id()) || !config.workflow.equals(result.workflow_id())) throw unavailable();
            return result;
        } catch (Exception e) { throw unavailable(); }
    }
    private static <T> T conReintentos(String operacion,Supplier<T> pedido) {
        long inicio=System.currentTimeMillis();
        for(int intento=1;;intento++){
            String motivo;boolean transitorio;
            try { return pedido.get(); }
            catch (RestClientResponseException e) {
                int status=e.getStatusCode().value();
                motivo="respondió HTTP "+status;transitorio=status==429 || status>=500;
            }
            catch (ResourceAccessException e) { motivo="sin conexión o tiempo de espera agotado";transitorio=true; }
            // Solo se registra la causa: nunca cuerpos, headers ni datos de la sesión.
            log.warn("Didit {}: {} (intento {}/{}).",operacion,motivo,intento,INTENTOS);
            long espera=1000L*intento;
            if(!transitorio || intento>=INTENTOS || System.currentTimeMillis()-inicio+espera>PRESUPUESTO_MS) throw unavailable();
            try { Thread.sleep(espera); } catch (InterruptedException e) { Thread.currentThread().interrupt();throw unavailable(); }
        }
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

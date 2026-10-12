package com.abogacia.microservicio_autenticacion;

import java.time.Instant;
import java.time.Duration;
import java.net.http.HttpClient;
import java.util.Map;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class LoginController {
    public enum TipoCuenta { CIUDADANO, ABOGADO, ADMIN }
    public record LoginRequest(@NotBlank @Email String mail, @NotBlank String contrasena,
                               @NotNull TipoCuenta tipoCuenta) {
        @Override public String toString() { return "LoginRequest[credenciales omitidas]"; }
    }
    public record LoginResponse(String token, String rol, String idUsuario) {}
    public record CiudadanoValidado(Long idCiudadano) {}
    public record AbogadoValidado(Long idAbogado) {}

    private final RestClient ciudadanos;
    private final RestClient abogados;
    private final JwtEncoder encoder;
    private final PasswordEncoder passwords;
    private final String adminMail;
    private final String adminHash;
    private final String dummyHash;
    private final long ttl;

    public LoginController(JwtEncoder encoder, PasswordEncoder passwords,
            @Value("${CIUDADANOS_URL:http://localhost:8080}") String url,
            @Value("${ABOGADOS_URL:http://localhost:8082}") String abogadosUrl,
            @Value("${INTERNAL_USERNAME}") String username,
            @Value("${INTERNAL_PASSWORD}") String password,
            @Value("${ADMIN_MAIL:}") String adminMail,
            @Value("${ADMIN_PASSWORD_HASH:}") String adminHash,
            @Value("${JWT_TTL_SECONDS:1800}") long ttl) {
        if (username.isBlank() || password.isBlank()) throw new IllegalArgumentException("Credenciales internas obligatorias");
        if (ttl < 1 || ttl > 86400) throw new IllegalArgumentException("JWT_TTL_SECONDS debe estar entre 1 y 86400");
        this.encoder = encoder;
        this.passwords = passwords;
        this.adminMail = adminMail;
        this.adminHash = adminHash;
        this.dummyHash = passwords.encode(java.util.UUID.randomUUID().toString());
        this.ttl = ttl;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3)).build());
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.abogados = RestClient.builder().baseUrl(abogadosUrl).requestFactory(factory)
                .defaultHeaders(h -> h.setBasicAuth(username, password)).build();
        this.ciudadanos = RestClient.builder().baseUrl(url).requestFactory(factory)
                .defaultHeaders(h -> h.setBasicAuth(username, password)).build();
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        String id = switch (request.tipoCuenta()) {
            case CIUDADANO -> validarCiudadano(request);
            case ABOGADO -> validarAbogado(request);
            case ADMIN -> validarAdmin(request);
        };
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer("abogacia-auth").subject(id)
                .issuedAt(now).expiresAt(now.plusSeconds(ttl))
                .claim("rol", request.tipoCuenta().name()).build();
        String token = encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new LoginResponse(token, request.tipoCuenta().name(), id);
    }

    private String validarCiudadano(LoginRequest request) {
        return validarCuenta(ciudadanos, "/api/interno/ciudadanos/validar-credenciales", request, CiudadanoValidado.class,
                result -> result.idCiudadano());
    }

    private String validarAbogado(LoginRequest request) {
        return validarCuenta(abogados, "/api/interno/abogados/validar-credenciales", request, AbogadoValidado.class,
                result -> result.idAbogado());
    }

    private <T> String validarCuenta(RestClient client, String endpoint, LoginRequest request, Class<T> tipo,
                                    java.util.function.Function<T, Long> obtenerId) {
        try {
            T result = client.post().uri(endpoint).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("mail", request.mail(), "contrasena", request.contrasena())).retrieve().body(tipo);
            Long id = result == null ? null : obtenerId.apply(result);
            if (id == null || id <= 0) throw unavailable();
            return id.toString();
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 401) throw invalid();
            throw unavailable();
        } catch (RestClientException ex) {
            throw unavailable();
        }
    }

    private String validarAdmin(LoginRequest request) {
        boolean matches = passwords.matches(request.contrasena(), adminHash.isBlank() ? dummyHash : adminHash);
        if (adminMail.isBlank() || adminHash.isBlank() || !adminMail.equalsIgnoreCase(request.mail()) || !matches)
            throw invalid();
        return "admin";
    }

    private ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales incorrectas.");
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "No se pudo contactar al servicio de cuentas. Intentá nuevamente.");
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, String>> error(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", ex.getReason()));
    }
}

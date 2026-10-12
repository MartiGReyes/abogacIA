package com.abogacia.microservicio_autenticacion;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.concurrent.atomic.AtomicInteger;
import javax.crypto.spec.SecretKeySpec;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class LoginTest {
    static final AtomicInteger upstreamStatus = new AtomicInteger(200);
    static final HttpServer upstream;
    static {
        try {
            upstream = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            upstream.createContext("/api/interno/ciudadanos/validar-credenciales", exchange -> {
                String authorization = "Basic " + Base64.getEncoder().encodeToString(
                        "test-service:test-only-password".getBytes(StandardCharsets.UTF_8));
                String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                int status = authorization.equals(exchange.getRequestHeaders().getFirst("Authorization"))
                        && body.contains("ana@example.com") && body.contains("clave-segura")
                        ? upstreamStatus.get() : 401;
                byte[] response = (status == 200 ? "{\"idCiudadano\":42}" : "{}").getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(status, response.length);
                exchange.getResponseBody().write(response);
                exchange.close();
            });
            upstream.createContext("/api/interno/abogados/validar-credenciales", exchange -> {
                String auth = "Basic " + Base64.getEncoder().encodeToString("test-service:test-only-password".getBytes(StandardCharsets.UTF_8));
                String request = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                int status = auth.equals(exchange.getRequestHeaders().getFirst("Authorization")) && request.contains("clave-segura") ? upstreamStatus.get() : 401;
                byte[] response = (status == 200 ? "{\"idAbogado\":73}" : "{}").getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(status, response.length); exchange.getResponseBody().write(response); exchange.close();
            });
            upstream.start();
        } catch (Exception ex) { throw new ExceptionInInitializerError(ex); }
    }
    @DynamicPropertySource static void properties(DynamicPropertyRegistry registry) {
        registry.add("ABOGADOS_URL", () -> "http://127.0.0.1:" + upstream.getAddress().getPort());
        registry.add("CIUDADANOS_URL", () -> "http://127.0.0.1:" + upstream.getAddress().getPort());
        registry.add("ADMIN_MAIL", () -> "admin@example.com");
        registry.add("ADMIN_PASSWORD_HASH", () -> new BCryptPasswordEncoder().encode("admin-test-password"));
    }
    @AfterAll static void stop() { upstream.stop(0); }
    @Autowired WebApplicationContext context;
    MockMvc mvc;
    @BeforeEach void setup() {
        upstreamStatus.set(200);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }
    ResultActions login(String mail, String password, String role) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"mail\":\"" + mail + "\",\"contrasena\":\"" + password + "\",\"tipoCuenta\":\"" + role + "\"}"));
    }
    @Test void ciudadanoRecibeJwtFirmadoConVencimiento() throws Exception {
        String body = login("ana@example.com", "clave-segura", "CIUDADANO")
                .andExpect(status().isOk()).andExpect(jsonPath("$.rol").value("CIUDADANO"))
                .andExpect(jsonPath("$.idUsuario").value("42"))
                .andExpect(jsonPath("$.contrasena").doesNotExist()).andExpect(jsonPath("$.contrasenaHash").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        String token = com.jayway.jsonpath.JsonPath.read(body, "$.token");
        var decoder = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(
                Base64.getDecoder().decode("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="), "HmacSHA256")).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("abogacia-auth"));
        Jwt jwt = decoder.decode(token);
        assertEquals("42", jwt.getSubject());
        assertEquals("CIUDADANO", jwt.getClaimAsString("rol"));
        assertEquals(1800, jwt.getExpiresAt().getEpochSecond() - jwt.getIssuedAt().getEpochSecond());
    }
    @Test void erroresGenericosYServicioNoDisponible() throws Exception {
        login("ana@example.com", "incorrecta", "CIUDADANO").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Credenciales incorrectas."));
        login("nadie@example.com", "clave-segura", "CIUDADANO").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Credenciales incorrectas."));
        upstreamStatus.set(503);
        login("ana@example.com", "clave-segura", "CIUDADANO").andExpect(status().isServiceUnavailable());
        login("ana@example.com", "clave-segura", "ABOGADO").andExpect(status().isServiceUnavailable());
        login("ana@example.com", "clave-segura", "OTRO").andExpect(status().isBadRequest());
        login("invalido", "", "CIUDADANO").andExpect(status().isBadRequest());
    }
    @Test void abogadoRecibeJwtYSeRechazaSiNoHabilitado() throws Exception {
        String body=login("ana@example.com", "clave-segura", "ABOGADO").andExpect(status().isOk())
            .andExpect(jsonPath("$.rol").value("ABOGADO")).andExpect(jsonPath("$.idUsuario").value("73"))
            .andReturn().getResponse().getContentAsString();
        String token=com.jayway.jsonpath.JsonPath.read(body,"$.token");
        var decoder=NimbusJwtDecoder.withSecretKey(new SecretKeySpec(Base64.getDecoder().decode("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="),"HmacSHA256")).build();
        assertEquals("ABOGADO",decoder.decode(token).getClaimAsString("rol"));
        upstreamStatus.set(401);
        login("ana@example.com","clave-segura","ABOGADO").andExpect(status().isUnauthorized());
    }
    @Test void adminSinRegistroPublico() throws Exception {
        login("admin@example.com", "admin-test-password", "ADMIN").andExpect(status().isOk())
                .andExpect(jsonPath("$.rol").value("ADMIN")).andExpect(jsonPath("$.idUsuario").value("admin"));
        login("admin@example.com", "incorrecta", "ADMIN").andExpect(status().isUnauthorized());
        login("nadie@example.com", "admin-test-password", "ADMIN").andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/registro")).andExpect(status().isForbidden());
    }
    @Test void cors() throws Exception {
        mvc.perform(options("/api/auth/login").header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "POST").header("Access-Control-Request-Headers", "Content-Type"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
}

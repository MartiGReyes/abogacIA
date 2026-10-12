package com.abogacia.microservicio_ciudadanos;

import java.time.Instant;
import java.util.Base64;
import javax.crypto.spec.SecretKeySpec;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
class SeguridadTest {
    @Autowired WebApplicationContext context;
    @Autowired CiudadanoRepository repository;
    @Autowired com.abogacia.microservicio_ciudadanos.repository.EstadoRepository estados;
    @Autowired com.abogacia.microservicio_ciudadanos.repository.VerificacionIdentidadRepository verificaciones;
    MockMvc mvc;
    final String credenciales = "{\"mail\":\"ana@example.com\",\"contrasena\":\"clave-segura\"}";
    final String interno = "/api/interno/ciudadanos/validar-credenciales";
    final String registro = """
        {"nombre":"Ana","apellido":"Perez","dni":"12345678",
        "fechaNacimiento":"1990-01-01","mail":"ana@example.com","contrasena":"clave-segura"}
        """;
    @BeforeEach void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        verificaciones.deleteAll();
        repository.deleteAll();
    }

    String token(String id, String rol, Instant expiration, String secret) {
        var key = new SecretKeySpec(Base64.getDecoder().decode(secret), "HmacSHA256");
        var encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),
                JwtClaimsSet.builder().issuer("abogacia-auth").subject(id).claim("rol", rol)
                        .issuedAt(Instant.now().minusSeconds(600)).expiresAt(expiration).build())).getTokenValue();
    }
    String token(String id) {
        return token(id, "CIUDADANO", Instant.now().plusSeconds(600), "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    }

    @Test void flujoCompletoYProteccionDeCuenta() throws Exception {
        mvc.perform(post("/api/ciudadanos").contentType(MediaType.APPLICATION_JSON).content(registro))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.contrasenaHash").doesNotExist());
        mvc.perform(post(interno).contentType(MediaType.APPLICATION_JSON).content(credenciales))
                .andExpect(status().isUnauthorized());
        mvc.perform(post(interno).with(httpBasic("test-service", "incorrecta"))
                .contentType(MediaType.APPLICATION_JSON).content(credenciales)).andExpect(status().isUnauthorized());
        mvc.perform(post(interno).with(httpBasic("test-service", "test-only-password"))
                .contentType(MediaType.APPLICATION_JSON).content(credenciales)).andExpect(status().isUnauthorized());
        var ciudadano = repository.findByMail("ana@example.com").orElseThrow();
        mvc.perform(post("/api/ciudadanos/confirmar").contentType(MediaType.APPLICATION_JSON)
                .content("{\"codigo\":\"" + ciudadano.getCodigoConfirmacion() + "\"}")).andExpect(status().isOk());
        // Correo confirmado pero identidad sin aprobar: la cuenta sigue PENDIENTE y no inicia sesión.
        mvc.perform(post(interno).with(httpBasic("test-service", "test-only-password"))
                .contentType(MediaType.APPLICATION_JSON).content(credenciales)).andExpect(status().isUnauthorized());
        ciudadano = repository.findByMail("ana@example.com").orElseThrow();
        ciudadano.setVerificacionDni("APROBADA");
        ciudadano.setEstado(estados.findByNombreEstado("REGISTRADO").orElseThrow());
        repository.save(ciudadano);
        mvc.perform(post(interno).with(httpBasic("test-service", "test-only-password"))
                .contentType(MediaType.APPLICATION_JSON).content(credenciales))
                .andExpect(status().isOk()).andExpect(jsonPath("$.idCiudadano").value(ciudadano.getIdCiudadano()))
                .andExpect(jsonPath("$.contrasenaHash").doesNotExist());
        for (String body : new String[]{credenciales.replace("clave-segura", "incorrecta"),
                credenciales.replace("ana@example.com", "nadie@example.com")}) {
            mvc.perform(post(interno).with(httpBasic("test-service", "test-only-password"))
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        }
        String own = "Bearer " + token(ciudadano.getIdCiudadano().toString());
        String other = "Bearer " + token("999999");
        String path = "/api/ciudadanos/" + ciudadano.getDni();
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get(path).with(httpBasic("test-service", "test-only-password"))).andExpect(status().isUnauthorized());
        mvc.perform(get(path).header("Authorization", own)).andExpect(status().isOk());
        mvc.perform(get("/api/ciudadanos/me").header("Authorization", own)).andExpect(status().isOk());
        mvc.perform(get(path).header("Authorization", other)).andExpect(status().isForbidden());
        mvc.perform(put(path).header("Authorization", other).contentType(MediaType.APPLICATION_JSON).content(registro))
                .andExpect(status().isForbidden());
        mvc.perform(patch(path + "/baja").header("Authorization", other)).andExpect(status().isForbidden());
        mvc.perform(put(path).header("Authorization", own).contentType(MediaType.APPLICATION_JSON).content(registro))
                .andExpect(status().isOk());
        mvc.perform(patch(path + "/baja").header("Authorization", own)).andExpect(status().isOk());
        mvc.perform(get(path).header("Authorization", own)).andExpect(status().isForbidden());
        mvc.perform(post(interno).with(httpBasic("test-service", "test-only-password"))
                .contentType(MediaType.APPLICATION_JSON).content(credenciales)).andExpect(status().isUnauthorized());
    }

    @Test void rechazaJwtVencidoFirmaAjenaYRolIncorrecto() throws Exception {
        mvc.perform(get("/api/ciudadanos/me").header("Authorization", "Bearer " +
                token("1", "CIUDADANO", Instant.now().minusSeconds(300), "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/ciudadanos/me").header("Authorization", "Bearer " +
                token("1", "CIUDADANO", Instant.now().plusSeconds(600), "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=")))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/ciudadanos/me").header("Authorization", "Bearer " +
                token("1", "ADMIN", Instant.now().plusSeconds(600), "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")))
                .andExpect(status().isForbidden());
        mvc.perform(post(interno).header("Authorization", "Bearer " + token("1"))
                .contentType(MediaType.APPLICATION_JSON).content(credenciales)).andExpect(status().isUnauthorized());
    }

    @Test void corsSoloFrontend() throws Exception {
        mvc.perform(options("/api/ciudadanos/me").header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "GET")
                .header("Access-Control-Request-Headers", "Authorization"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        mvc.perform(options("/api/ciudadanos/me").header("Origin", "https://ajeno.example")
                .header("Access-Control-Request-Method", "GET")).andExpect(status().isForbidden());
    }
}

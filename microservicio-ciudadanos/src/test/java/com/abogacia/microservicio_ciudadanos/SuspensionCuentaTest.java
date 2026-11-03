package com.abogacia.microservicio_ciudadanos;

import com.abogacia.microservicio_ciudadanos.entity.*;
import com.abogacia.microservicio_ciudadanos.repository.*;
import com.abogacia.microservicio_ciudadanos.gestor.*;
import com.abogacia.microservicio_ciudadanos.didit.VerificadorIdentidad;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import javax.crypto.spec.SecretKeySpec;
import java.time.Instant;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
@TestPropertySource(properties = {"spring.datasource.url=jdbc:h2:mem:suspension-ciudadanos;MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "DIDIT_RECONCILIATION_ENABLED=false"})
class SuspensionCuentaTest {
    @Autowired WebApplicationContext context;
    @Autowired CiudadanoRepository cuentas;
    @Autowired EstadoRepository estados;
    @Autowired PasswordEncoder passwords;
    @Autowired VerificarDniCiudadanoGestor identidad;
    @Value("${JWT_SECRET}") String secret;
    String jwt(String subject, String rol) {
        var encoder = new NimbusJwtEncoder(new ImmutableSecret<>(new SecretKeySpec(java.util.Base64.getDecoder().decode(secret), "HmacSHA256")));
        var claims = JwtClaimsSet.builder().issuer("abogacia-auth").subject(subject).issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(1800)).claim("rol",rol).build();
        return "Bearer " + encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue();
    }
    @Test void suspensionBlocksExistingJwtNewLoginAndLateIdentityResults() throws Exception {
        MockMvc mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        var c = new Ciudadano();
        c.setContrasenaHash(passwords.encode("synthetic-password")); c.setNombre("Prueba"); c.setApellido("Usuario");
        c.setCorreoConfirmado(true); c.setVerificacionDni("APROBADA"); c.setSesionDidit("synthetic-session");
        c.setDni("99001001"); c.setMail("suspension@example.com"); c.setEstado(estados.findByNombreEstado("REGISTRADO").orElseThrow());
        c.setFechaNacimiento(java.time.LocalDate.of(1990,1,1));
        cuentas.saveAndFlush(c);
        String userJwt = jwt(""+c.getIdCiudadano(), "CIUDADANO");
        String admin = jwt("admin","ADMIN");
        String route = "/api/admin/ciudadanos/"+c.getIdCiudadano();
        mvc.perform(get("/api/ciudadanos/me").header("Authorization",userJwt)).andExpect(status().isOk());
        mvc.perform(post(route+"/suspender").header("Authorization",admin).contentType("application/json").content("{\"confirmacion\":true}"))
            .andExpect(status().isOk());
        mvc.perform(get("/api/ciudadanos/me").header("Authorization",userJwt)).andExpect(status().isForbidden());
        mvc.perform(post("/api/interno/ciudadanos/validar-credenciales").with(httpBasic("test-service","test-only-password"))
            .contentType("application/json").content("{\"mail\":\"suspension@example.com\",\"contrasena\":\"synthetic-password\"}"))
            .andExpect(status().isUnauthorized());
        identidad.aplicar(c,new VerificadorIdentidad.Resultado("synthetic-session","late-event","99001001",VerificadorIdentidad.Estado.APROBADA));
        assertEquals("SUSPENDIDO",c.getEstado().getNombreEstado());
        mvc.perform(post(route+"/rehabilitar").header("Authorization",admin).contentType("application/json").content("{\"confirmacion\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.estadoCuenta").value("REGISTRADO"));
        mvc.perform(get("/api/ciudadanos/me").header("Authorization",userJwt)).andExpect(status().isOk());
    }
}

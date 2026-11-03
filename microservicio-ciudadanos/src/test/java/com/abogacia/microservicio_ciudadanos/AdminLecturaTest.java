package com.abogacia.microservicio_ciudadanos;

import com.abogacia.microservicio_ciudadanos.config.*;
import com.abogacia.microservicio_ciudadanos.controller.AdminLecturaController;
import com.abogacia.microservicio_ciudadanos.entity.*;
import com.abogacia.microservicio_ciudadanos.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.data.domain.*;
import java.time.Instant;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

/** Real security chains and signed JWTs; mocked repositories. No Boot, JDBC, JPA startup or SQL. */
@SpringJUnitConfig(AdminLecturaTest.Config.class)
@ContextConfiguration(initializers = AdminLecturaTest.NoOverrides.class)
@WebAppConfiguration
@TestPropertySource(properties = {
    "JWT_SECRET=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    "INTERNAL_USERNAME=admin-read-test", "INTERNAL_PASSWORD=only-for-tests"
})
class AdminLecturaTest {
    static class NoOverrides implements ApplicationContextInitializer<ConfigurableApplicationContext> {
        public void initialize(ConfigurableApplicationContext context) {
            ((DefaultListableBeanFactory) context.getBeanFactory()).setAllowBeanDefinitionOverriding(false);
        }
    }

    @Configuration @EnableWebMvc @EnableWebSecurity
    @ComponentScan(basePackageClasses = MicroservicioCiudadanosApplication.class, useDefaultFilters = false,
        includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
            classes = {SecurityConfig.class, AdminReadSecurity.class, AdminLecturaController.class}))
    static class Config {
        @Bean CiudadanoRepository cuentas() { return mock(CiudadanoRepository.class); }
        @Bean VerificacionIdentidadRepository verificaciones() { return mock(VerificacionIdentidadRepository.class); }
        @Bean PasswordEncoder passwords() { return new BCryptPasswordEncoder(); }
    }
    @Autowired WebApplicationContext context;
    @Autowired CiudadanoRepository cuentas;
    @Autowired VerificacionIdentidadRepository verificaciones;
    MockMvc mvc;
    static final String BASE = "/api/admin/ciudadanos";
    @BeforeEach void setup() {
        reset(cuentas, verificaciones);
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }
    String token(String rol, boolean expired, boolean invalid) {
        byte[] key = new byte[32]; if (invalid) Arrays.fill(key, (byte) 1);
        var encoder = new NimbusJwtEncoder(new ImmutableSecret<>(new SecretKeySpec(key, "HmacSHA256")));
        var claims = JwtClaimsSet.builder().issuer("abogacia-auth").subject("admin")
            .issuedAt(Instant.now().minusSeconds(3600)).expiresAt(Instant.now().plusSeconds(expired ? -300 : 1800))
            .claim("scope", "ADMIN");
        if (rol != null) claims.claim("rol", rol);
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims.build())).getTokenValue();
    }
    String admin() { return "Bearer " + token("ADMIN", false, false); }
    @Test void componentScanRegistersConfigurationAndFilterChainWithoutNameCollision() {
        assertInstanceOf(AdminReadSecurity.class, context.getBean("adminReadSecurity"));
        assertInstanceOf(org.springframework.security.web.SecurityFilterChain.class, context.getBean("adminReadFilterChain"));
        assertFalse(((DefaultListableBeanFactory) context.getAutowireCapableBeanFactory()).isAllowBeanDefinitionOverriding());
        assertFalse(context.containsBean("dataSource"));
        assertFalse(context.containsBean("entityManagerFactory"));
    }
    Ciudadano cuenta() {
        var c = new Ciudadano(); c.setIdCiudadano(7L); c.setNombre("Persona"); c.setApellido("Sintética");
        var estado = new Estado(); estado.setNombreEstado("REGISTRADO"); c.setEstado(estado);
        c.setVerificacionDni("APROBADA"); c.setDni("12345678"); c.setMail("private@example.com");
        c.setContrasenaHash("SECRET-HASH"); c.setSesionDidit("SECRET-SESSION");
        c.setAccesoRegistroHash("SECRET-TOKEN"); return c;
    }
    @Test void rejectsAnonymousAndEveryNonAdminClaimBeforeReadingData() throws Exception {
        for (String ruta : List.of("", "/indicadores", "/7/identidad")) {
            mvc.perform(get(BASE + ruta)).andExpect(status().isUnauthorized());
            for (String rol : Arrays.asList("CIUDADANO", "ABOGADO", "admin", null)) {
                mvc.perform(get(BASE + ruta).header("Authorization", "Bearer " + token(rol, false, false)))
                    .andExpect(status().isForbidden());
            }
        }
        verifyNoInteractions(cuentas, verificaciones);
    }
    @Test void rejectsExpiredAndBadlySignedTokens() throws Exception {
        mvc.perform(get(BASE + "/indicadores").header("Authorization", "Bearer " + token("ADMIN", true, false))).andExpect(status().isUnauthorized());
        mvc.perform(get(BASE + "/indicadores").header("Authorization", "Bearer " + token("ADMIN", false, true))).andExpect(status().isUnauthorized());
        verifyNoInteractions(cuentas, verificaciones);
    }
    @Test void deniesWritesEvenForAdmin() throws Exception {
        mvc.perform(post(BASE + "/7/identidad").header("Authorization", admin())).andExpect(status().isForbidden());
        mvc.perform(put(BASE + "/indicadores").header("Authorization", admin())).andExpect(status().isForbidden());
        mvc.perform(delete(BASE + "/7/identidad").header("Authorization", admin())).andExpect(status().isForbidden());
        verifyNoInteractions(cuentas, verificaciones);
    }
    @Test void localIdentityExposesOnlyExplicitFieldsAndAvailableDates() throws Exception {
        when(cuentas.findById(7L)).thenReturn(Optional.of(cuenta()));
        var v = new VerificacionIdentidad(7L); v.estado = "Approved"; v.inicio = Instant.parse("2026-10-01T12:00:00Z");
        v.ultimaConsulta = Instant.parse("2026-10-02T12:00:00Z"); v.url = "https://secret.invalid";
        v.sesion = "SECRET-SESSION"; v.referencia = "SECRET-REFERENCE"; v.errorCodigo = "SECRET-ERROR";
        when(verificaciones.findById(7L)).thenReturn(Optional.of(v));
        String body = mvc.perform(get(BASE + "/7/identidad").header("Authorization", admin()))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.length()").value(7))
            .andExpect(jsonPath("$.id").value(7)).andExpect(jsonPath("$.estadoIdentidad").value("APROBADA"))
            .andExpect(jsonPath("$.estadoSesion").value("Approved")).andExpect(jsonPath("$.inicio").exists())
            .andExpect(jsonPath("$.ultimaConsulta").exists()).andExpect(jsonPath("$.consentimientoFecha").isEmpty())
            .andReturn().getResponse().getContentAsString();
        assertFalse(body.contains("SECRET")); assertFalse(body.contains("private@example.com")); assertFalse(body.contains("12345678"));
        verify(cuentas).findById(7L); verify(verificaciones).findById(7L);
        verifyNoMoreInteractions(cuentas, verificaciones);
    }
    @Test void missingSessionAndUnknownAccountAreDistinct() throws Exception {
        when(cuentas.findById(7L)).thenReturn(Optional.of(cuenta()));
        when(verificaciones.findById(7L)).thenReturn(Optional.empty());
        mvc.perform(get(BASE + "/7/identidad").header("Authorization", admin()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.estadoSesion").value("SIN_SESION")).andExpect(jsonPath("$.inicio").isEmpty());
        mvc.perform(get(BASE + "/99/identidad").header("Authorization", admin())).andExpect(status().isNotFound());
        mvc.perform(get(BASE + "/-1/identidad").header("Authorization", admin())).andExpect(status().isBadRequest());
        mvc.perform(get(BASE + "/abc/identidad").header("Authorization", admin())).andExpect(status().isBadRequest());
        verify(verificaciones, never()).findById(99L);
    }
    @Test void indicatorsIncludeAllStatesAndZeroIsAValidResult() throws Exception {
        var grupo = mock(CiudadanoRepository.ConteoEstado.class);
        when(grupo.getEstado()).thenReturn("REGISTRADO"); when(grupo.getCantidad()).thenReturn(3L);
        when(cuentas.contarPorEstadoAdmin()).thenReturn(List.of(grupo));
        mvc.perform(get(BASE + "/indicadores").header("Authorization", admin()))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.total").value(3)).andExpect(jsonPath("$.porEstado[0].estado").value("REGISTRADO"))
            .andExpect(jsonPath("$.consultadoEn").exists());
        when(cuentas.contarPorEstadoAdmin()).thenReturn(List.of());
        mvc.perform(get(BASE + "/indicadores").header("Authorization", admin()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0)).andExpect(jsonPath("$.porEstado").isEmpty());
        verifyNoInteractions(verificaciones);
    }
    @Test void corsAllowsTheExistingFrontendAndRejectsOtherOrigins() throws Exception {
        mvc.perform(options(BASE + "/indicadores").header("Origin", "http://localhost:5173")
            .header("Access-Control-Request-Method", "GET").header("Access-Control-Request-Headers", "Authorization"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        mvc.perform(options(BASE + "/indicadores").header("Origin", "https://untrusted.invalid")
            .header("Access-Control-Request-Method", "GET")).andExpect(status().isForbidden());
        verifyNoInteractions(cuentas, verificaciones);
    }

    @Test void citizenListingEscapesSearchAndUsesSafeDtoAndStablePagination() throws Exception {
        var filas = java.util.stream.LongStream.rangeClosed(11, 18).mapToObj(id -> {
            var c = cuenta(); c.setIdCiudadano(id); return c;
        }).toList();
        when(cuentas.buscarAdmin(anyString(), any(Pageable.class)))
            .thenReturn(new PageImpl<>(filas, PageRequest.of(1, 10), 18));
        String body = mvc.perform(get(BASE).header("Authorization", admin()).param("q", " Ana%_! ")
                .param("pagina", "1").param("tamano", "10"))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.total").value(18)).andExpect(jsonPath("$.paginas").value(2))
            .andExpect(jsonPath("$.pagina").value(1)).andExpect(jsonPath("$.tamano").value(10))
            .andExpect(jsonPath("$.contenido[0].length()").value(5))
            .andExpect(jsonPath("$.contenido[0].nombre").value("Persona"))
            .andExpect(jsonPath("$.contenido[0].estadoIdentidad").value("APROBADA"))
            .andReturn().getResponse().getContentAsString();
        assertFalse(body.contains("SECRET")); assertFalse(body.contains("private@example.com")); assertFalse(body.contains("12345678"));
        verify(cuentas).buscarAdmin(eq("%ana!%!_!!%"), eq(PageRequest.of(1, 10, Sort.by("apellido", "nombre", "idCiudadano"))));
        verifyNoMoreInteractions(cuentas); verifyNoInteractions(verificaciones);
    }

    @Test void citizenListingHasDefaultsAndHandlesEmptyResults() throws Exception {
        when(cuentas.buscarAdmin(eq(""), any(Pageable.class))).thenReturn(Page.empty());
        mvc.perform(get(BASE).header("Authorization", admin())).andExpect(status().isOk())
            .andExpect(jsonPath("$.contenido").isEmpty()).andExpect(jsonPath("$.total").value(0))
            .andExpect(jsonPath("$.tamano").value(10));
        verify(cuentas).buscarAdmin(eq(""), eq(PageRequest.of(0, 10, Sort.by("apellido", "nombre", "idCiudadano"))));
    }

    @Test void invalidCitizenSearchDoesNotReachRepository() throws Exception {
        for (String[] pair : List.of(new String[]{"pagina", "-1"}, new String[]{"pagina", "100001"},
                new String[]{"tamano", "0"}, new String[]{"tamano", "101"}, new String[]{"tamano", "oops"},
                new String[]{"q", "x".repeat(101)}))
            mvc.perform(get(BASE).header("Authorization", admin()).param(pair[0], pair[1])).andExpect(status().isBadRequest());
        verifyNoInteractions(cuentas, verificaciones);
    }

    @Test void localFixtureStatesRemainIndependentFromAccountState() throws Exception {
        var c = cuenta();
        for (String[] states : new String[][]{{"APROBADA", "Approved"}, {"PENDIENTE", "In Progress"},
                {"RECHAZADA", "Declined"}, {null, "Expired"}}) {
            c.setVerificacionDni(states[0]);
            var local = new VerificacionIdentidad(7L); local.estado = states[1];
            when(cuentas.findById(7L)).thenReturn(Optional.of(c));
            when(verificaciones.findById(7L)).thenReturn(Optional.of(local));
            mvc.perform(get(BASE + "/7/identidad").header("Authorization", admin()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estadoCuenta").value("REGISTRADO"))
                .andExpect(jsonPath("$.estadoIdentidad").value(states[0] == null ? "SIN_RESULTADO" : states[0]))
                .andExpect(jsonPath("$.estadoSesion").value(states[1])).andExpect(jsonPath("$.ultimaConsulta").isEmpty());
        }
    }

}


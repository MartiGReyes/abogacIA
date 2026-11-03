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

@SpringJUnitConfig
@ContextConfiguration(classes = AdminGestionTest.Config.class, inheritLocations = false)
class AdminGestionTest extends AdminLecturaTest {
    @Configuration @EnableWebMvc @EnableWebSecurity
    @Import({SecurityConfig.class, AdminReadSecurity.class, AdminWriteSecurity.class, AdminLecturaController.class, com.abogacia.microservicio_ciudadanos.controller.AdminGestionController.class, com.abogacia.microservicio_ciudadanos.gestor.AdministrarCuentaGestor.class, com.abogacia.microservicio_ciudadanos.exception.GlobalExceptionHandler.class})
    static class Config {
        @Bean CiudadanoRepository cuentas() { return mock(CiudadanoRepository.class); }
        @Bean EstadoRepository estados() { return mock(EstadoRepository.class); }
        @Bean VerificacionIdentidadRepository verificaciones() { return mock(VerificacionIdentidadRepository.class); }
        @Bean PasswordEncoder passwords() { return new BCryptPasswordEncoder(); }
    }
    @Autowired EstadoRepository estados;
    Ciudadano cuenta;
    Estado registrado;
    @BeforeEach void prepararGestion() {
        reset(estados);
        registrado = new Estado(); registrado.setNombreEstado("REGISTRADO");
        var pendiente = new Estado(); pendiente.setNombreEstado("PENDIENTE");
        var suspendido = new Estado(); suspendido.setNombreEstado("SUSPENDIDO");
        when(estados.bloquearAdministracion()).thenReturn(Optional.of(registrado));
        when(estados.findByNombreEstado("SUSPENDIDO")).thenReturn(Optional.of(suspendido));
        when(estados.findByNombreEstado("PENDIENTE")).thenReturn(Optional.of(pendiente));
        cuenta = cuenta();
        cuenta.setCorreoConfirmado(true); cuenta.setVerificacionDni("APROBADA");
        cuenta.setAccesoRegistroHash("old-token");
        when(cuentas.findByIdForUpdate(7L)).thenReturn(Optional.of(cuenta));
    }
    @Override @Test void componentScanRegistersConfigurationAndFilterChainWithoutNameCollision() {
        assertNotNull(context.getBean(AdminReadSecurity.class));
        assertNotNull(context.getBean(AdminWriteSecurity.class));
        assertNotNull(context.getBean("adminReadFilterChain"));
        assertNotNull(context.getBean("adminWriteFilterChain"));
        assertFalse(context.containsBean("dataSource"));
        assertFalse(context.containsBean("entityManagerFactory"));
    }
    @Test void onlyAdminMayChangeState() throws Exception {
        mvc.perform(post(BASE + "/7/suspender").contentType("application/json").content("{\"confirmacion\":true}"))
            .andExpect(status().isUnauthorized());
        for(String rol : new String[]{"CIUDADANO", "ABOGADO", "admin"})
            mvc.perform(post(BASE + "/7/suspender").header("Authorization", "Bearer " + token(rol,false,false))
                .contentType("application/json").content("{\"confirmacion\":true}"))
                .andExpect(status().isForbidden());
        verify(cuentas, never()).saveAndFlush(any());
    }
    @Test void suspensionRevokesTemporaryAccessAndRehabilitationChecksEligibility() throws Exception {
        mvc.perform(post(BASE + "/7/suspender").header("Authorization",admin()).contentType("application/json").content("{\"confirmacion\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.estadoCuenta").value("SUSPENDIDO"));
        assertNull(cuenta.getAccesoRegistroHash()); assertNull(cuenta.getAccesoRegistroVence());
        mvc.perform(post(BASE + "/7/rehabilitar").header("Authorization",admin()).contentType("application/json").content("{\"confirmacion\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.estadoCuenta").value("REGISTRADO"));
    }
    @Test void rehabilitationNeverApprovesAnIncompleteAccount() throws Exception {
        cuenta.setCorreoConfirmado(false); var suspended = new Estado(); suspended.setNombreEstado("SUSPENDIDO"); cuenta.setEstado(suspended);
        mvc.perform(post(BASE + "/7/rehabilitar").header("Authorization",admin()).contentType("application/json").content("{\"confirmacion\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.estadoCuenta").value("PENDIENTE"));
    }
    @Test void bajaAndMissingConfirmationCannotBeOverridden() throws Exception {
        var baja = new Estado(); baja.setNombreEstado("BAJA"); cuenta.setEstado(baja);
        for(String accion : new String[]{"suspender", "rehabilitar"})
            mvc.perform(post(BASE + "/7/"+accion).header("Authorization",admin()).contentType("application/json").content("{\"confirmacion\":true}"))
                .andExpect(status().isConflict());
        mvc.perform(post(BASE + "/7/suspender").header("Authorization",admin()).contentType("application/json").content("{\"confirmacion\":false}"))
            .andExpect(status().isBadRequest());
        mvc.perform(post(BASE + "/7/suspender").header("Authorization",admin()).contentType("application/json").content("{}"))
            .andExpect(status().isBadRequest());
        verify(cuentas, never()).saveAndFlush(any());
    }
    @Test void pendingCanBeSuspendedAndUnknownAccountsReturn404() throws Exception {
        var pendiente = new Estado(); pendiente.setNombreEstado("PENDIENTE"); cuenta.setEstado(pendiente);
        mvc.perform(post(BASE + "/7/suspender").header("Authorization",admin()).contentType("application/json").content("{\"confirmacion\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.estadoCuenta").value("SUSPENDIDO"));
        mvc.perform(post(BASE + "/99/suspender").header("Authorization",admin()).contentType("application/json").content("{\"confirmacion\":true}"))
            .andExpect(status().isNotFound());
    }
}

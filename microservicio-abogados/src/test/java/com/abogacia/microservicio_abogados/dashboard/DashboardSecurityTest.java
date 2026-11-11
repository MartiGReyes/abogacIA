package com.abogacia.microservicio_abogados.dashboard;
import com.abogacia.microservicio_abogados.entity.*;
import com.abogacia.microservicio_abogados.repository.AbogadoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.security.oauth2.jwt.Jwt;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class DashboardSecurityTest {
    @Test void estadoVigenteBloqueaTokenAnterior() {
        var cuentas=mock(AbogadoRepository.class);
        var a=new AbogadoRegistrado();a.setContrasenaHash("synthetic");
        var estado=new Estado();estado.setNombreEstado("REGISTRADO");a.setEstado(estado);
        when(cuentas.findById(1L)).thenReturn(Optional.of(a));
        var controller=new DashboardController(cuentas,mock(DashboardRepository.class));
        var token=Jwt.withTokenValue("synthetic").header("alg","HS256").subject("1").claim("rol","ABOGADO").build();
        assertEquals(1L,controller.titular(token));
        for(String nombre:java.util.List.of("SUSPENDIDO","BAJA","PENDIENTE")) {
            estado.setNombreEstado(nombre);
            assertThrows(org.springframework.web.server.ResponseStatusException.class,()->controller.titular(token));
        }
    }
    MockEnvironment entorno() {
        var e=new MockEnvironment();e.setActiveProfiles("dashboard-test");
        return e.withProperty("spring.datasource.url","jdbc:postgresql://postgres-dashboard:5432/dashboard_abogados_test")
            .withProperty("spring.datasource.username","dashboard_reader").withProperty("spring.jpa.hibernate.ddl-auto","validate")
            .withProperty("spring.sql.init.mode","never").withProperty("DIDIT_RECONCILIATION_ENABLED","false");
    }
    @Test void guardasSoloPermitenEntornoNuevo() {
        DashboardTestGuard.dashboardIsolation(entorno()).postProcessBeanFactory(new DefaultListableBeanFactory());
        for(String propiedad:java.util.List.of("spring.datasource.url","spring.datasource.username","spring.jpa.hibernate.ddl-auto","spring.sql.init.mode","DIDIT_RECONCILIATION_ENABLED")) {
            var e=entorno().withProperty(propiedad,"incorrecto");
            assertThrows(RuntimeException.class,()->DashboardTestGuard.dashboardIsolation(e).postProcessBeanFactory(new DefaultListableBeanFactory()));
        }
    }
}

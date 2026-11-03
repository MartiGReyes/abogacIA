package com.abogacia.microservicio_abogados;

import com.abogacia.microservicio_abogados.config.AdminGestionTestConfig;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import static org.junit.jupiter.api.Assertions.*;

class AdminGestionAisladaTest {
    MockEnvironment entorno() {
        var env = new MockEnvironment(); env.setActiveProfiles("admin-gestion-test");
        return env.withProperty("spring.datasource.url", "jdbc:postgresql://postgres-admin-test:5432/ep06_abogados_test")
            .withProperty("spring.datasource.username", "ep06_abogados_reader")
            .withProperty("spring.jpa.hibernate.ddl-auto", "validate")
            .withProperty("spring.sql.init.mode", "never")
            .withProperty("DIDIT_RECONCILIATION_ENABLED", "false");
    }
    @Test void acceptsOnlyTheDedicatedDatabaseAndDisabledExternalServices() {
        assertDoesNotThrow(() -> AdminGestionTestConfig.validar(entorno()));
        for (String[] cambio : new String[][]{
            {"spring.datasource.url", "jdbc:postgresql://postgres:5432/abogacia_abogados"},
            {"spring.datasource.username", "postgres"}, {"spring.jpa.hibernate.ddl-auto", "update"},
            {"spring.sql.init.mode", "always"}, {"DIDIT_RECONCILIATION_ENABLED", "true"},
            {"DIDIT_API_KEY", "synthetic-key"}, {"DIDIT_PRIVACY_READY", "true"},
            {"abogados.padron.importar", "true"}, {"ABOGADOS_DEV_FIXTURES_ENABLED", "true"}
        }) {
            var env = entorno().withProperty(cambio[0], cambio[1]);
            assertThrows(IllegalStateException.class, () -> AdminGestionTestConfig.validar(env), cambio[0]);
        }
        var combinado = entorno(); combinado.setActiveProfiles("admin-gestion-test", "otro");
        assertThrows(IllegalStateException.class, () -> AdminGestionTestConfig.validar(combinado));
    }
}

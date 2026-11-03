package com.abogacia.microservicio_ciudadanos.config;

import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;

/** Fail before JPA starts if the isolated admin profile points outside its synthetic database. */
@Configuration
@Profile("admin-gestion-test")
public class AdminGestionTestConfig {
    public static void validar(Environment env) {
        boolean valid = java.util.Arrays.equals(env.getActiveProfiles(), new String[]{"admin-gestion-test"})
            && "jdbc:postgresql://postgres-admin-test:5432/ep06_ciudadanos_test".equals(env.getProperty("spring.datasource.url"))
            && "ep06_ciudadanos_reader".equals(env.getProperty("spring.datasource.username"))
            && "validate".equals(env.getProperty("spring.jpa.hibernate.ddl-auto"))
            && "never".equals(env.getProperty("spring.sql.init.mode"))
            && !env.getProperty("DIDIT_RECONCILIATION_ENABLED", Boolean.class, true)
            && !env.getProperty("DIDIT_PRIVACY_READY", Boolean.class, false)
            && env.getProperty("DIDIT_API_KEY", "").isBlank()
            && env.getProperty("DIDIT_WORKFLOW_ID", "").isBlank()
            && !env.getProperty("abogados.padron.importar", Boolean.class, false)
            && !env.getProperty("ABOGADOS_DEV_FIXTURES_ENABLED", Boolean.class, false);
        if (!valid) throw new IllegalStateException("El administrador de pruebas requiere su base EP06 aislada, sin DDL ni servicios externos.");
    }
    @Bean static BeanFactoryPostProcessor protegerAdminGestionTest(Environment env) {
        return factory -> validar(env);
    }
}

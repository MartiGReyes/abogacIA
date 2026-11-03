package com.abogacia.microservicio_abogados.config;

import java.util.Arrays;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;

/** Fail before JPA initializes: a development fixture flag must never reach the real database. */
@Configuration
public class AbogadosDevConfig {
    public static void validar(Environment env) {
        boolean enabled = env.getProperty("ABOGADOS_DEV_FIXTURES_ENABLED", Boolean.class, false);
        boolean profile = Arrays.asList(env.getActiveProfiles()).contains("abogados-dev");
        if (!enabled && !profile) return;
        boolean valid = Arrays.equals(env.getActiveProfiles(), new String[]{"abogados-dev"})
            && "jdbc:postgresql://postgres-abogados-dev:5432/abogacia_abogados_dev".equals(env.getProperty("spring.datasource.url"))
            && "abogados_dev".equals(env.getProperty("spring.datasource.username"))
            && "validate".equals(env.getProperty("spring.jpa.hibernate.ddl-auto"))
            && "never".equals(env.getProperty("spring.sql.init.mode"))
            && !env.getProperty("DIDIT_RECONCILIATION_ENABLED", Boolean.class, true)
            && !env.getProperty("DIDIT_PRIVACY_READY", Boolean.class, false)
            && env.getProperty("DIDIT_API_KEY", "").isBlank()
            && env.getProperty("DIDIT_WORKFLOW_ID", "").isBlank()
            && !env.getProperty("abogados.padron.importar", Boolean.class, false);
        if (!valid) throw new IllegalStateException("Los perfiles ficticios requieren el entorno PostgreSQL aislado de abogados-dev, sin servicios de identidad activos.");
    }
    @Bean
    static BeanFactoryPostProcessor protegerBaseDesarrollo(Environment env) {
        return beanFactory -> validar(env);
    }
}

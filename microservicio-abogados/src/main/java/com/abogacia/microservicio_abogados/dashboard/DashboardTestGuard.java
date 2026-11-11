package com.abogacia.microservicio_abogados.dashboard;

import java.util.Arrays;
import org.springframework.context.annotation.*;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.core.env.Environment;

@Configuration
@Profile("dashboard-test")
public class DashboardTestGuard {
    @Bean
    static BeanFactoryPostProcessor dashboardIsolation(Environment env) {
        return factory -> {
            if (!Arrays.equals(env.getActiveProfiles(), new String[]{"dashboard-test"})
                || !"jdbc:postgresql://postgres-dashboard:5432/dashboard_abogados_test".equals(env.getProperty("spring.datasource.url"))
                || !"dashboard_reader".equals(env.getProperty("spring.datasource.username"))
                || !"validate".equals(env.getProperty("spring.jpa.hibernate.ddl-auto"))
                || !"never".equals(env.getProperty("spring.sql.init.mode"))
                || env.getProperty("abogados.padron.importar",Boolean.class,false)
                || env.getProperty("DIDIT_RECONCILIATION_ENABLED",Boolean.class,true)
                || env.getProperty("ABOGADOS_DEV_FIXTURES_ENABLED",Boolean.class,false))
                throw new IllegalStateException("Dashboard de prueba exige base, usuario y perfil aislados, sin escrituras ni servicios externos.");
        };
    }
}

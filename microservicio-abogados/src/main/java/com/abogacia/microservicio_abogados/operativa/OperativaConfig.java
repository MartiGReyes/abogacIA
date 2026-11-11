package com.abogacia.microservicio_abogados.operativa;

import java.util.*;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@Profile("contacto-operativo-test")
public class OperativaConfig {
    public static void validar(Environment e) {
        if (!Arrays.equals(e.getActiveProfiles(),new String[]{"contacto-operativo-test"})
            || !"jdbc:postgresql://postgres-operativa:5432/contacto_operativo_test".equals(e.getProperty("spring.datasource.url"))
            || !"operativa_runtime".equals(e.getProperty("spring.datasource.username"))
            || !"validate".equals(e.getProperty("spring.jpa.hibernate.ddl-auto"))
            || !"never".equals(e.getProperty("spring.sql.init.mode"))
            || e.getProperty("DIDIT_RECONCILIATION_ENABLED",Boolean.class,true)
            || e.getProperty("DIDIT_PRIVACY_READY",Boolean.class,false)
            || e.getProperty("abogados.padron.importar",Boolean.class,false)
            || e.getProperty("ABOGADOS_DEV_FIXTURES_ENABLED",Boolean.class,false)
            || !e.getProperty("DIDIT_API_KEY", "").isBlank()
            || !e.getProperty("DIDIT_WORKFLOW_ID", "").isBlank()
            || !"/run/secrets/operativa_key".equals(e.getProperty("OP_ENCRYPTION_KEY_FILE"))
            || !"/run/secrets/operativa_operator".equals(e.getProperty("OP_OPERATOR_CODE_FILE"))
            || !"http://host.docker.internal:5678/webhook/orientacion-legal".equals(e.getProperty("OP_LEXI_URL")))
            throw new IllegalStateException("El circuito operativo exige sus servicios, base, usuario y secretos aislados, sin verificaciones profesionales.");
    }
    @Bean static BeanFactoryPostProcessor operativaGuard(Environment e) { return factory -> validar(e); }
    @Bean @Order(-10)
    SecurityFilterChain operativaSecurity(HttpSecurity http) throws Exception {
        // Opaque HttpOnly sessions and strict Origin checks live exclusively in OperativaController.
        // No professional JWT, Basic account, registration or authentication rule is changed.
        return http.securityMatcher("/api/pruebas-operativas/**").csrf(c->c.disable())
            .sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a.anyRequest().denyAll()).build();
    }
}

package com.abogacia.microservicio_abogados.operativa;

import java.util.Arrays;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.core.annotation.Order;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/** Fail closed even if the switch is accidentally set in a production deployment. */
@Configuration
@ConditionalOnProperty(name="abogados.desarrollo-local.enabled",havingValue="true")
public class DesarrolloLocalConfig {
    public static void validar(Environment e) {
        OperativaConfig.validar(e);
        if (!Arrays.equals(e.getActiveProfiles(),new String[]{"contacto-operativo-test"})
            || !"aislado-loopback".equals(e.getProperty("ABOGADOS_LOCAL_RUNTIME")))
            throw new IllegalStateException("El perfil local solo admite el runtime aislado de desarrollo.");
    }
    @Bean static BeanFactoryPostProcessor desarrolloLocalGuard(Environment e) { return f -> validar(e); }
    @Bean @Order(-20) SecurityFilterChain desarrolloLocalSecurity(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/abogados/desarrollo/**", "/api/lexi/orientacion")
            .csrf(c->c.disable()).authorizeHttpRequests(a->a.anyRequest().permitAll()).build();
    }
}

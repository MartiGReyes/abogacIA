package com.abogacia.microservicio_abogados.operativa;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@ConditionalOnProperty(name="abogados.cuentas-prueba.enabled",havingValue="true")
public class CuentasPruebaConfig {
    public static void validar(Environment e) {
        OperativaConfig.validar(e);
        if(!"cuentas-autenticadas-loopback".equals(e.getProperty("ABOGADOS_LOCAL_RUNTIME"))
            ||e.getProperty("abogados.desarrollo-local.enabled",Boolean.class,false)
            ||e.getProperty("abogados.legacy-operativa.enabled",Boolean.class,false))
            throw new IllegalStateException("Las cuentas de prueba requieren el runtime aislado y los circuitos anteriores desactivados.");
    }
    @Bean static BeanFactoryPostProcessor cuentasPruebaGuard(Environment e){return f->validar(e);}
    @Bean @Order(-20) SecurityFilterChain lexiCuentas(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/lexi/orientacion").csrf(c->c.disable())
            .authorizeHttpRequests(a->a.anyRequest().permitAll()).build();
    }
}

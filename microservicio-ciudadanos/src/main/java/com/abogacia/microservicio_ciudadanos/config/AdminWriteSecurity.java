package com.abogacia.microservicio_ciudadanos.config;

import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@Profile("!admin-readonly-test")
public class AdminWriteSecurity {
    @Bean @Order(-1)
    SecurityFilterChain adminWriteFilterChain(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/admin/ciudadanos/*/suspender", "/api/admin/ciudadanos/*/rehabilitar")
            .csrf(c -> c.disable()).cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.POST, "/api/admin/ciudadanos/*/suspender", "/api/admin/ciudadanos/*/rehabilitar")
                .access((authentication, context) -> new AuthorizationDecision(
                    authentication.get().getPrincipal() instanceof Jwt jwt && "ADMIN".equals(jwt.getClaimAsString("rol"))))
                
                .anyRequest().denyAll())
            .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults())).build();
    }
}

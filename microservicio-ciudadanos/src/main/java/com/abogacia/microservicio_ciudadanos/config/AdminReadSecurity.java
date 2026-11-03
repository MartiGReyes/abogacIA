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

/** Separate chain: existing owner and internal endpoints retain their rules. */
@Configuration
public class AdminReadSecurity {
    @Bean
    @Order(0)
    SecurityFilterChain adminReadFilterChain(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/admin/ciudadanos", "/api/admin/ciudadanos/**")
            .csrf(c -> c.disable()).cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers(HttpMethod.GET, "/api/admin/ciudadanos", "/api/admin/ciudadanos/**")
                .access((authentication, context) -> new AuthorizationDecision(
                    authentication.get().getPrincipal() instanceof Jwt jwt
                    && "ADMIN".equals(jwt.getClaimAsString("rol"))))
                .anyRequest().denyAll())
            .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults())).build();
    }
}


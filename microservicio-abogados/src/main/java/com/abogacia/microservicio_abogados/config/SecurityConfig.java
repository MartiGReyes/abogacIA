package com.abogacia.microservicio_abogados.config;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;

@Configuration

public class SecurityConfig {
    @Bean
    UserDetailsService internalUser(@Value("${INTERNAL_USERNAME}") String username,
            @Value("${INTERNAL_PASSWORD}") String password, PasswordEncoder encoder) {
        if (username.isBlank() || password.isBlank()) throw new IllegalArgumentException("Credenciales internas obligatorias");
        return new InMemoryUserDetailsManager(User.withUsername(username)
                .password(encoder.encode(password)).roles("INTERNAL").build());
    }

    @Bean
    @Order(1)
    SecurityFilterChain internalSecurity(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/interno/**")
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a.anyRequest().hasRole("INTERNAL"))
                .httpBasic(Customizer.withDefaults()).build();
    }

    @Bean
    SecurityFilterChain publicSecurity(HttpSecurity http) throws Exception {
        return http.csrf(csrf -> csrf.disable()).cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                    .dispatcherTypeMatchers(jakarta.servlet.DispatcherType.ERROR).permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/abogados", "/api/abogados/confirmar").permitAll()
                    .requestMatchers("/api/abogados/verificacion/**").permitAll()
                    
                    .anyRequest().denyAll())
                .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(List.of("http://localhost:5173"));
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Registro-Token"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/abogados/**", cors);
        return source;
    }
}

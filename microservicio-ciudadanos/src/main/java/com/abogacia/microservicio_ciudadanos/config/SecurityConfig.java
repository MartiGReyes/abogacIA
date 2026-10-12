package com.abogacia.microservicio_ciudadanos.config;

import java.util.Base64;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.*;

@Configuration
@EnableMethodSecurity
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
                    .requestMatchers(HttpMethod.POST, "/api/ciudadanos", "/api/ciudadanos/confirmar").permitAll()
                    // Didit: autorizado por el token temporal X-Registro-Token, no por JWT (la cuenta aún está PENDIENTE).
                    .requestMatchers("/api/ciudadanos/verificacion/**").permitAll()
                    .requestMatchers("/api/ciudadanos/**").authenticated()
                    .anyRequest().denyAll())
                .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults())).build();
    }

    @Bean
    JwtDecoder jwtDecoder(@Value("${JWT_SECRET}") String secret) {
        byte[] key = Base64.getDecoder().decode(secret);
        if (key.length < 32) throw new IllegalArgumentException("JWT_SECRET requiere al menos 32 bytes en Base64");
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(key, "HmacSHA256")).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("abogacia-auth"));
        return decoder;
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(List.of("http://localhost:5173"));
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "OPTIONS"));
        cors.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Registro-Token"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/ciudadanos/**", cors);
        return source;
    }
}

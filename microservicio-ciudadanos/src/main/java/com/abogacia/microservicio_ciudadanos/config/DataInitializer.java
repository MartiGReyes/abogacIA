package com.abogacia.microservicio_ciudadanos.config;

import com.abogacia.microservicio_ciudadanos.entity.Estado;
import com.abogacia.microservicio_ciudadanos.repository.EstadoRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataInitializer {

    @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="abogacia.bootstrap.states-enabled",havingValue="true")
    @org.springframework.core.annotation.Order(-100)
    @Bean
    CommandLineRunner inicializarEstados(EstadoRepository estadoRepository) {
        return args -> {

            if (estadoRepository.findByNombreEstado("PENDIENTE").isEmpty()) {
                estadoRepository.save(new Estado("PENDIENTE"));
            }

            if (estadoRepository.findByNombreEstado("REGISTRADO").isEmpty()) {
                estadoRepository.save(new Estado("REGISTRADO"));
            }

            if (estadoRepository.findByNombreEstado("BAJA").isEmpty()) {
                estadoRepository.save(new Estado("BAJA"));
            }
        };
    }
}

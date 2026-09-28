package com.abogacia.microservicio_ciudadanos.repository;

import com.abogacia.microservicio_ciudadanos.entity.Estado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EstadoRepository extends JpaRepository<Estado, Long> {

    Optional<Estado> findByNombreEstado(String nombreEstado);
}
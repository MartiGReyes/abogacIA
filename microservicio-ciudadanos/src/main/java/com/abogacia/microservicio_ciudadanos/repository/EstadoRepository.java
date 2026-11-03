package com.abogacia.microservicio_ciudadanos.repository;

import com.abogacia.microservicio_ciudadanos.entity.Estado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EstadoRepository extends JpaRepository<Estado, Long> {

    Optional<Estado> findByNombreEstado(String nombreEstado);
    // Serializes creation of SUSPENDIDO and full padron replacements using an existing row.
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select e from Estado e where e.nombreEstado = 'REGISTRADO'")
    java.util.Optional<Estado> bloquearAdministracion();
}
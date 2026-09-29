package com.abogacia.microservicio_ciudadanos.repository;

import com.abogacia.microservicio_ciudadanos.entity.Ciudadano;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CiudadanoRepository extends JpaRepository<Ciudadano, Long> {

    boolean existsByCuil(String cuil);

    boolean existsByMail(String mail);

    Optional<Ciudadano> findByCuil(String cuil);

    Optional<Ciudadano> findByMail(String mail);
    Optional<Ciudadano> findByCodigoConfirmacion(String codigoConfirmacion);
}
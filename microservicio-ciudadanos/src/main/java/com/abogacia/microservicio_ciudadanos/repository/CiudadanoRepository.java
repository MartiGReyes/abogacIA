package com.abogacia.microservicio_ciudadanos.repository;

import com.abogacia.microservicio_ciudadanos.entity.Ciudadano;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CiudadanoRepository extends JpaRepository<Ciudadano, Long> {

    boolean existsByDni(String dni);

    boolean existsByMail(String mail);

    Optional<Ciudadano> findByDni(String dni);

    Optional<Ciudadano> findByMail(String mail);
    Optional<Ciudadano> findByCodigoConfirmacion(String codigoConfirmacion);

    Optional<Ciudadano> findByAccesoRegistroHash(String hash);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select c from Ciudadano c where c.idCiudadano = :id")
    Optional<Ciudadano> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
}
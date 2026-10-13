package com.abogacia.microservicio_abogados.repository;

import com.abogacia.microservicio_abogados.entity.AbogadoRegistrado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AbogadoRepository extends JpaRepository<AbogadoRegistrado, Long> {

    Optional<AbogadoRegistrado> findByMail(String mail);

    Optional<AbogadoRegistrado> findByAccesoRegistroHash(String hash);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select a from AbogadoRegistrado a where a.idAbogado = :id")
    Optional<AbogadoRegistrado> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select a from AbogadoRegistrado a where a.mail = :mail")
    Optional<AbogadoRegistrado> findByMailForUpdate(@org.springframework.data.repository.query.Param("mail") String mail);

    Optional<AbogadoRegistrado> findByDni(String dni);

    Optional<AbogadoRegistrado> findByNroMatricula(String nroMatricula);

    boolean existsByMail(String mail);
    boolean existsByMailIgnoreCaseAndIdAbogadoNot(String mail, Long id);

    boolean existsByDni(String dni);
}

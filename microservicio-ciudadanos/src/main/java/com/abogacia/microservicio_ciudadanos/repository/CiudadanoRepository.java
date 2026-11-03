package com.abogacia.microservicio_ciudadanos.repository;

import com.abogacia.microservicio_ciudadanos.entity.Ciudadano;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CiudadanoRepository extends JpaRepository<Ciudadano, Long> {

    @org.springframework.data.jpa.repository.Query(value = """
        select c from Ciudadano c left join fetch c.estado
        where :q = '' or lower(coalesce(c.nombre, '')) like :q escape '!'
            or lower(coalesce(c.apellido, '')) like :q escape '!'
        """, countQuery = """
        select count(c) from Ciudadano c
        where :q = '' or lower(coalesce(c.nombre, '')) like :q escape '!'
            or lower(coalesce(c.apellido, '')) like :q escape '!'
        """)
    org.springframework.data.domain.Page<Ciudadano> buscarAdmin(
        @org.springframework.data.repository.query.Param("q") String q,
        org.springframework.data.domain.Pageable pagina);

    interface ConteoEstado { String getEstado(); long getCantidad(); }
    @org.springframework.data.jpa.repository.Query("select coalesce(e.nombreEstado, 'SIN_ESTADO') as estado, count(c) as cantidad from Ciudadano c left join c.estado e group by e.nombreEstado")
    java.util.List<ConteoEstado> contarPorEstadoAdmin();

    boolean existsByDni(String dni);

    boolean existsByMail(String mail);

    Optional<Ciudadano> findByDni(String dni);

    Optional<Ciudadano> findByMail(String mail);
    Optional<Ciudadano> findByCodigoConfirmacion(String codigoConfirmacion);

    Optional<Ciudadano> findByAccesoRegistroHash(String hash);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select c from Ciudadano c where c.idCiudadano = :id")
    Optional<Ciudadano> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select c from Ciudadano c where c.dni = :dni")
    Optional<Ciudadano> findByDniForUpdate(@org.springframework.data.repository.query.Param("dni") String dni);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select c from Ciudadano c where c.codigoConfirmacion = :codigo")
    Optional<Ciudadano> findByCodigoConfirmacionForUpdate(@org.springframework.data.repository.query.Param("codigo") String codigo);
}

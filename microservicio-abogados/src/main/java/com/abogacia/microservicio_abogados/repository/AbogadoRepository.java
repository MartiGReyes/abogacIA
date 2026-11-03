package com.abogacia.microservicio_abogados.repository;

import com.abogacia.microservicio_abogados.entity.AbogadoRegistrado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AbogadoRepository extends JpaRepository<AbogadoRegistrado, Long> {

    interface ConteoEstado { String getEstado(); long getCantidad(); }
    @org.springframework.data.jpa.repository.Query("select coalesce(e.nombreEstado, 'SIN_ESTADO') as estado, count(a) as cantidad from AbogadoRegistrado a left join a.estado e group by e.nombreEstado")
    java.util.List<ConteoEstado> contarPorEstadoAdmin();

    @org.springframework.data.jpa.repository.Query(value = """
        select a from AbogadoRegistrado a left join fetch a.estado e
        where (:q = '' or lower(coalesce(a.nombre, '')) like :q escape '!'
            or lower(coalesce(a.apellido, '')) like :q escape '!')
        and (:estado = '' or e.nombreEstado = :estado)
        and (:identidad = '' or a.verificacionDni = :identidad)
        and (:matricula = '' or a.validacionMatricula = :matricula)
        """, countQuery = """
        select count(a) from AbogadoRegistrado a left join a.estado e
        where (:q = '' or lower(coalesce(a.nombre, '')) like :q escape '!'
            or lower(coalesce(a.apellido, '')) like :q escape '!')
        and (:estado = '' or e.nombreEstado = :estado)
        and (:identidad = '' or a.verificacionDni = :identidad)
        and (:matricula = '' or a.validacionMatricula = :matricula)
        """)
    org.springframework.data.domain.Page<AbogadoRegistrado> buscarAdmin(
        @org.springframework.data.repository.query.Param("q") String q,
        @org.springframework.data.repository.query.Param("estado") String estado,
        @org.springframework.data.repository.query.Param("identidad") String identidad,
        @org.springframework.data.repository.query.Param("matricula") String matricula,
        org.springframework.data.domain.Pageable pagina);

    @org.springframework.data.jpa.repository.Query("""
        select a from AbogadoRegistrado a where a.estado.nombreEstado = 'REGISTRADO'
        and a.contrasenaHash is not null and a.correoConfirmado = true
        and a.verificacionDni = 'APROBADA' and a.validacionMatricula = 'VALIDADA'
        and a.matriculaVerificada = true
        order by a.apellido, a.nombre, a.idAbogado
        """)
    java.util.List<AbogadoRegistrado> findHabilitadosRecomendaciones();

    @org.springframework.data.jpa.repository.Query("select distinct e from AbogadoRegistrado a join a.especialidades e")
    java.util.List<String> findEspecialidadesExistentes();

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

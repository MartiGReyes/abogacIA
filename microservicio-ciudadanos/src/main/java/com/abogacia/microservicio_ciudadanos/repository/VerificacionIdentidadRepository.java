package com.abogacia.microservicio_ciudadanos.repository;

import com.abogacia.microservicio_ciudadanos.entity.VerificacionIdentidad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import java.time.Instant;
import java.util.List;

public interface VerificacionIdentidadRepository extends JpaRepository<VerificacionIdentidad,Long> {
    List<VerificacionIdentidad> findByProximaConsultaLessThanEqualOrderByProximaConsultaAsc(Instant ahora,Pageable pagina);
}

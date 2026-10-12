package com.abogacia.microservicio_abogados.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.abogacia.microservicio_abogados.entity.PadronEvidencia;
import java.util.List;
public interface PadronEvidenciaRepository extends JpaRepository<PadronEvidencia,Long> {
 List<PadronEvidencia> findByMatricula(String matricula);
}

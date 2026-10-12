package com.abogacia.microservicio_abogados.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import com.abogacia.microservicio_abogados.entity.Padron;
public interface PadronRepository extends JpaRepository<Padron,String> {}

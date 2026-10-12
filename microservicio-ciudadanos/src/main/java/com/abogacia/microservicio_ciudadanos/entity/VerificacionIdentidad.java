package com.abogacia.microservicio_ciudadanos.entity;

import jakarta.persistence.*;
import java.time.Instant;

/** One current verification per account. No media or complete provider response is persisted. */
@Entity
@Table(name="verificacion_identidad")
public class VerificacionIdentidad {
    @Id public Long idCiudadano;
    @Version public Long version;
    @Column(unique=true) public String sesion;
    public String referencia;
    public String workflow;
    public Integer workflowVersion;
    @Column(length=2048) public String url;
    public String estado="SIN_SESION";
    public String avisoVersion;
    public String avisoHash;
    public Instant consentimientoFecha;
    public boolean consentimiento;
    public Instant inicio;
    public Instant proximaConsulta;
    public Instant leaseHasta;
    public String operacion;
    public int intentos;
    public int consultas;
    public int errores;
    public Instant ultimaConsulta;
    public String errorCodigo;
    public VerificacionIdentidad() {}
    public VerificacionIdentidad(Long id){idCiudadano=id;}
}

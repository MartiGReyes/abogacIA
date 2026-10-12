package com.abogacia.microservicio_abogados.entity;
import jakarta.persistence.*;
@Entity
@Table(name="padron")
public class Padron {
 @Id private String nroMatricula;
 @Column(length=16) private String estado;
 protected Padron() {}
 public Padron(String matricula, String estado) { this.nroMatricula=matricula; this.estado=estado; }
 public String getNroMatricula() { return nroMatricula; }
 public String getEstado() { return estado; }
}

package com.abogacia.microservicio_abogados.entity;
import jakarta.persistence.*;
@Entity
@Table(name="padron_evidencia")
public class PadronEvidencia {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 private String matricula;
 private String dni;
 private String nombreCompleto;
 private String estado;
 private String hoja;
 private int fila;
 private String versionArchivo;
 protected PadronEvidencia() {}
 public PadronEvidencia(String matricula,String dni,String nombre,String estado,String hoja,int fila,String version) {
  this.matricula=matricula;this.dni=dni;this.nombreCompleto=nombre;this.estado=estado;this.hoja=hoja;this.fila=fila;this.versionArchivo=version;
 }
 public String getMatricula(){return matricula;} public String getDni(){return dni;}
 public String getEstado(){return estado;} public String getNombreCompleto(){return nombreCompleto;}
}

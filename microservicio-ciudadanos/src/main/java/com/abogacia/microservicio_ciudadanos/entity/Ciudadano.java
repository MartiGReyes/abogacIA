package com.abogacia.microservicio_ciudadanos.entity;

import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "ciudadano")
public class Ciudadano {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idCiudadano;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String apellido;

    @Column(nullable = false, unique = true, length = 8)
    private String dni;

    @Column(nullable = false)
    private LocalDate fechaNacimiento;

    private String direccion;

    @Column(nullable = false, unique = true)
    private String mail;

    private String nroCelular;

    @Column(nullable = false)
    private String contrasenaHash;

    private String codigoConfirmacion;

    @ManyToOne
    @JoinColumn(name = "id_estado", nullable = false)
    private Estado estado;

    // Verificación de identidad con Didit
    @Column(columnDefinition = "boolean default false")
    private boolean correoConfirmado;

    private String verificacionDni;

    private String sesionDidit;

    private String resultadoDiditId;

    @Column(unique = true)
    private String accesoRegistroHash;

    private java.time.Instant accesoRegistroVence;

    public Ciudadano() {
    }

    public boolean getCorreoConfirmado() { return correoConfirmado; }
    public void setCorreoConfirmado(boolean value) { this.correoConfirmado = value; }

    public String getVerificacionDni() { return verificacionDni; }
    public void setVerificacionDni(String value) { this.verificacionDni = value; }

    public String getSesionDidit() { return sesionDidit; }
    public void setSesionDidit(String value) { this.sesionDidit = value; }

    public String getResultadoDiditId() { return resultadoDiditId; }
    public void setResultadoDiditId(String value) { this.resultadoDiditId = value; }

    public String getAccesoRegistroHash() { return accesoRegistroHash; }
    public void setAccesoRegistroHash(String hash) { this.accesoRegistroHash = hash; }

    public java.time.Instant getAccesoRegistroVence() { return accesoRegistroVence; }
    public void setAccesoRegistroVence(java.time.Instant fecha) { this.accesoRegistroVence = fecha; }

    public Long getIdCiudadano() {
        return idCiudadano;
    }

    public void setIdCiudadano(Long idCiudadano) {
        this.idCiudadano = idCiudadano;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
    }

    public String getDni() {
        return dni;
    }

    public void setDni(String dni) {
        this.dni = dni;
    }

    public LocalDate getFechaNacimiento() {
        return fechaNacimiento;
    }

    public void setFechaNacimiento(LocalDate fechaNacimiento) {
        this.fechaNacimiento = fechaNacimiento;
    }

    public String getDireccion() {
        return direccion;
    }

    public void setDireccion(String direccion) {
        this.direccion = direccion;
    }

    public String getMail() {
        return mail;
    }

    public void setMail(String mail) {
        this.mail = mail;
    }

    public String getNroCelular() {
        return nroCelular;
    }

    public void setNroCelular(String nroCelular) {
        this.nroCelular = nroCelular;
    }

    public String getContrasenaHash() {
        return contrasenaHash;
    }

    public void setContrasenaHash(String contrasenaHash) {
        this.contrasenaHash = contrasenaHash;
    }

    public String getCodigoConfirmacion() {
        return codigoConfirmacion;
    }

    public void setCodigoConfirmacion(String codigoConfirmacion) {
        this.codigoConfirmacion = codigoConfirmacion;
    }

    public Estado getEstado() {
        return estado;
    }

    public void setEstado(Estado estado) {
        this.estado = estado;
    }
}
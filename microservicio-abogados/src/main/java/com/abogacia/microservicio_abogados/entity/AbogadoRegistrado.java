package com.abogacia.microservicio_abogados.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "abogados_registrados")
public class AbogadoRegistrado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idAbogado;

    @Version
    @Column(columnDefinition="bigint default 0")
    private Long version;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(unique=true)
    private String accesoRegistroHash;
    private java.time.Instant accesoRegistroVence;
    public String getAccesoRegistroHash(){return accesoRegistroHash;}
    public void setAccesoRegistroHash(String hash){accesoRegistroHash=hash;}
    public java.time.Instant getAccesoRegistroVence(){return accesoRegistroVence;}
    public void setAccesoRegistroVence(java.time.Instant fecha){accesoRegistroVence=fecha;}

    @ManyToOne
    @JoinColumn(name="padron_matricula")
    private Padron padron;
    public Padron getPadron() { return padron; }
    public void setPadron(Padron value) { padron=value; }

    // Datos personales. Nombre y apellido se leen de Didit, por eso la solicitud existe antes de tenerlos.
    private String nombre;

    private String apellido;

    @Column(nullable = false, unique = true, length = 8)
    private String dni;

    @Column(nullable = false, unique = true)
    private String mail;

    private String nroCelular;

    // Datos profesionales
    private String nroMatricula;

    private String colegioProfesional;

    private String provincia;

    private Integer aniosExperiencia;

    private String ubicacion;

    @Column(length = 2000)
    private String descripcionProfesional;

    // Datos de acceso. Nulo mientras la cuenta es una solicitud sin completar.
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String contrasenaHash;

    @com.fasterxml.jackson.annotation.JsonIgnore
    private String codigoConfirmacion;

    // Verificaciones
    private Boolean dniVerificado = false;

    private Boolean matriculaVerificada = false;

    private LocalDate fechaRegistro;

    // Estado de la cuenta
    @ManyToOne
    @JoinColumn(name = "id_estado")
    private Estado estado;

    private LocalDate fechaNacimiento;

    public LocalDate getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(LocalDate value) { this.fechaNacimiento = value; }

    private String genero;

    public String getGenero() { return genero; }
    public void setGenero(String value) { this.genero = value; }

    private String domicilio;

    public String getDomicilio() { return domicilio; }
    public void setDomicilio(String value) { this.domicilio = value; }

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "abogado_especialidades", joinColumns = @JoinColumn(name = "id_abogado"))
    @Column(name = "especialidad")
    private java.util.Set<String> especialidades = new java.util.LinkedHashSet<>();

    public java.util.Set<String> getEspecialidades() { return especialidades; }
    public void setEspecialidades(java.util.Collection<String> value) { especialidades.clear(); especialidades.addAll(value); }

    /** Una solicitud pasa a ser cuenta cuando se define la contraseña (paso "Crear cuenta"). */
    public boolean esSolicitud() { return contrasenaHash == null; }

    private java.math.BigDecimal honorarios;

    public java.math.BigDecimal getHonorarios() { return honorarios; }
    public void setHonorarios(java.math.BigDecimal value) { this.honorarios = value; }

    private String direccionProfesional;

    public String getDireccionProfesional() { return direccionProfesional; }
    public void setDireccionProfesional(String value) { this.direccionProfesional = value; }

    @Column(columnDefinition="boolean default false")
    private boolean correoConfirmado;

    public boolean getCorreoConfirmado() { return correoConfirmado; }
    public void setCorreoConfirmado(boolean value) { this.correoConfirmado = value; }

    private String verificacionDni;

    public String getVerificacionDni() { return verificacionDni; }
    public void setVerificacionDni(String value) { this.verificacionDni = value; }

    private String validacionMatricula;

    public String getValidacionMatricula() { return validacionMatricula; }
    public void setValidacionMatricula(String value) { this.validacionMatricula = value; }

    private String sesionDidit;

    public String getSesionDidit() { return sesionDidit; }
    public void setSesionDidit(String value) { this.sesionDidit = value; }

    private String resultadoDiditId;

    public String getResultadoDiditId() { return resultadoDiditId; }
    public void setResultadoDiditId(String value) { this.resultadoDiditId = value; }

    private java.time.Instant confirmacionVence;

    public java.time.Instant getConfirmacionVence() { return confirmacionVence; }
    public void setConfirmacionVence(java.time.Instant value) { this.confirmacionVence = value; }

    @Column(columnDefinition="integer default 0")
    private int intentosConfirmacion;

    public int getIntentosConfirmacion() { return intentosConfirmacion; }
    public void setIntentosConfirmacion(int value) { this.intentosConfirmacion = value; }

    public AbogadoRegistrado() {
    }

    public Long getIdAbogado() {
        return idAbogado;
    }

    public void setIdAbogado(Long idAbogado) {
        this.idAbogado = idAbogado;
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

    public String getNroMatricula() {
        return nroMatricula;
    }

    public void setNroMatricula(String nroMatricula) {
        this.nroMatricula = nroMatricula;
    }

    public String getColegioProfesional() {
        return colegioProfesional;
    }

    public void setColegioProfesional(String colegioProfesional) {
        this.colegioProfesional = colegioProfesional;
    }

    public String getProvincia() {
        return provincia;
    }

    public void setProvincia(String provincia) {
        this.provincia = provincia;
    }

    public Integer getAniosExperiencia() {
        return aniosExperiencia;
    }

    public void setAniosExperiencia(Integer aniosExperiencia) {
        this.aniosExperiencia = aniosExperiencia;
    }

    public String getUbicacion() {
        return ubicacion;
    }

    public void setUbicacion(String ubicacion) {
        this.ubicacion = ubicacion;
    }

    public String getDescripcionProfesional() {
        return descripcionProfesional;
    }

    public void setDescripcionProfesional(String descripcionProfesional) {
        this.descripcionProfesional = descripcionProfesional;
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

    public Boolean getDniVerificado() {
        return dniVerificado;
    }

    public void setDniVerificado(Boolean dniVerificado) {
        this.dniVerificado = dniVerificado;
    }

    public Boolean getMatriculaVerificada() {
        return matriculaVerificada;
    }

    public void setMatriculaVerificada(Boolean matriculaVerificada) {
        this.matriculaVerificada = matriculaVerificada;
    }

    public LocalDate getFechaRegistro() {
        return fechaRegistro;
    }

    public void setFechaRegistro(LocalDate fechaRegistro) {
        this.fechaRegistro = fechaRegistro;
    }

    public Estado getEstado() {
        return estado;
    }

    public void setEstado(Estado estado) {
        this.estado = estado;
    }
}

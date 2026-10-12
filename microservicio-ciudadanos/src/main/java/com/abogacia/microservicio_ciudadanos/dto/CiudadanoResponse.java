package com.abogacia.microservicio_ciudadanos.dto;

import com.abogacia.microservicio_ciudadanos.entity.Ciudadano;

import java.time.LocalDate;

public class CiudadanoResponse {

    private Long idCiudadano;
    private String nombre;
    private String apellido;
    private String dni;
    private LocalDate fechaNacimiento;
    private String direccion;
    private String mail;
    private String nroCelular;
    private String estado;
    private boolean correoConfirmado;
    private String verificacionDni;

    public CiudadanoResponse(Ciudadano ciudadano) {
        this.correoConfirmado = ciudadano.getCorreoConfirmado();
        this.verificacionDni = ciudadano.getVerificacionDni() == null ? "PENDIENTE" : ciudadano.getVerificacionDni();
        this.idCiudadano = ciudadano.getIdCiudadano();
        this.nombre = ciudadano.getNombre();
        this.apellido = ciudadano.getApellido();
        this.dni = ciudadano.getDni();
        this.fechaNacimiento = ciudadano.getFechaNacimiento();
        this.direccion = ciudadano.getDireccion();
        this.mail = ciudadano.getMail();
        this.nroCelular = ciudadano.getNroCelular();
        this.estado = ciudadano.getEstado().getNombreEstado();
    }

    public Long getIdCiudadano() {
        return idCiudadano;
    }

    public String getNombre() {
        return nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public String getDni() {
        return dni;
    }

    public LocalDate getFechaNacimiento() {
        return fechaNacimiento;
    }

    public String getDireccion() {
        return direccion;
    }

    public String getMail() {
        return mail;
    }

    public String getNroCelular() {
        return nroCelular;
    }

    public String getEstado() {
        return estado;
    }

    public boolean getCorreoConfirmado() {
        return correoConfirmado;
    }

    public String getVerificacionDni() {
        return verificacionDni;
    }
}
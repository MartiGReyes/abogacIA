package com.abogacia.microservicio_ciudadanos.dto;

import com.abogacia.microservicio_ciudadanos.entity.Ciudadano;

import java.time.LocalDate;

public class CiudadanoResponse {

    private Long idCiudadano;
    private String nombre;
    private String apellido;
    private String cuil;
    private LocalDate fechaNacimiento;
    private String direccion;
    private String mail;
    private String nroCelular;
    private String estado;

    public CiudadanoResponse(Ciudadano ciudadano) {
        this.idCiudadano = ciudadano.getIdCiudadano();
        this.nombre = ciudadano.getNombre();
        this.apellido = ciudadano.getApellido();
        this.cuil = ciudadano.getCuil();
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

    public String getCuil() {
        return cuil;
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
}
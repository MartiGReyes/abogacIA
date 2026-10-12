package com.abogacia.microservicio_ciudadanos.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class ValidarCredencialesCiudadanoRequest {

    @NotBlank
    @Email
    private String mail;

    @NotBlank
    private String contrasena;

    public String getMail() {
        return mail;
    }

    public void setMail(String mail) {
        this.mail = mail;
    }

    public String getContrasena() {
        return contrasena;
    }

    public void setContrasena(String contrasena) {
        this.contrasena = contrasena;
    }
}
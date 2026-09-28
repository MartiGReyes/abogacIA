package com.abogacia.microservicio_ciudadanos.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class ConfirmarRegistroRequest {

    @NotBlank
    @Email
    private String mail;

    @NotBlank
    private String codigo;

    public String getMail() {
        return mail;
    }

    public void setMail(String mail) {
        this.mail = mail;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }
}
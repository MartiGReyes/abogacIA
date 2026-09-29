package com.abogacia.microservicio_ciudadanos.dto;

import jakarta.validation.constraints.NotBlank;

public class ConfirmarRegistroRequest {

    @NotBlank
    private String codigo;

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }
}
package com.abogacia.microservicio_abogados.dto;
import jakarta.validation.constraints.*;
/** Paso 1 del registro profesional: datos de contacto para iniciar la validación de identidad. */
public record IniciarSolicitudRequest(
 @NotBlank @Pattern(regexp="[0-9]{7,8}") String dni,
 @NotBlank @Email @Size(max=254) String mail,
 @NotBlank @Size(max=30) String nroCelular) {
 @Override public String toString() { return "IniciarSolicitudRequest[datos omitidos]"; }
}

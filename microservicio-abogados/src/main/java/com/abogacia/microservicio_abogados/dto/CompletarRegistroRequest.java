package com.abogacia.microservicio_abogados.dto;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
/** Pasos 3 y 4 del registro profesional. Nombre, nacimiento, género y domicilio vienen de Didit, no del navegador. */
public record CompletarRegistroRequest(
 @NotEmpty @Size(max=8) List<@NotBlank @Size(max=100) String> especialidades,
 @NotNull @Min(0) @Max(80) Integer aniosExperiencia,
 @NotNull @DecimalMin("0") @Digits(integer=10,fraction=2) BigDecimal honorarios,
 @NotBlank @Size(max=255) String ubicacion, @NotBlank @Size(max=255) String direccionProfesional,
 @NotBlank @Size(max=2000) String descripcionProfesional,
 // Formato provisional hasta definir la fuente de matrículas: números, con un prefijo opcional ("12345" o "10-123").
 @NotBlank @Pattern(regexp="([0-9]{1,3}-)?[0-9]{1,6}") String nroMatricula,
 @NotBlank @Size(max=255) String colegioProfesional, @NotBlank @Size(max=100) String provincia,
 @NotBlank @Size(min=8,max=72) String contrasena, @NotBlank @Size(max=72) String confirmarContrasena) {
 @Override public String toString() { return "CompletarRegistroRequest[datos omitidos]"; }
}

package com.abogacia.microservicio_abogados.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.math.BigDecimal;
public record RegistrarAbogadoRequest(
 @NotBlank @Size(max=100) String nombre, @NotBlank @Size(max=100) String apellido,
 @NotBlank @Pattern(regexp="[0-9]{7,8}") String dni,
 @NotBlank @Email @Size(max=254) String mail, @NotBlank @Size(max=30) String nroCelular,
 @NotNull @Past LocalDate fechaNacimiento, @NotBlank @Size(max=100) String genero,
 @NotBlank @Size(max=255) String domicilio,
 @NotBlank @Pattern(regexp="10-[0-9]{3}") String nroMatricula,
 @NotBlank @Size(max=255) String colegioProfesional, @NotBlank @Size(max=100) String provincia,
 @NotBlank @Size(max=255) String especialidad, @NotNull @Min(0) @Max(100) Integer aniosExperiencia,
 @NotNull @DecimalMin("0") @Digits(integer=10,fraction=2) BigDecimal honorarios,
 @NotBlank @Size(max=255) String ubicacion, @NotBlank @Size(max=255) String direccionProfesional,
 @NotBlank @Size(max=2000) String descripcionProfesional,
 @NotBlank @Size(min=8,max=72) String contrasena, @NotBlank @Size(max=72) String confirmarContrasena) {
 @Override public String toString() { return "RegistrarAbogadoRequest[datos omitidos]"; }
}

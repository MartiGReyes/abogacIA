package com.abogacia.microservicio_abogados.dto;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
public record ModificarAbogadoRequest(
 @NotBlank @Size(max=100) String nombre, @NotBlank @Size(max=100) String apellido,
 @NotNull @Past LocalDate fechaNacimiento, @NotBlank @Email @Size(max=255) String mail,
 @NotBlank @Pattern(regexp="[+0-9() .-]{6,30}") String nroCelular,
 @NotBlank @Size(max=255) String domicilio,
 @NotEmpty @Size(max=8) List<@NotBlank @Size(max=100) String> especialidades,
 @NotNull @Min(0) @Max(80) Integer aniosExperiencia,
 @NotNull @DecimalMin("0") @Digits(integer=10,fraction=2) BigDecimal honorarios,
 @NotBlank @Size(max=255) String ubicacion, @NotBlank @Size(max=255) String direccionProfesional,
 @NotBlank @Size(max=2000) String descripcionProfesional) {}

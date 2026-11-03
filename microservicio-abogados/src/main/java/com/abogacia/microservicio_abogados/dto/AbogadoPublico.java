package com.abogacia.microservicio_abogados.dto;

import java.util.List;

/** Explicit allowlist: never serialize the registration entity. */
public record AbogadoPublico(Long idAbogado, String nombre, String apellido,
    List<String> especialidades, String ubicacion, String provincia,
    String descripcionProfesional, Integer aniosExperiencia, String nroMatricula,
    String colegioProfesional, String mail, String nroCelular,
    boolean matriculaVerificada, boolean perfilPrueba) {}

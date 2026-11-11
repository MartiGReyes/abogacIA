package com.abogacia.microservicio_abogados.dto;

import java.util.List;

/** Explicit allowlist: never serialize the registration entity. */
public record AbogadoPublico(Long idAbogado, String nombre, String apellido,
    List<String> especialidades, String ubicacion, String provincia,
    String descripcionProfesional, Integer aniosExperiencia, String nroMatricula,
    String colegioProfesional, String mail, String nroCelular,
    boolean matriculaVerificada, boolean perfilPrueba, boolean contactoHabilitado,
    String telefonoEnmascarado, java.math.BigDecimal honorarios) {
    public AbogadoPublico(Long idAbogado,String nombre,String apellido,List<String> especialidades,String ubicacion,String provincia,
        String descripcionProfesional,Integer aniosExperiencia,String nroMatricula,String colegioProfesional,String mail,String nroCelular,boolean matriculaVerificada,boolean perfilPrueba){
        this(idAbogado,nombre,apellido,especialidades,ubicacion,provincia,descripcionProfesional,aniosExperiencia,nroMatricula,colegioProfesional,mail,nroCelular,matriculaVerificada,perfilPrueba,false,null,null);
    }
}

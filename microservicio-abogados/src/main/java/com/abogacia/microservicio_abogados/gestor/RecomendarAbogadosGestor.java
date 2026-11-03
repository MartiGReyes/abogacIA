package com.abogacia.microservicio_abogados.gestor;

import com.abogacia.microservicio_abogados.dto.AbogadoPublico;
import com.abogacia.microservicio_abogados.repository.AbogadoRepository;
import com.abogacia.microservicio_abogados.padron.ValidarMatricula;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.text.Normalizer;
import java.util.*;

@Service
public class RecomendarAbogadosGestor {
    private final AbogadoRepository abogados;
    private final ValidarMatricula matriculas;
    private final org.springframework.beans.factory.ObjectProvider<RecomendacionesPrueba> pruebas;
    public RecomendarAbogadosGestor(AbogadoRepository abogados, ValidarMatricula matriculas,
            org.springframework.beans.factory.ObjectProvider<RecomendacionesPrueba> pruebas) {
        this.abogados = abogados; this.matriculas = matriculas; this.pruebas = pruebas;
    }
    static String normalizar(String value) {
        return Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT);
    }
    // Reserved domains cannot be mistaken for public, real professional contacts.
    private static boolean contactoPrueba(String mail) {
        if (mail == null) return true;
        String domain = mail.substring(mail.lastIndexOf('@') + 1).toLowerCase(Locale.ROOT);
        return List.of("example.com", "example.net", "example.org", "invalid", "test", "localhost")
            .stream().anyMatch(d -> domain.equals(d) || domain.endsWith("." + d));
    }
    @Transactional(readOnly = true)
    public List<AbogadoPublico> recomendar(String especialidad) {
        var fixtureReader = pruebas.getIfAvailable();
        if (fixtureReader != null) return fixtureReader.recomendar(especialidad);
        String filtro = especialidad == null || especialidad.isBlank() ? null : normalizar(especialidad);
        if (filtro != null && abogados.findEspecialidadesExistentes().stream()
            .noneMatch(e -> normalizar(e).equals(filtro))) return List.of();
        return abogados.findHabilitadosRecomendaciones().stream()
            .filter(a -> !contactoPrueba(a.getMail()))
            .filter(a -> a.getNroMatricula() != null && a.getColegioProfesional() != null && a.getProvincia() != null)
            .filter(a -> filtro == null || a.getEspecialidades().stream().anyMatch(e -> normalizar(e).equals(filtro)))
            // Reuse the live padron check used for login; never upgrade stored verification flags.
            .filter(a -> matriculas.validar(a.getNroMatricula(), a.getDni(), a.getColegioProfesional(), a.getProvincia())
                == ValidarMatricula.Resultado.VALIDADA)
            .limit(12)
            .map(a -> new AbogadoPublico(a.getIdAbogado(), a.getNombre(), a.getApellido(),
                a.getEspecialidades().stream().sorted().toList(), a.getUbicacion(), a.getProvincia(),
                a.getDescripcionProfesional(), a.getAniosExperiencia(), a.getNroMatricula(),
                a.getColegioProfesional(), a.getMail(), a.getNroCelular(), true, false))
            .toList();
    }
}

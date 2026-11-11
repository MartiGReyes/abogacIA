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
    private final com.abogacia.microservicio_abogados.contacto.ProfesionalContactable contacto;
    public RecomendarAbogadosGestor(AbogadoRepository abogados, ValidarMatricula matriculas,
            org.springframework.beans.factory.ObjectProvider<RecomendacionesPrueba> pruebas, com.abogacia.microservicio_abogados.contacto.ProfesionalContactable contacto) {
        this.abogados = abogados; this.matriculas = matriculas; this.pruebas = pruebas; this.contacto=contacto;
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
        return listar(especialidad,12);
    }
    @Transactional(readOnly = true)
    public List<AbogadoPublico> catalogo() { return listar(null,Integer.MAX_VALUE); }
    private List<AbogadoPublico> listar(String especialidad,int limite) {
        var fixtureReader = pruebas.getIfAvailable();
        if (fixtureReader != null) return fixtureReader.recomendar(especialidad);
        String filtro = especialidad == null || especialidad.isBlank() ? null : normalizar(especialidad);
        if (filtro != null && abogados.findEspecialidadesExistentes().stream()
            .noneMatch(e -> normalizar(e).equals(filtro))) return List.of();
        return abogados.findHabilitadosRecomendaciones().stream()
            .filter(a -> !com.abogacia.microservicio_abogados.operativa.CuentaPruebaService.marcada(a))
            .filter(a -> !contactoPrueba(a.getMail()))
            .filter(a -> a.getNroMatricula() != null && a.getColegioProfesional() != null && a.getProvincia() != null)
            .filter(a -> filtro == null || a.getEspecialidades().stream().anyMatch(e -> normalizar(e).equals(filtro)))
            // Reuse the live padron check used for login; never upgrade stored verification flags.
            .filter(a -> matriculas.validar(a.getNroMatricula(), a.getDni(), a.getColegioProfesional(), a.getProvincia())
                == ValidarMatricula.Resultado.VALIDADA)
            .limit(limite)
            .map(a -> new AbogadoPublico(a.getIdAbogado(), a.getNombre(), a.getApellido(),
                a.getEspecialidades().stream().sorted().toList(), a.getUbicacion(), a.getProvincia(),
                a.getDescripcionProfesional(), a.getAniosExperiencia(), null,
                null, null, null, true, false,contacto.disponible(a),contacto.mascara(a),a.getHonorarios()))
            .toList();
    }
}

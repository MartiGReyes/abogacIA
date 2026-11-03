package com.abogacia.microservicio_abogados.controller;

import com.abogacia.microservicio_abogados.repository.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.*;
import java.util.Locale;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/admin/abogados")
@Profile("!abogados-dev")
@Transactional(readOnly = true)
public class AdminLecturaController {
    private final AbogadoRepository cuentas;
    private final VerificacionIdentidadRepository verificaciones;
    public AdminLecturaController(AbogadoRepository cuentas, VerificacionIdentidadRepository verificaciones) {
        this.cuentas = cuentas; this.verificaciones = verificaciones;
    }

    public record Conteo(String estado, long cantidad) {}
    public record Indicadores(long total, List<Conteo> porEstado, Instant consultadoEn) {}
    public record Identidad(Long id, String estadoCuenta, String estadoIdentidad, String estadoSesion,
        Instant inicio, Instant ultimaConsulta, Instant consentimientoFecha) {}

    @GetMapping("/indicadores")
    public ResponseEntity<Indicadores> indicadores() {
        var grupos = cuentas.contarPorEstadoAdmin().stream()
            .map(c -> new Conteo(c.getEstado(), c.getCantidad())).sorted(Comparator.comparing(Conteo::estado)).toList();
        return lectura(new Indicadores(grupos.stream().mapToLong(Conteo::cantidad).sum(), grupos, Instant.now()));
    }

    @GetMapping("/{id}/identidad")
    public ResponseEntity<Identidad> identidad(@PathVariable Long id) {
        if (id == null || id <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador inválido.");
        var cuenta = cuentas.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuenta no encontrada."));
        var local = verificaciones.findById(id).orElse(null);
        return lectura(new Identidad(id,
            cuenta.getEstado() == null ? "SIN_ESTADO" : cuenta.getEstado().getNombreEstado(),
            cuenta.getVerificacionDni() == null ? "SIN_RESULTADO" : cuenta.getVerificacionDni(),
            local == null ? "SIN_SESION" : local.estado,
            local == null ? null : local.inicio, local == null ? null : local.ultimaConsulta,
            local == null ? null : local.consentimientoFecha));
    }

    public record AbogadoFila(Long id, String nombre, String apellido, String estadoCuenta,
        String estadoIdentidad, String estadoMatricula, Boolean matriculaVerificada, java.time.LocalDate fechaRegistro) {}
    public record Listado(List<AbogadoFila> contenido, int pagina, int tamano, long total, int paginas) {}

    @GetMapping
    public ResponseEntity<Listado> abogados(
            @RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "") String estado,
            @RequestParam(defaultValue = "") String identidad, @RequestParam(defaultValue = "") String matricula,
            @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "20") int tamano) {
        if (pagina < 0 || pagina > 100000 || tamano < 1 || tamano > 100 || q.length() > 100
                || estado.length() > 40 || identidad.length() > 40 || matricula.length() > 40)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Filtros o paginación inválidos.");
        String texto = q.trim().toLowerCase(Locale.ROOT);
        String patron = texto.isEmpty() ? "" : "%" + texto.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        var resultado = cuentas.buscarAdmin(patron, estado.trim(), identidad.trim(), matricula.trim(),
            PageRequest.of(pagina, tamano, Sort.by("apellido", "nombre", "idAbogado")));
        var filas = resultado.getContent().stream().map(a -> new AbogadoFila(a.getIdAbogado(), a.getNombre(), a.getApellido(),
            a.getEstado() == null ? "SIN_ESTADO" : a.getEstado().getNombreEstado(),
            a.getVerificacionDni(), a.getValidacionMatricula(), a.getMatriculaVerificada(), a.getFechaRegistro())).toList();
        return lectura(new Listado(filas, pagina, tamano, resultado.getTotalElements(), resultado.getTotalPages()));
    }

    private static <T> ResponseEntity<T> lectura(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("Referrer-Policy", "no-referrer").body(body);
    }
}


package com.abogacia.microservicio_ciudadanos.controller;

import com.abogacia.microservicio_ciudadanos.repository.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/admin/ciudadanos")
@Transactional(readOnly = true)
public class AdminLecturaController {
    private final CiudadanoRepository cuentas;
    private final VerificacionIdentidadRepository verificaciones;
    public AdminLecturaController(CiudadanoRepository cuentas, VerificacionIdentidadRepository verificaciones) {
        this.cuentas = cuentas; this.verificaciones = verificaciones;
    }

    public record Conteo(String estado, long cantidad) {}
    public record Indicadores(long total, List<Conteo> porEstado, Instant consultadoEn) {}
    public record Identidad(Long id, String estadoCuenta, String estadoIdentidad, String estadoSesion,
        Instant inicio, Instant ultimaConsulta, Instant consentimientoFecha) {}
    public record CiudadanoFila(Long id, String nombre, String apellido, String estadoCuenta, String estadoIdentidad) {}
    public record Listado(List<CiudadanoFila> contenido, int pagina, int tamano, long total, int paginas) {}

    @GetMapping
    public ResponseEntity<Listado> ciudadanos(@RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "10") int tamano) {
        if (pagina < 0 || pagina > 100000 || tamano < 1 || tamano > 100 || q.length() > 100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Búsqueda o paginación inválida.");
        String texto = q.trim().toLowerCase(Locale.ROOT);
        String patron = texto.isEmpty() ? "" : "%" + texto.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
        var resultado = cuentas.buscarAdmin(patron, PageRequest.of(pagina, tamano, Sort.by("apellido", "nombre", "idCiudadano")));
        var filas = resultado.getContent().stream().map(c -> new CiudadanoFila(c.getIdCiudadano(), c.getNombre(), c.getApellido(),
            c.getEstado() == null ? "SIN_ESTADO" : c.getEstado().getNombreEstado(), c.getVerificacionDni())).toList();
        return lectura(new Listado(filas, pagina, tamano, resultado.getTotalElements(), resultado.getTotalPages()));
    }

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

    private static <T> ResponseEntity<T> lectura(T body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("Referrer-Policy", "no-referrer").body(body);
    }
}


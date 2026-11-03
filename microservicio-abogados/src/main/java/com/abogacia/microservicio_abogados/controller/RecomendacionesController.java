package com.abogacia.microservicio_abogados.controller;

import com.abogacia.microservicio_abogados.dto.AbogadoPublico;
import com.abogacia.microservicio_abogados.gestor.RecomendarAbogadosGestor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.*;
import java.util.List;

@RestController
@RequestMapping("/api/abogados/recomendaciones")
public class RecomendacionesController {
    private final RecomendarAbogadosGestor gestor;
    public RecomendacionesController(RecomendarAbogadosGestor gestor) { this.gestor = gestor; }
    @GetMapping
    public ResponseEntity<List<AbogadoPublico>> recomendar(@RequestParam(required = false) String especialidad) {
        if (especialidad != null && especialidad.length() > 100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Especialidad demasiado extensa.");
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(gestor.recomendar(especialidad));
    }
}

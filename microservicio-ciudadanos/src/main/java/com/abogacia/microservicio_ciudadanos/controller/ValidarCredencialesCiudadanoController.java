package com.abogacia.microservicio_ciudadanos.controller;

import com.abogacia.microservicio_ciudadanos.dto.ValidarCredencialesCiudadanoRequest;
import com.abogacia.microservicio_ciudadanos.gestor.ValidarCredencialesCiudadanoGestor;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/interno/ciudadanos")
public class ValidarCredencialesCiudadanoController {

    private final ValidarCredencialesCiudadanoGestor gestor;

    public ValidarCredencialesCiudadanoController(
            ValidarCredencialesCiudadanoGestor gestor
    ) {
        this.gestor = gestor;
    }

    @PostMapping("/validar-credenciales")
    public ResponseEntity<Map<String, Long>> validarCredenciales(
            @Valid @RequestBody ValidarCredencialesCiudadanoRequest request
    ) {

        Long idCiudadano = gestor.validar(
                request.getMail(),
                request.getContrasena()
        );

        return ResponseEntity.ok(
                Map.of("idCiudadano", idCiudadano)
        );
    }
}
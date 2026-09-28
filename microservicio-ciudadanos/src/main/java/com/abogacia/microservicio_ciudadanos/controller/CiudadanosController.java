package com.abogacia.microservicio_ciudadanos.controller;

import com.abogacia.microservicio_ciudadanos.dto.CiudadanoResponse;
import com.abogacia.microservicio_ciudadanos.dto.ConfirmarRegistroRequest;
import com.abogacia.microservicio_ciudadanos.dto.RegistrarCiudadanoRequest;
import com.abogacia.microservicio_ciudadanos.gestor.ConfirmarRegistroGestor;
import com.abogacia.microservicio_ciudadanos.gestor.RegistrarCiudadanoGestor;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ciudadanos")
public class CiudadanosController {

    private final RegistrarCiudadanoGestor registrarCiudadanoGestor;
    private final ConfirmarRegistroGestor confirmarRegistroGestor;

    public CiudadanosController(
            RegistrarCiudadanoGestor registrarCiudadanoGestor,
            ConfirmarRegistroGestor confirmarRegistroGestor
    ) {
        this.registrarCiudadanoGestor = registrarCiudadanoGestor;
        this.confirmarRegistroGestor = confirmarRegistroGestor;
    }

    @PostMapping
    public ResponseEntity<CiudadanoResponse> registrar(
            @Valid @RequestBody RegistrarCiudadanoRequest request
    ) {

        CiudadanoResponse response =
                registrarCiudadanoGestor.registrar(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @PostMapping("/confirmar")
    public ResponseEntity<CiudadanoResponse> confirmarRegistro(
            @Valid @RequestBody ConfirmarRegistroRequest request
    ) {

        CiudadanoResponse response =
                confirmarRegistroGestor.confirmar(request);

        return ResponseEntity.ok(response);
    }
}
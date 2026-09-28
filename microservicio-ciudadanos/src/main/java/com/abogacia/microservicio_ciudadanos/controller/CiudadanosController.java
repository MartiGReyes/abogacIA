package com.abogacia.microservicio_ciudadanos.controller;

import com.abogacia.microservicio_ciudadanos.dto.CiudadanoResponse;
import com.abogacia.microservicio_ciudadanos.dto.ConfirmarRegistroRequest;
import com.abogacia.microservicio_ciudadanos.dto.ModificarCiudadanoRequest;
import com.abogacia.microservicio_ciudadanos.dto.RegistrarCiudadanoRequest;
import com.abogacia.microservicio_ciudadanos.gestor.ConfirmarRegistroGestor;
import com.abogacia.microservicio_ciudadanos.gestor.ConsultarCiudadanoGestor;
import com.abogacia.microservicio_ciudadanos.gestor.ModificarCiudadanoGestor;
import com.abogacia.microservicio_ciudadanos.gestor.RegistrarCiudadanoGestor;
import com.abogacia.microservicio_ciudadanos.gestor.RegistrarBajaCiudadanoGestor;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ciudadanos")
public class CiudadanosController {

    private final RegistrarCiudadanoGestor registrarCiudadanoGestor;
    private final ConfirmarRegistroGestor confirmarRegistroGestor;
    private final ModificarCiudadanoGestor modificarCiudadanoGestor;
        private final ConsultarCiudadanoGestor consultarCiudadanoGestor;
        private final RegistrarBajaCiudadanoGestor registrarBajaCiudadanoGestor;

    public CiudadanosController(
            RegistrarCiudadanoGestor registrarCiudadanoGestor,
            ConfirmarRegistroGestor confirmarRegistroGestor,
                        ModificarCiudadanoGestor modificarCiudadanoGestor,
                        ConsultarCiudadanoGestor consultarCiudadanoGestor,
                        RegistrarBajaCiudadanoGestor registrarBajaCiudadanoGestor
    ) {
        this.registrarCiudadanoGestor = registrarCiudadanoGestor;
        this.confirmarRegistroGestor = confirmarRegistroGestor;
        this.modificarCiudadanoGestor = modificarCiudadanoGestor;
                this.consultarCiudadanoGestor = consultarCiudadanoGestor;
                this.registrarBajaCiudadanoGestor = registrarBajaCiudadanoGestor;
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

    @PutMapping("/{cuil}")
    public ResponseEntity<CiudadanoResponse> modificar(
            @PathVariable String cuil,
            @Valid @RequestBody ModificarCiudadanoRequest request
    ) {

        CiudadanoResponse response =
                modificarCiudadanoGestor.modificar(cuil, request);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{cuil}")
    public ResponseEntity<CiudadanoResponse> consultar(
            @PathVariable String cuil
    ) {

        CiudadanoResponse response =
                consultarCiudadanoGestor.consultar(cuil);

        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{cuil}/baja")
    public ResponseEntity<CiudadanoResponse> darDeBaja(
            @PathVariable String cuil
    ) {

        CiudadanoResponse response =
                registrarBajaCiudadanoGestor.darDeBaja(cuil);

        return ResponseEntity.ok(response);
    }
}

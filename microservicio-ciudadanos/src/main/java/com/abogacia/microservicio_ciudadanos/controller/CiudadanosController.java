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
import com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.access.prepost.PreAuthorize;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
@RequestMapping("/api/ciudadanos")
public class CiudadanosController {

    private final CiudadanoRepository repository;

    private final RegistrarCiudadanoGestor registrarCiudadanoGestor;
    private final ConfirmarRegistroGestor confirmarRegistroGestor;
    private final ModificarCiudadanoGestor modificarCiudadanoGestor;
        private final ConsultarCiudadanoGestor consultarCiudadanoGestor;
        private final RegistrarBajaCiudadanoGestor registrarBajaCiudadanoGestor;

    public CiudadanosController(
            CiudadanoRepository repository,
            RegistrarCiudadanoGestor registrarCiudadanoGestor,
            ConfirmarRegistroGestor confirmarRegistroGestor,
                        ModificarCiudadanoGestor modificarCiudadanoGestor,
                        ConsultarCiudadanoGestor consultarCiudadanoGestor,
                        RegistrarBajaCiudadanoGestor registrarBajaCiudadanoGestor
    ) {
        this.repository = repository;
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

    @GetMapping("/me")
    @PreAuthorize("authentication.token.getClaimAsString('rol') == 'CIUDADANO'")
    public CiudadanoResponse misDatos(@AuthenticationPrincipal Jwt jwt) {
        var ciudadano = repository.findById(Long.valueOf(jwt.getSubject()))
                .filter(c -> "REGISTRADO".equals(c.getEstado().getNombreEstado()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
        return consultarCiudadanoGestor.consultar(ciudadano.getCuil());
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
    @PreAuthorize("@cuentaPropia.permite(authentication, #cuil)")
    public ResponseEntity<CiudadanoResponse> modificar(
            @PathVariable String cuil,
            @Valid @RequestBody ModificarCiudadanoRequest request
    ) {

        CiudadanoResponse response =
                modificarCiudadanoGestor.modificar(cuil, request);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{cuil}")
    @PreAuthorize("@cuentaPropia.permite(authentication, #cuil)")
    public ResponseEntity<CiudadanoResponse> consultar(
            @PathVariable String cuil
    ) {

        CiudadanoResponse response =
                consultarCiudadanoGestor.consultar(cuil);

        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{cuil}/baja")
    @PreAuthorize("@cuentaPropia.permite(authentication, #cuil)")
    public ResponseEntity<CiudadanoResponse> darDeBaja(
            @PathVariable String cuil
    ) {

        CiudadanoResponse response =
                registrarBajaCiudadanoGestor.darDeBaja(cuil);

        return ResponseEntity.ok(response);
    }
}

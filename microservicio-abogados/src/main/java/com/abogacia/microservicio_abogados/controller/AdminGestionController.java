package com.abogacia.microservicio_abogados.controller;

import com.abogacia.microservicio_abogados.gestor.AdministrarCuentaGestor;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/abogados")
@Profile("!admin-readonly-test & !abogados-dev")
public class AdminGestionController {
    private final AdministrarCuentaGestor cuentas;
    public AdminGestionController(AdministrarCuentaGestor cuentas) { this.cuentas = cuentas; }
    public record Confirmacion(@NotNull Boolean confirmacion) {}
    @PostMapping("/{id}/suspender")
    public ResponseEntity<AdministrarCuentaGestor.Resultado> suspender(@PathVariable Long id, @Valid @RequestBody Confirmacion request) {
        return cambiar(id, request, true);
    }
    @PostMapping("/{id}/rehabilitar")
    public ResponseEntity<AdministrarCuentaGestor.Resultado> rehabilitar(@PathVariable Long id, @Valid @RequestBody Confirmacion request) {
        return cambiar(id, request, false);
    }
    private ResponseEntity<AdministrarCuentaGestor.Resultado> cambiar(Long id, Confirmacion request, boolean suspender) {
        if (!Boolean.TRUE.equals(request.confirmacion())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Confirmá la operación.");
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(cuentas.cambiar(id, suspender));
    }
}

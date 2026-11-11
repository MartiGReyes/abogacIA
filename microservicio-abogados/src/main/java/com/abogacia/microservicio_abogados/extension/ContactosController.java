package com.abogacia.microservicio_abogados.extension;

import com.abogacia.microservicio_abogados.repository.AbogadoRepository;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** "Mis consultas" del ciudadano y contactos recibidos por el abogado. */
@RestController
public class ContactosController {
    private final ContactoRegistro registro;
    private final AbogadoRepository abogados;

    public ContactosController(ContactoRegistro registro, AbogadoRepository abogados) {
        this.registro = registro;
        this.abogados = abogados;
    }

    static long titular(Jwt jwt, String rol) {
        if (jwt == null || !rol.equals(jwt.getClaimAsString("rol"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        try { return Long.parseLong(jwt.getSubject()); }
        catch (RuntimeException e) { throw new ResponseStatusException(HttpStatus.FORBIDDEN); }
    }

    @GetMapping("/api/abogados/contactos/mios")
    public ResponseEntity<List<Map<String, Object>>> mios(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(registro.delCiudadano(titular(jwt, "CIUDADANO")));
    }

    @GetMapping("/api/abogados/me/contactos")
    public ResponseEntity<List<Map<String, Object>>> recibidos(@AuthenticationPrincipal Jwt jwt) {
        long id = titular(jwt, "ABOGADO");
        abogados.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuenta no encontrada."));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(registro.delAbogado(id));
    }
}

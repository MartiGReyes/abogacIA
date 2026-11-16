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
    public ResponseEntity<List<Map<String, Object>>> mios(@AuthenticationPrincipal Jwt jwt, @RequestParam(required=false) String estado) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(registro.listar(titular(jwt, "CIUDADANO"),true,estado));
    }

    @GetMapping("/api/abogados/me/contactos")
    public ResponseEntity<List<Map<String, Object>>> recibidos(@AuthenticationPrincipal Jwt jwt, @RequestParam(required=false) String estado) {
        long id = titular(jwt, "ABOGADO");
        abogados.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuenta no encontrada."));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(registro.listar(id,false,estado));
    }
    @GetMapping("/api/abogados/contactos/mios/{id}")
    public Map<String,Object> detalleCiudadano(@AuthenticationPrincipal Jwt jwt,@PathVariable long id){return registro.detalle(id,titular(jwt,"CIUDADANO"),true);}
    @GetMapping("/api/abogados/me/contactos/{id}")
    public Map<String,Object> detalleAbogado(@AuthenticationPrincipal Jwt jwt,@PathVariable long id){return registro.detalle(id,titular(jwt,"ABOGADO"),false);}
    public record Cambio(String estado,String estadoActual){}
    @PatchMapping("/api/abogados/me/contactos/{id}/estado")
    public Map<String,Object> cambiar(@AuthenticationPrincipal Jwt jwt,@PathVariable long id,@RequestBody Cambio body){
        if(body==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Indicá el estado.");
        return registro.cambiar(id,titular(jwt,"ABOGADO"),body.estado(),body.estadoActual());
    }
}

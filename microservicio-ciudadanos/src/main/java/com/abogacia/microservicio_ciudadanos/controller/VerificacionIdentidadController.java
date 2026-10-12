package com.abogacia.microservicio_ciudadanos.controller;

import com.abogacia.microservicio_ciudadanos.didit.DiditConfig;
import com.abogacia.microservicio_ciudadanos.gestor.VerificacionIdentidadGestor;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.*;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/ciudadanos/verificacion")
public class VerificacionIdentidadController {
    private final VerificacionIdentidadGestor gestor;
    private final Map<String,List<Instant>> intentos=new HashMap<>();
    public VerificacionIdentidadController(VerificacionIdentidadGestor gestor){this.gestor=gestor;}
    public record AccesoRequest(@NotBlank @Email @Size(max=254) String mail,@NotBlank @Size(max=72) String contrasena){
        @Override public String toString(){return "AccesoRequest[datos omitidos]";}
    }
    public record ConsentimientoRequest(@AssertTrue boolean consentimiento,@NotBlank @Size(max=100) String avisoVersion) {}
    @GetMapping("/aviso") public DiditConfig.Aviso aviso(){return gestor.aviso();}
    @PostMapping("/cerrar") public Map<String,Boolean> cerrar(@RequestHeader(value="X-Registro-Token",required=false) String token){gestor.cerrar(token);return Map.of("cerrado",true);}
    @PostMapping("/acceso") public VerificacionIdentidadGestor.Acceso acceso(@Valid @RequestBody AccesoRequest r,HttpServletRequest request){
        limitar("ip:"+request.getRemoteAddr());
        limitar("mail:"+VerificacionIdentidadGestor.hash(r.mail().trim().toLowerCase(Locale.ROOT)));
        return gestor.acceso(r.mail(),r.contrasena());
    }
    @PostMapping("/sesion") public VerificacionIdentidadGestor.Estado sesion(
            @RequestHeader(value="X-Registro-Token",required=false) String token,@Valid @RequestBody ConsentimientoRequest r){
        return gestor.crear(token,r.consentimiento(),r.avisoVersion());
    }
    @GetMapping("/estado") public VerificacionIdentidadGestor.Estado estado(@RequestHeader(value="X-Registro-Token",required=false) String token){return gestor.estado(token,false);}
    @PostMapping("/consultar") public VerificacionIdentidadGestor.Estado consultar(@RequestHeader(value="X-Registro-Token",required=false) String token){return gestor.estado(token,true);}
    @ModelAttribute public void noCache(HttpServletRequest request,jakarta.servlet.http.HttpServletResponse response){
        response.setHeader("Cache-Control","no-store");response.setHeader("Referrer-Policy","no-referrer");
    }
    private synchronized void limitar(String key){
        Instant now=Instant.now();
        intentos.entrySet().removeIf(e->e.getValue().isEmpty() || e.getValue().getLast().plusSeconds(900).isBefore(now));
        if(intentos.size()>=10000 && !intentos.containsKey(key))throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Intentá nuevamente más tarde.");
        var lista=intentos.computeIfAbsent(key,k->new ArrayList<>());
        lista.removeIf(i->i.plusSeconds(900).isBefore(now));
        if(lista.size()>=10)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Intentá nuevamente más tarde.");
        lista.add(now);
    }
}

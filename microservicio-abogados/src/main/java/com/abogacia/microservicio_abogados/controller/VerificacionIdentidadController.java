package com.abogacia.microservicio_abogados.controller;

import com.abogacia.microservicio_abogados.didit.DiditConfig;
import com.abogacia.microservicio_abogados.dto.*;
import com.abogacia.microservicio_abogados.gestor.RegistrarAbogadoGestor;
import com.abogacia.microservicio_abogados.gestor.VerificacionIdentidadGestor;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.*;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/abogados/verificacion")
public class VerificacionIdentidadController {
    private final VerificacionIdentidadGestor gestor;
    private final RegistrarAbogadoGestor registro;
    private final Map<String,List<Instant>> intentos=new HashMap<>();
    public VerificacionIdentidadController(VerificacionIdentidadGestor gestor,RegistrarAbogadoGestor registro){this.gestor=gestor;this.registro=registro;}
    public record ConsentimientoRequest(@AssertTrue boolean consentimiento,@NotBlank @Size(max=100) String avisoVersion) {}
    @GetMapping("/aviso") public DiditConfig.Aviso aviso(){return gestor.aviso();}
    @PostMapping("/cerrar") public Map<String,Boolean> cerrar(@RequestHeader(value="X-Registro-Token",required=false) String token){gestor.cerrar(token);return Map.of("cerrado",true);}
    /** Paso 1: inicia la solicitud y entrega el token temporal para Didit y para completar la cuenta. */
    @PostMapping("/solicitud") @ResponseStatus(HttpStatus.CREATED)
    public RegistrarAbogadoGestor.Acceso solicitud(@Valid @RequestBody IniciarSolicitudRequest r,HttpServletRequest request){
        // Starting a request reveals no secret, so the limit only guards against bulk creation from one address.
        limitar("ip:"+request.getRemoteAddr());
        return registro.iniciar(r);
    }
    /** Paso 4: con la identidad aprobada, crea la cuenta y envía el código de confirmación del correo. */
    @PostMapping("/cuenta") @ResponseStatus(HttpStatus.CREATED)
    public AbogadoResponse cuenta(@RequestHeader(value="X-Registro-Token",required=false) String token,@Valid @RequestBody CompletarRegistroRequest r){
        return registro.completar(gestor.titular(token),token,r);
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

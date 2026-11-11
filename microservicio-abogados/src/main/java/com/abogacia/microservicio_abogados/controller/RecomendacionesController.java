package com.abogacia.microservicio_abogados.controller;


import com.abogacia.microservicio_abogados.gestor.RecomendarAbogadosGestor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.*;


@RestController
@RequestMapping("/api/abogados/recomendaciones")
public class RecomendacionesController {
    @org.springframework.beans.factory.annotation.Autowired(required=false)
    private com.abogacia.microservicio_abogados.operativa.CuentaPruebaService local;
    private final RecomendarAbogadosGestor gestor;
    public RecomendacionesController(RecomendarAbogadosGestor gestor) { this.gestor = gestor; }
    @GetMapping
    public ResponseEntity<?> recomendar(@RequestParam(required = false) String especialidad,jakarta.servlet.http.HttpServletRequest request) {
        if (especialidad != null && especialidad.length() > 100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Especialidad demasiado extensa.");
        var lista=new java.util.ArrayList<Object>(gestor.recomendar(especialidad));
        if(local!=null){com.abogacia.microservicio_abogados.operativa.PerfilLocalController.origen(request,false);lista.addAll(local.listar(especialidad));}
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(lista);
    }
}

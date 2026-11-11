package com.abogacia.microservicio_abogados.controller;
import com.abogacia.microservicio_abogados.gestor.RecomendarAbogadosGestor;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
@RestController
public class CatalogoAbogadosController {
    @org.springframework.beans.factory.annotation.Autowired(required=false)
    private com.abogacia.microservicio_abogados.operativa.CuentaPruebaService local;
    private final RecomendarAbogadosGestor gestor;
    public CatalogoAbogadosController(RecomendarAbogadosGestor gestor){this.gestor=gestor;}
    @GetMapping("/api/abogados/catalogo") public ResponseEntity<?> catalogo(jakarta.servlet.http.HttpServletRequest request){
        var lista=new java.util.ArrayList<Object>(gestor.catalogo());
        // The local runtime can show its explicitly labelled test accounts to visitors;
        // contact preparation still requires an authenticated citizen. This bean cannot exist in production.
        if(local!=null){com.abogacia.microservicio_abogados.operativa.PerfilLocalController.origen(request,false);lista.addAll(local.listar(null));}
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(lista);
    }
}

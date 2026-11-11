package com.abogacia.microservicio_abogados.dashboard;

import com.abogacia.microservicio_abogados.repository.AbogadoRepository;
import java.time.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/abogados/me/dashboard")
public class DashboardController {
    @org.springframework.beans.factory.annotation.Autowired(required=false) private com.abogacia.microservicio_abogados.operativa.CuentaPruebaService pruebas;
    private final AbogadoRepository abogados;
    private final DashboardRepository datos;
    public DashboardController(AbogadoRepository abogados, DashboardRepository datos) {
        this.abogados = abogados; this.datos = datos;
    }
    long titular(Jwt jwt) {
        if (jwt == null || !"ABOGADO".equals(jwt.getClaimAsString("rol"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        long id;
        try { id = Long.parseLong(jwt.getSubject()); }
        catch (RuntimeException ex) { throw new ResponseStatusException(HttpStatus.FORBIDDEN); }
        var abogado = abogados.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
        if (abogado.esSolicitud() || abogado.getEstado() == null || !"REGISTRADO".equals(abogado.getEstado().getNombreEstado()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if(com.abogacia.microservicio_abogados.operativa.CuentaPruebaService.marcada(abogado) && (pruebas==null || !pruebas.cuenta(abogado)))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return id;
    }
    @GetMapping({"/resumen", "/solicitudes", "/asesoramientos", "/por-area", "/por-periodo", "/valoraciones", "/ingresos/mensuales", "/ingresos/por-asesoramiento"})
    public ResponseEntity<?> consultar(@AuthenticationPrincipal Jwt jwt, jakarta.servlet.http.HttpServletRequest request,
            @RequestParam Map<String,String> filtros) {
        long id = titular(jwt);
        var filtro = DashboardRepository.Filtro.parse(filtros);
        String recurso = request.getRequestURI().substring(request.getRequestURI().indexOf("/dashboard/") + 11);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(datos.consultar(id, recurso, filtro));
    }
    @GetMapping({"/asesoramientos/{id}", "/asesoramientos/{id}/pagos"})
    public ResponseEntity<?> detalle(@AuthenticationPrincipal Jwt jwt, @PathVariable long id,
            @RequestParam Map<String,String> filtros, jakarta.servlet.http.HttpServletRequest request) {
        long abogado = titular(jwt);
        var filtro = DashboardRepository.Filtro.parse(filtros);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(
            datos.detalle(abogado, id, filtro, request.getRequestURI().endsWith("/pagos")));
    }
}

package com.abogacia.microservicio_abogados.foto;

import com.abogacia.microservicio_abogados.repository.AbogadoRepository;
import com.abogacia.microservicio_abogados.contacto.ProfesionalContactable;
import com.abogacia.microservicio_abogados.operativa.CuentaPruebaService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class FotoPerfilController {
    private final FotoPerfilStore fotos;
    private final AbogadoRepository abogados;
    private final ProfesionalContactable publicos;
    public FotoPerfilController(FotoPerfilStore fotos, AbogadoRepository abogados, ProfesionalContactable publicos) {this.fotos=fotos;this.abogados=abogados;this.publicos=publicos;}
    private long titular(Jwt jwt) {
        if(jwt==null || !"ABOGADO".equals(jwt.getClaimAsString("rol")))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        long id;try{id=Long.parseLong(jwt.getSubject());}catch(RuntimeException e){throw new ResponseStatusException(HttpStatus.FORBIDDEN);}
        var a=abogados.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.FORBIDDEN));
        if(a.esSolicitud() || a.getEstado()==null || !"REGISTRADO".equals(a.getEstado().getNombreEstado()) || CuentaPruebaService.marcada(a))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return id;
    }
    private ResponseEntity<byte[]> imagen(long id) {return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").header("Content-Security-Policy","default-src 'none'").body(fotos.leer(id));}
    @GetMapping("/api/abogados/me/foto") public ResponseEntity<byte[]> propia(@AuthenticationPrincipal Jwt jwt) {return imagen(titular(jwt));}
    @PutMapping(value="/api/abogados/me/foto",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> subir(@AuthenticationPrincipal Jwt jwt,@RequestParam("foto") MultipartFile foto) {fotos.guardar(titular(jwt),foto);return ResponseEntity.noContent().build();}
    @DeleteMapping("/api/abogados/me/foto") public ResponseEntity<Void> eliminar(@AuthenticationPrincipal Jwt jwt) {fotos.eliminar(titular(jwt));return ResponseEntity.noContent().build();}
    @GetMapping("/api/abogados/catalogo/{id}/foto") public ResponseEntity<byte[]> publica(@PathVariable long id) {
        var a=abogados.findById(id).orElse(null);
        if(!publicos.habilitado(a))throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return imagen(id);
    }
}

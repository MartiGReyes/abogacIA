package com.abogacia.microservicio_abogados.extension;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class ValoracionesController {
    public record Valoracion(Integer puntuacion,String comentario){}
    private final JdbcTemplate jdbc;private final ContactoRegistro contactos;
    public ValoracionesController(JdbcTemplate j,ContactoRegistro c){jdbc=j;contactos=c;}
    @PostMapping("/api/abogados/contactos/mios/{id}/valoracion") @Transactional
    public ResponseEntity<?> crear(@AuthenticationPrincipal Jwt jwt,@PathVariable long id,@RequestBody Valoracion body){
        long ciudadano=ContactosController.titular(jwt,"CIUDADANO");contactos.detalle(id,ciudadano,true);String comentario=validar(body);
        try{jdbc.update("insert into valoracion_contacto(id_contacto,puntuacion,comentario) values(?,?,?)",id,body.puntuacion(),comentario);}
        catch(DuplicateKeyException ex){throw new ResponseStatusException(HttpStatus.CONFLICT,"Ya valoraste esta solicitud. Podés editar tu valoración.");}
        return ResponseEntity.status(HttpStatus.CREATED).body(contactos.detalle(id,ciudadano,true).get("valoracion"));
    }
    @PutMapping("/api/abogados/contactos/mios/{id}/valoracion") @Transactional
    public Object editar(@AuthenticationPrincipal Jwt jwt,@PathVariable long id,@RequestBody Valoracion body){
        long ciudadano=ContactosController.titular(jwt,"CIUDADANO");contactos.detalle(id,ciudadano,true);String comentario=validar(body);
        if(jdbc.update("update valoracion_contacto set puntuacion=?,comentario=?,actualizado_en=CURRENT_TIMESTAMP where id_contacto=?",body.puntuacion(),comentario,id)!=1)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"La valoración todavía no existe.");
        return contactos.detalle(id,ciudadano,true).get("valoracion");
    }
    private String validar(Valoracion v){
        if(v==null||v.puntuacion()==null||v.puntuacion()<1||v.puntuacion()>5)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Elegí una puntuación de 1 a 5 estrellas.");
        return ModeracionComentario.validar(v.comentario());
    }
    @GetMapping("/api/abogados/catalogo/{id}/valoraciones")
    public ResponseEntity<?> publicas(@PathVariable long id,@RequestParam(defaultValue="recientes") String orden){return listar(id,orden);}
    @GetMapping("/api/abogados/me/valoraciones")
    public ResponseEntity<?> propias(@AuthenticationPrincipal Jwt jwt,@RequestParam(defaultValue="recientes") String orden){return listar(ContactosController.titular(jwt,"ABOGADO"),orden);}
    private ResponseEntity<?> listar(long abogado,String orden){
        if(!Set.of("recientes","antiguas").contains(orden))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Orden no válido.");
        if(jdbc.queryForObject("select count(*) from abogados_registrados where id_abogado=?",Long.class,abogado)!=1)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Abogado no encontrado.");
        Map<String,Object> total=jdbc.queryForMap("select count(*) cantidad,coalesce(round(avg(v.puntuacion),2),0) promedio from valoracion_contacto v join contacto_whatsapp c on c.id=v.id_contacto where c.id_abogado=?",abogado);
        List<Map<String,Object>> rows=jdbc.query("select v.puntuacion,v.comentario,v.creado_en,v.actualizado_en from valoracion_contacto v join contacto_whatsapp c on c.id=v.id_contacto where c.id_abogado=? order by v.creado_en "+("antiguas".equals(orden)?"asc":"desc")+",v.id_contacto "+("antiguas".equals(orden)?"asc":"desc"),(r,n)->Map.<String,Object>of("puntuacion",r.getInt(1),"comentario",r.getString(2),"creadoEn",r.getTimestamp(3).toInstant().toString(),"actualizadoEn",r.getTimestamp(4).toInstant().toString()),abogado);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("cantidad",total.get("cantidad"),"promedio",total.get("promedio"),"valoraciones",rows));
    }
}

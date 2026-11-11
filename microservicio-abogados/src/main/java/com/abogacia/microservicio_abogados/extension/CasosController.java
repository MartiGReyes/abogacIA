package com.abogacia.microservicio_abogados.extension;

import com.abogacia.microservicio_abogados.repository.AbogadoRepository;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.http.*;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** "Mis casos": experiencias anonimizadas que el abogado carga y decide publicar en su perfil. */
@RestController
public class CasosController {
    public record Caso(String titulo, String area, String descripcion, String situacion, String intervencion,
                       String resultado, String periodo, List<String> imagenes, boolean publicado, boolean consentimiento) {}

    private static final Pattern IMAGEN = Pattern.compile("^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$");
    private static final int MAX_IMAGEN = 1_500_000;
    private static final String COLUMNAS = "id,titulo,area,descripcion,situacion,intervencion,resultado,periodo,imagenes,publicado,consentimiento,actualizado_en";

    private final JdbcTemplate jdbc;
    private final AbogadoRepository abogados;
    private volatile boolean instalada;

    public CasosController(JdbcTemplate jdbc, AbogadoRepository abogados) {
        this.jdbc = jdbc;
        this.abogados = abogados;
    }

    private void disponible() {
        if (!instalada) instalada = Boolean.TRUE.equals(jdbc.execute((ConnectionCallback<Boolean>) c -> {
            try (var t = c.getMetaData().getTables(null, null, null, new String[]{"TABLE"})) {
                while (t.next()) if ("caso_profesional".equalsIgnoreCase(t.getString("TABLE_NAME"))) return true;
                return false;
            }
        }));
        if (!instalada) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Los casos profesionales no están disponibles en este entorno.");
    }

    private long abogado(Jwt jwt) {
        long id = ContactosController.titular(jwt, "ABOGADO");
        var a = abogados.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuenta no encontrada."));
        if (a.esSolicitud() || a.getEstado() == null || !"REGISTRADO".equals(a.getEstado().getNombreEstado()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cuenta no habilitada.");
        return id;
    }

    private static Map<String, Object> fila(ResultSet r, int n) throws SQLException {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getLong("id"));
        for (String c : List.of("titulo", "area", "descripcion", "situacion", "intervencion", "resultado", "periodo")) m.put(c, r.getString(c));
        String img = r.getString("imagenes");
        m.put("imagenes", img == null || img.isBlank() ? List.of() : List.of(img.split("\n")));
        m.put("publicado", r.getBoolean("publicado"));
        m.put("consentimiento", r.getBoolean("consentimiento"));
        var t = r.getTimestamp("actualizado_en");
        m.put("actualizadoEn", t == null ? null : t.toInstant().toString());
        return m;
    }

    private static String texto(String v, int max, String campo) {
        String s = v == null ? "" : v.trim();
        if (s.length() > max) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, campo + " supera los " + max + " caracteres.");
        return s;
    }

    private static Caso validar(Caso c) {
        if (c == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Completá el caso.");
        String titulo = texto(c.titulo(), 120, "El título");
        if (titulo.length() < 5) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ingresá un título de al menos 5 caracteres.");
        String area = texto(c.area(), 100, "El área");
        if (area.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccioná el área jurídica.");
        String descripcion = texto(c.descripcion(), 4000, "La descripción"), situacion = texto(c.situacion(), 4000, "La situación"),
            intervencion = texto(c.intervencion(), 4000, "La intervención"), resultado = texto(c.resultado(), 4000, "El resultado"),
            periodo = texto(c.periodo(), 100, "El período");
        List<String> imagenes = c.imagenes() == null ? List.of() : c.imagenes();
        if (imagenes.size() > 4 || imagenes.stream().anyMatch(i -> i == null || i.length() > MAX_IMAGEN || !IMAGEN.matcher(i).matches()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usá hasta 4 imágenes JPG, PNG o WEBP de tamaño moderado.");
        if (c.publicado()) {
            if (descripcion.length() < 20 || situacion.length() < 20 || intervencion.length() < 20)
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Para publicar, completá descripción, situación e intervención con al menos 20 caracteres.");
            if (!c.consentimiento())
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Confirmá la anonimización y los permisos antes de publicar.");
        }
        return new Caso(titulo, area, descripcion, situacion, intervencion, resultado, periodo, imagenes, c.publicado(), c.consentimiento());
    }

    private Map<String, Object> uno(long id, long abogado) {
        return jdbc.query("select " + COLUMNAS + " from caso_profesional where id=? and id_abogado=?", CasosController::fila, id, abogado)
            .stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Caso no encontrado."));
    }

    @GetMapping("/api/abogados/me/casos")
    public ResponseEntity<List<Map<String, Object>>> mios(@AuthenticationPrincipal Jwt jwt) {
        long id = abogado(jwt);
        disponible();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(jdbc.query("select " + COLUMNAS + " from caso_profesional where id_abogado=? order by actualizado_en desc, id desc", CasosController::fila, id));
    }

    @PostMapping("/api/abogados/me/casos")
    public ResponseEntity<Map<String, Object>> crear(@AuthenticationPrincipal Jwt jwt, @RequestBody Caso body) {
        long abogado = abogado(jwt);
        disponible();
        Caso c = validar(body);
        Long total = jdbc.queryForObject("select count(*) from caso_profesional where id_abogado=?", Long.class, abogado);
        if (total != null && total >= 50) throw new ResponseStatusException(HttpStatus.CONFLICT, "Alcanzaste el máximo de 50 casos.");
        Long id = jdbc.queryForObject("insert into caso_profesional(id_abogado,titulo,area,descripcion,situacion,intervencion,resultado,periodo,imagenes,publicado,consentimiento) values(?,?,?,?,?,?,?,?,?,?,?) returning id",
            Long.class, abogado, c.titulo(), c.area(), c.descripcion(), c.situacion(), c.intervencion(), c.resultado(), c.periodo(),
            String.join("\n", c.imagenes()), c.publicado(), c.consentimiento());
        return ResponseEntity.status(HttpStatus.CREATED).body(uno(id, abogado));
    }

    @PutMapping("/api/abogados/me/casos/{id}")
    public Map<String, Object> modificar(@AuthenticationPrincipal Jwt jwt, @PathVariable long id, @RequestBody Caso body) {
        long abogado = abogado(jwt);
        disponible();
        Caso c = validar(body);
        int n = jdbc.update("update caso_profesional set titulo=?,area=?,descripcion=?,situacion=?,intervencion=?,resultado=?,periodo=?,imagenes=?,publicado=?,consentimiento=?,actualizado_en=CURRENT_TIMESTAMP where id=? and id_abogado=?",
            c.titulo(), c.area(), c.descripcion(), c.situacion(), c.intervencion(), c.resultado(), c.periodo(),
            String.join("\n", c.imagenes()), c.publicado(), c.consentimiento(), id, abogado);
        if (n == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Caso no encontrado.");
        return uno(id, abogado);
    }

    @DeleteMapping("/api/abogados/me/casos/{id}")
    public Map<String, Boolean> eliminar(@AuthenticationPrincipal Jwt jwt, @PathVariable long id) {
        long abogado = abogado(jwt);
        disponible();
        if (jdbc.update("delete from caso_profesional where id=? and id_abogado=?", id, abogado) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Caso no encontrado.");
        return Map.of("eliminado", true);
    }

    /** Público: solo casos publicados de cuentas profesionales habilitadas. */
    @GetMapping("/api/abogados/catalogo/{id}/casos")
    public ResponseEntity<List<Map<String, Object>>> publicos(@PathVariable long id) {
        var a = abogados.findById(id).orElse(null);
        if (a == null || a.esSolicitud() || a.getEstado() == null || !"REGISTRADO".equals(a.getEstado().getNombreEstado()))
            return ResponseEntity.ok(List.of());
        disponible();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(jdbc.query("select " + COLUMNAS + " from caso_profesional where id_abogado=? and publicado order by actualizado_en desc, id desc", CasosController::fila, id));
    }
}

package com.abogacia.microservicio_ciudadanos.controller;

import com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.http.*;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * Historial de consultas con Lexi del ciudadano autenticado.
 * La tabla solo se crea en el entorno principal (ddl-auto=update); los entornos aislados no se modifican.
 */
@RestController
@RequestMapping("/api/ciudadanos/me/consultas-lexi")
public class ConsultasLexiController implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(ConsultasLexiController.class);
    public record Consulta(String consulta, String respuesta, String especialidad) {}

    private final JdbcTemplate jdbc;
    private final CiudadanoRepository ciudadanos;
    private final String ddl;
    private volatile boolean instalada;

    public ConsultasLexiController(JdbcTemplate jdbc, CiudadanoRepository ciudadanos,
                                   @Value("${spring.jpa.hibernate.ddl-auto:none}") String ddl) {
        this.jdbc = jdbc;
        this.ciudadanos = ciudadanos;
        this.ddl = ddl;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!"update".equalsIgnoreCase(ddl)) return;
        try {
            jdbc.execute("""
                CREATE TABLE IF NOT EXISTS consulta_lexi (
                    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    id_ciudadano bigint NOT NULL,
                    consulta varchar(2000) NOT NULL,
                    respuesta text NOT NULL,
                    especialidad varchar(100),
                    creada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP)""");
            jdbc.execute("CREATE INDEX IF NOT EXISTS ix_consulta_lexi_ciudadano ON consulta_lexi(id_ciudadano, creada_en)");
        } catch (RuntimeException e) {
            log.warn("No se pudo preparar el historial de Lexi: {}", e.getMessage());
        }
    }

    private void disponible() {
        if (!instalada) instalada = Boolean.TRUE.equals(jdbc.execute((ConnectionCallback<Boolean>) c -> {
            try (var t = c.getMetaData().getTables(null, null, null, new String[]{"TABLE"})) {
                while (t.next()) if ("consulta_lexi".equalsIgnoreCase(t.getString("TABLE_NAME"))) return true;
                return false;
            }
        }));
        if (!instalada) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "El historial no está disponible en este entorno.");
    }

    private long titular(Jwt jwt) {
        if (jwt == null || !"CIUDADANO".equals(jwt.getClaimAsString("rol"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        long id;
        try { id = Long.parseLong(jwt.getSubject()); }
        catch (RuntimeException e) { throw new ResponseStatusException(HttpStatus.FORBIDDEN); }
        ciudadanos.findById(id).filter(c -> "REGISTRADO".equals(c.getEstado().getNombreEstado()))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
        disponible();
        return id;
    }

    private static Map<String, Object> fila(ResultSet r, int n) throws SQLException {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getLong("id"));
        m.put("consulta", r.getString("consulta"));
        m.put("respuesta", r.getString("respuesta"));
        m.put("especialidad", r.getString("especialidad"));
        var t = r.getTimestamp("creada_en");
        m.put("creadaEn", t == null ? null : t.toInstant().toString());
        return m;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listar(@AuthenticationPrincipal Jwt jwt) {
        long id = titular(jwt);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(jdbc.query(
            "select id,consulta,respuesta,especialidad,creada_en from consulta_lexi where id_ciudadano=? order by creada_en desc, id desc limit 300",
            ConsultasLexiController::fila, id));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> guardar(@AuthenticationPrincipal Jwt jwt, @RequestBody Consulta body) {
        long id = titular(jwt);
        String consulta = body == null || body.consulta() == null ? "" : body.consulta().trim();
        String respuesta = body == null || body.respuesta() == null ? "" : body.respuesta().trim();
        String especialidad = body == null || body.especialidad() == null || body.especialidad().isBlank() ? null : body.especialidad().trim();
        if (consulta.isEmpty() || consulta.length() > 2000 || respuesta.isEmpty() || respuesta.length() > 20000
                || (especialidad != null && especialidad.length() > 100))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Consulta inválida.");
        Long nuevo = jdbc.queryForObject("insert into consulta_lexi(id_ciudadano,consulta,respuesta,especialidad) values(?,?,?,?) returning id",
            Long.class, id, consulta, respuesta, especialidad);
        return ResponseEntity.status(HttpStatus.CREATED).body(jdbc.query(
            "select id,consulta,respuesta,especialidad,creada_en from consulta_lexi where id=?", ConsultasLexiController::fila, nuevo).get(0));
    }

    @DeleteMapping("/{consulta}")
    public Map<String, Boolean> eliminar(@AuthenticationPrincipal Jwt jwt, @PathVariable long consulta) {
        long id = titular(jwt);
        if (jdbc.update("delete from consulta_lexi where id=? and id_ciudadano=?", consulta, id) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Consulta no encontrada.");
        return Map.of("eliminada", true);
    }
}

package com.abogacia.microservicio_abogados.gestor;

import com.abogacia.microservicio_abogados.dto.AbogadoPublico;
import java.util.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Not a professional account, not a JPA entity, and never registered in the production context. */
@Component
@Profile("abogados-dev")
@ConditionalOnProperty(name = "ABOGADOS_DEV_FIXTURES_ENABLED", havingValue = "true")
public class RecomendacionesPrueba {
    private final JdbcTemplate jdbc;
    public RecomendacionesPrueba(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        var identity = jdbc.queryForMap("select current_database() as database_name, current_user as user_name");
        if (!"abogacia_abogados_dev".equals(identity.get("database_name"))
            || !"abogados_dev".equals(identity.get("user_name")))
            throw new IllegalStateException("La conexión no pertenece a la base y usuario de desarrollo aislados.");
    }
    public List<AbogadoPublico> recomendar(String especialidad) {
        String filtro = especialidad == null || especialidad.isBlank() ? null : RecomendarAbogadosGestor.normalizar(especialidad);
        return jdbc.query("""
            select id, nombre, apellido, especialidades, ubicacion, provincia, descripcion_profesional
            from abogacia_dev.perfiles_prueba
            where perfil_prueba = true and estado = 'FICTICIO_NO_HABILITADO'
            order by fixture_id limit 12
            """, (rs, row) -> {
                var array = rs.getArray("especialidades");
                List<String> especialidades;
                try { especialidades = Arrays.stream((String[]) array.getArray()).sorted().toList(); }
                finally { array.free(); }
                return new AbogadoPublico(-rs.getLong("id"), rs.getString("nombre"), rs.getString("apellido"),
                    especialidades, rs.getString("ubicacion"), rs.getString("provincia"),
                    rs.getString("descripcion_profesional"), null, null, null, null, null, false, true);
            }).stream().filter(a -> filtro == null || a.especialidades().stream()
                .anyMatch(e -> RecomendarAbogadosGestor.normalizar(e).equals(filtro))).toList();
    }
}

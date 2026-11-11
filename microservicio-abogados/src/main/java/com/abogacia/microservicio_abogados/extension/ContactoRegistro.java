package com.abogacia.microservicio_abogados.extension;

import java.sql.Timestamp;
import java.util.*;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Copia de los formularios de contacto que el ciudadano confirmó antes de abrir WhatsApp. */
@Repository
public class ContactoRegistro {
    private final JdbcTemplate jdbc;
    private volatile boolean instalada;

    public ContactoRegistro(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public boolean disponible() {
        if (instalada) return true;
        instalada = Boolean.TRUE.equals(jdbc.execute((ConnectionCallback<Boolean>) c -> {
            try (var t = c.getMetaData().getTables(null, null, null, new String[]{"TABLE"})) {
                while (t.next()) if ("contacto_whatsapp".equalsIgnoreCase(t.getString("TABLE_NAME"))) return true;
                return false;
            }
        }));
        return instalada;
    }

    public void guardar(long ciudadano, long abogado, String nombreAbogado, Collection<String> especialidades,
                        String nombre, String telefono, String resumen) {
        if (!disponible()) return;
        jdbc.update("insert into contacto_whatsapp(id_ciudadano,id_abogado,abogado,especialidades,nombre,telefono,resumen) values(?,?,?,?,?,?,?)",
            ciudadano, abogado, recortar(nombreAbogado, 220), recortar(String.join(" · ", especialidades), 500), nombre, telefono, resumen);
    }

    private static String recortar(String s, int max) { return s == null ? "" : s.length() > max ? s.substring(0, max) : s; }

    public List<Map<String, Object>> delCiudadano(long ciudadano) {
        if (!disponible()) return List.of();
        return jdbc.query("select id,id_abogado,abogado,especialidades,nombre,telefono,resumen,creado_en from contacto_whatsapp where id_ciudadano=? order by creado_en desc, id desc limit 200",
            (r, n) -> fila(r, true), ciudadano);
    }

    public List<Map<String, Object>> delAbogado(long abogado) {
        if (!disponible()) return List.of();
        return jdbc.query("select id,id_abogado,abogado,especialidades,nombre,telefono,resumen,creado_en from contacto_whatsapp where id_abogado=? order by creado_en desc, id desc limit 500",
            (r, n) -> fila(r, false), abogado);
    }

    private static Map<String, Object> fila(java.sql.ResultSet r, boolean ciudadano) throws java.sql.SQLException {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getLong("id"));
        if (ciudadano) {
            m.put("idAbogado", r.getLong("id_abogado"));
            m.put("abogado", r.getString("abogado"));
            m.put("especialidades", r.getString("especialidades"));
        }
        m.put("nombre", r.getString("nombre"));
        m.put("telefono", r.getString("telefono"));
        m.put("resumen", r.getString("resumen"));
        Timestamp t = r.getTimestamp("creado_en");
        m.put("creadoEn", t == null ? null : t.toInstant().toString());
        return m;
    }
}

package com.abogacia.microservicio_abogados;

import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.constructor.SafeConstructor;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;

/** Parses sources without Docker, a database or credential generation. */
class AbogadosDevFilesTest {
    @SuppressWarnings("unchecked")
    Map<String, Object> map(Object value) { return (Map<String, Object>) value; }
    @Test void composeHasOnlyIsolatedServicesAndNoRealDataMounts() throws Exception {
        Map<String, Object> yaml = new Yaml(new SafeConstructor(new LoaderOptions()))
            .load(Files.readString(Path.of("../docker-compose.abogados-dev.yml")));
        assertEquals("abogacia-abogados-dev", yaml.get("name"));
        var services = map(yaml.get("services"));
        assertEquals(Set.of("postgres-abogados-dev", "abogados-dev", "frontend-abogados-dev"), services.keySet());
        var db = map(services.get("postgres-abogados-dev"));
        assertEquals("postgres:17", db.get("image")); assertNull(db.get("ports"));
        var env = map(db.get("environment"));
        assertEquals("abogacia_abogados_dev", env.get("POSTGRES_DB"));
        assertEquals("abogados_dev_owner", env.get("POSTGRES_USER"));
        assertEquals(List.of("abogados_dev_data:/var/lib/postgresql/data", "./docker/abogados-dev/init:/docker-entrypoint-initdb.d:ro"), db.get("volumes"));
        assertEquals(List.of("abogados-dev"), db.get("networks"));
        assertEquals(List.of("abogados-dev"), map(services.get("abogados-dev")).get("networks"));
        assertNull(map(services.get("abogados-dev")).get("ports"));
        var volumes = map(yaml.get("volumes"));
        assertEquals(Set.of("abogados_dev_data"), volumes.keySet());
        assertEquals("abogados_dev_data", map(volumes.get("abogados_dev_data")).get("name"));
        assertEquals(true, map(map(yaml.get("networks")).get("lexi-existente")).get("external"));
    }
    @Test void seedMatchesProfilesAndNeverWritesProfessionalAccounts() throws Exception {
        var json = JsonMapper.builder().build().readTree(Files.readString(Path.of("../scripts/dev/abogados-prueba.json")));
        String seed = Files.readString(Path.of("../docker/abogados-dev/init/20-fixtures.sql"));
        assertEquals(3, json.size());
        for (int i = 0; i < json.size(); i++) {
            var profile = json.get(i);
            for (String key : List.of("fixtureId", "nombre", "apellido", "ubicacion", "provincia", "descripcionProfesional"))
                assertTrue(seed.contains("'" + profile.get(key).asText() + "'"), "Missing " + key);
            var specialties = profile.get("especialidades");
            for (int j = 0; j < specialties.size(); j++) assertTrue(seed.contains("'" + specialties.get(j).asText() + "'"));
        }
        assertTrue(seed.contains("ON CONFLICT (fixture_id) DO NOTHING"));
        assertTrue(seed.contains("IS DISTINCT FROM"));
        assertTrue(seed.contains("current_database() <> 'abogacia_abogados_dev'"));
        assertFalse(seed.contains("abogados_registrados"));
        assertFalse(seed.toUpperCase().contains("UPDATE "));
    }
    @Test void frontendReusesProxyAndSqlGrantsOnlyReadAccess() throws Exception {
        String dockerfile = Files.readString(Path.of("../docker/abogados-dev/frontend.Dockerfile"));
        assertTrue(dockerfile.contains("ENV VITE_ABOGADOS_URL=/"));
        assertTrue(dockerfile.contains("COPY nginx.abogados-dev.conf /etc/nginx/conf.d/default.conf"));
        String schema = Files.readString(Path.of("../docker/abogados-dev/init/10-schema.sql"));
        assertTrue(schema.contains("GRANT SELECT ON ALL TABLES"));
        assertFalse(schema.contains("GRANT ALL"));
        assertTrue(schema.contains("CHECK (perfil_prueba)"));
        assertTrue(schema.contains("CHECK (estado = 'FICTICIO_NO_HABILITADO')"));
    }
}

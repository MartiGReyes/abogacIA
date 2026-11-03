package com.abogacia.microservicio_abogados;

import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.constructor.SafeConstructor;
import java.nio.file.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Parse preparation files only: no Docker, SQL, provisioning or connection. */
class AdminEntornoArchivosTest {
    @SuppressWarnings("unchecked")
    Map<String, Object> map(Object value) { return (Map<String, Object>) value; }

    @Test void composePublishesOnlyTheNewFrontendAndHasNoSharedNetworkOrVolume() throws Exception {
        var yaml = map(new Yaml(new SafeConstructor(new LoaderOptions())).load(Files.readString(Path.of("../docker-compose.admin-readonly.yml"))));
        assertEquals("abogacia-admin-readonly-test", yaml.get("name"));
        var services = map(yaml.get("services"));
        assertEquals(Set.of("postgres-admin-test", "ciudadanos-admin-test", "abogados-admin-test", "autenticacion-admin-test", "frontend-admin-test"), services.keySet());
        var networks = map(yaml.get("networks"));
        assertEquals(Set.of("ep06-private", "ep06-web"), networks.keySet());
        assertEquals(Map.of("internal", true), map(networks.get("ep06-private")));
        assertEquals(Map.of("driver", "bridge", "internal", false), map(networks.get("ep06-web")));
        for (var entry : services.entrySet()) {
            var service = map(entry.getValue());
            assertNull(service.get("env_file")); assertNull(service.get("container_name"));
            if (entry.getKey().equals("frontend-admin-test")) {
                assertEquals(List.of("ep06-private", "ep06-web"), service.get("networks"));
                assertEquals(List.of("127.0.0.1:5180:80"), service.get("ports"));
            } else {
                assertEquals(List.of("ep06-private"), service.get("networks"));
                assertNull(service.get("ports"));
            }
        }
        var db = map(services.get("postgres-admin-test"));
        assertEquals("postgres:17", db.get("image"));
        assertEquals(List.of("ep06_admin_test_data:/var/lib/postgresql/data", "./docker/admin-readonly/init:/docker-entrypoint-initdb.d:ro"), db.get("volumes"));
        assertEquals("ep06_test_control", map(db.get("environment")).get("POSTGRES_DB"));
        assertEquals(Set.of("ep06_admin_test_data"), map(yaml.get("volumes")).keySet());
        assertEquals("ep06_admin_readonly_test_data", map(map(yaml.get("volumes")).get("ep06_admin_test_data")).get("name"));
        for (String domain : List.of("ciudadanos", "abogados")) {
            var service = map(services.get(domain + "-admin-test"));
            assertNull(service.get("volumes"));
            var env = map(service.get("environment"));
            assertEquals("admin-gestion-test", env.get("SPRING_PROFILES_ACTIVE"));
            assertEquals("validate", env.get("SPRING_JPA_HIBERNATE_DDL_AUTO"));
            assertEquals("never", env.get("SPRING_SQL_INIT_MODE"));
            assertEquals("false", env.get("PADRON_IMPORTAR"));
            assertEquals("false", env.get("DIDIT_RECONCILIATION_ENABLED"));
            assertEquals("false", env.get("DIDIT_PRIVACY_READY"));
            assertEquals("false", env.get("ABOGADOS_DEV_FIXTURES_ENABLED"));
            assertEquals("", env.get("DIDIT_API_KEY")); assertEquals("", env.get("DIDIT_WORKFLOW_ID"));
            assertEquals("jdbc:postgresql://postgres-admin-test:5432/ep06_" + domain + "_test", env.get("DB_URL"));
            assertEquals("ep06_" + domain + "_reader", env.get("DB_USERNAME"));
        }
        var auth = map(map(services.get("autenticacion-admin-test")).get("environment"));
        assertEquals("http://ciudadanos-admin-test:8080", auth.get("CIUDADANOS_URL"));
        assertEquals("http://abogados-admin-test:8082", auth.get("ABOGADOS_URL"));
        assertEquals("admin.ep06@example.com", auth.get("ADMIN_MAIL"));
        assertTrue(auth.get("ADMIN_PASSWORD_HASH").toString().startsWith("${EP06_ADMIN_HASH"));
    }

    @Test void initGuardsDatabasesAndOnlyGrantsReadAccessToRuntimeUsers() throws Exception {
        String sql = Files.readString(Path.of("../docker/admin-readonly/init/01-schema-fixtures.sql"));
        for (String db : List.of("ep06_test_control", "ep06_ciudadanos_test", "ep06_abogados_test"))
            assertTrue(sql.contains("current_database() <> '" + db + "'"));
        assertTrue(sql.contains("current_user <> 'ep06_test_owner'"));
        assertTrue(sql.contains("generate_series(1, 18)")); assertTrue(sql.contains("generate_series(1, 45)"));
        assertTrue(sql.contains("@ep06.example.com"));
        assertTrue(sql.contains("default_transaction_read_only = on"));
        assertTrue(sql.contains("GRANT SELECT ON ALL TABLES"));
        assertFalse(sql.contains("GRANT ALL")); assertFalse(sql.contains("abogacia_dev.perfiles_prueba"));
        assertFalse(sql.contains("COPY ")); assertFalse(sql.contains("\\include"));
    }
}

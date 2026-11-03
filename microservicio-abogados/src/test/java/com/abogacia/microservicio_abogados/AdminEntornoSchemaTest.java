package com.abogacia.microservicio_abogados;

import com.abogacia.microservicio_abogados.entity.*;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.boot.model.naming.PhysicalNamingStrategySnakeCaseImpl;
import org.junit.jupiter.api.Test;
import java.nio.file.*;
import java.util.regex.Pattern;
import static org.junit.jupiter.api.Assertions.*;

/** Reads the prepared EP06 schema; does not connect to PostgreSQL or execute SQL. */
class AdminEntornoSchemaTest {
    @Test void explicitTestSchemaCoversAllMappedTablesColumnsAndTypesOffline() throws Exception {
        String full = Files.readString(Path.of("../docker/admin-readonly/init/01-schema-fixtures.sql")).toLowerCase();
        String sql = full.split(Pattern.quote("\\connect ep06_abogados_test ep06_test_owner"))[1];
        if (sql.contains("\\connect ")) sql = sql.substring(0, sql.indexOf("\\connect "));
        var registry = new StandardServiceRegistryBuilder()
            .applySetting("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect")
            .applySetting("hibernate.boot.allow_jdbc_metadata_access", false).build();
        try {
            var metadata = new MetadataSources(registry)
                .addAnnotatedClass(AbogadoRegistrado.class).addAnnotatedClass(Estado.class)
                .addAnnotatedClass(VerificacionIdentidad.class).addAnnotatedClass(Padron.class).addAnnotatedClass(PadronEvidencia.class)
                .getMetadataBuilder().applyPhysicalNamingStrategy(new PhysicalNamingStrategySnakeCaseImpl()).build();
            int count = 0;
            for (var namespace : metadata.getDatabase().getNamespaces()) {
                for (var table : namespace.getTables()) {
                    var matcher = Pattern.compile("create table public\\." + Pattern.quote(table.getName()) + "\\s*\\((.*?)\\n\\);", Pattern.DOTALL).matcher(sql);
                    assertTrue(matcher.find(), "Missing table " + table.getName());
                    for (var column : table.getColumns()) {
                        String type = column.getSqlType(metadata).toLowerCase();
                        assertTrue(Pattern.compile("\\b" + Pattern.quote(column.getName()) + "\\s+" + Pattern.quote(type)).matcher(matcher.group(1)).find(),
                            table.getName() + "." + column.getName() + " expected " + type);
                    }
                    count++;
                }
            }
            assertEquals(6, count);
        } finally { StandardServiceRegistryBuilder.destroy(registry); }
    }
}


package com.abogacia.microservicio_abogados;

import com.abogacia.microservicio_abogados.entity.*;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.boot.model.naming.PhysicalNamingStrategySnakeCaseImpl;
import org.junit.jupiter.api.Test;
import java.nio.file.*;
import java.util.regex.Pattern;
import static org.junit.jupiter.api.Assertions.*;

/** Compares the prepared SQL against ORM metadata offline. Does not connect or execute DDL. */
class AbogadosDevSchemaTest {
    @Test void baselineContainsAllMappedTablesColumnsAndTypes() throws Exception {
        String sql = Files.readString(Path.of("../docker/abogados-dev/init/10-schema.sql")).toLowerCase();
        var registry = new StandardServiceRegistryBuilder()
            .applySetting("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect")
            .applySetting("hibernate.boot.allow_jdbc_metadata_access", false).build();
        try {
            var metadata = new MetadataSources(registry)
                .addAnnotatedClass(AbogadoRegistrado.class).addAnnotatedClass(Estado.class)
                .addAnnotatedClass(Padron.class).addAnnotatedClass(PadronEvidencia.class)
                .addAnnotatedClass(VerificacionIdentidad.class).getMetadataBuilder()
                .applyPhysicalNamingStrategy(new PhysicalNamingStrategySnakeCaseImpl()).build();
            int count = 0;
            for (var namespace : metadata.getDatabase().getNamespaces()) {
                for (var table : namespace.getTables()) {
                    var matcher = Pattern.compile("create table public\\." + Pattern.quote(table.getName()) + "\\s*\\((.*?)\\n\\);", Pattern.DOTALL).matcher(sql);
                    assertTrue(matcher.find(), "Missing table " + table.getName());
                    String ddl = matcher.group(1);
                    for (var column : table.getColumns()) {
                        String type = column.getSqlType(metadata).toLowerCase();
                        assertTrue(Pattern.compile("\\b" + Pattern.quote(column.getName()) + "\\s+" + Pattern.quote(type)).matcher(ddl).find(),
                            table.getName() + "." + column.getName() + " expected " + type);
                    }
                    count++;
                }
            }
            assertEquals(6, count);
        } finally { StandardServiceRegistryBuilder.destroy(registry); }
    }
}

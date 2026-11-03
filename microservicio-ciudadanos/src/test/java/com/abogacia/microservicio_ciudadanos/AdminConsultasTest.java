package com.abogacia.microservicio_ciudadanos;

import com.abogacia.microservicio_ciudadanos.entity.*;
import com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.engine.jdbc.connections.spi.ConnectionProvider;
import org.springframework.data.jpa.repository.Query;
import org.junit.jupiter.api.Test;
import java.sql.Connection;
import static org.junit.jupiter.api.Assertions.*;

/** Compile repository HQL against entity mappings, with a provider that forbids all JDBC access. */
class AdminConsultasTest {
    public static class SinJdbc implements ConnectionProvider {
        public Connection getConnection() { return fail("No JDBC or SQL allowed in this test."); }
        public void closeConnection(Connection connection) { fail("No JDBC connection should exist."); }
        public boolean supportsAggressiveRelease() { return false; }
        public boolean isUnwrappableAs(Class<?> type) { return false; }
        public <T> T unwrap(Class<T> type) { throw new IllegalArgumentException("No connection provider unwrap."); }
    }
    @Test void validatesAdminQueriesWithoutConnectingOrExecutingSql() {
        var registry = new StandardServiceRegistryBuilder()
            .applySetting("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect")
            .applySetting("hibernate.boot.allow_jdbc_metadata_access", false)
            .applySetting("hibernate.hbm2ddl.auto", "none")
            .applySetting("hibernate.connection.provider_class", SinJdbc.class).build();
        try {
            var sources = new MetadataSources(registry)
                .addAnnotatedClass(Ciudadano.class).addAnnotatedClass(Estado.class)
                .addAnnotatedClass(VerificacionIdentidad.class);
            try (var factory = sources.buildMetadata().buildSessionFactory(); var session = factory.openSession()) {
                int count = 0;
                for (var method : CiudadanoRepository.class.getMethods()) {
                    if (!method.getName().endsWith("Admin")) continue;
                    var query = method.getAnnotation(Query.class);
                    if (query == null) continue;
                    assertDoesNotThrow(() -> session.createQuery(query.value(), Object.class));
                    count++;
                    if (!query.countQuery().isBlank()) {
                        assertDoesNotThrow(() -> session.createQuery(query.countQuery(), Long.class)); count++;
                    }
                }
                assertEquals(3, count);
            }
        } finally { StandardServiceRegistryBuilder.destroy(registry); }
    }
}


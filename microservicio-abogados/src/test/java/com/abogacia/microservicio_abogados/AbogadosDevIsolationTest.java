package com.abogacia.microservicio_abogados;

import com.abogacia.microservicio_abogados.config.AbogadosDevConfig;
import com.abogacia.microservicio_abogados.dto.AbogadoPublico;
import com.abogacia.microservicio_abogados.gestor.RecomendacionesPrueba;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.jdbc.core.*;
import org.springframework.mock.env.MockEnvironment;
import java.sql.ResultSet;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/** Pure environment/context and mocked JDBC tests. No database is created and no SQL is executed. */
class AbogadosDevIsolationTest {
    MockEnvironment valid() {
        var env = new MockEnvironment(); env.setActiveProfiles("abogados-dev");
        return env.withProperty("ABOGADOS_DEV_FIXTURES_ENABLED", "true")
            .withProperty("spring.datasource.url", "jdbc:postgresql://postgres-abogados-dev:5432/abogacia_abogados_dev")
            .withProperty("spring.datasource.username", "abogados_dev")
            .withProperty("spring.jpa.hibernate.ddl-auto", "validate")
            .withProperty("spring.sql.init.mode", "never")
            .withProperty("DIDIT_RECONCILIATION_ENABLED", "false");
    }
    @Test void acceptsOnlyIsolatedDevelopmentConfiguration() {
        assertDoesNotThrow(() -> AbogadosDevConfig.validar(valid()));
        assertDoesNotThrow(() -> AbogadosDevConfig.validar(new MockEnvironment()));
    }
    @ParameterizedTest @ValueSource(strings={"prod", "production", "didit-local-test"})
    void rejectsOtherOrMixedProfiles(String profile) {
        var env = valid(); env.setActiveProfiles(profile);
        assertThrows(IllegalStateException.class, () -> AbogadosDevConfig.validar(env));
        env.setActiveProfiles("abogados-dev", profile);
        assertThrows(IllegalStateException.class, () -> AbogadosDevConfig.validar(env));
    }
    @ParameterizedTest @ValueSource(strings={"spring.datasource.url", "spring.datasource.username", "spring.jpa.hibernate.ddl-auto", "spring.sql.init.mode"})
    void rejectsAnyDatabaseOrSchemaOverride(String property) {
        var env = valid().withProperty(property, "production-or-update");
        assertThrows(IllegalStateException.class, () -> AbogadosDevConfig.validar(env));
    }
    @ParameterizedTest @ValueSource(strings={"DIDIT_RECONCILIATION_ENABLED", "DIDIT_PRIVACY_READY", "abogados.padron.importar"})
    void rejectsActiveIdentityServicesAndPadronImport(String property) {
        assertThrows(IllegalStateException.class, () -> AbogadosDevConfig.validar(valid().withProperty(property, "true")));
    }
    @Test void noFixtureReaderInProductionEvenWhenFlagIsSet() {
        try (var ctx = new AnnotationConfigApplicationContext()) {
            ctx.setEnvironment(new MockEnvironment().withProperty("ABOGADOS_DEV_FIXTURES_ENABLED", "true"));
            ctx.register(RecomendacionesPrueba.class); ctx.refresh();
            assertTrue(ctx.getBeansOfType(RecomendacionesPrueba.class).isEmpty());
        }
    }
    @Test void disabledFixtureFlagDoesNotRegisterReaderInDevelopment() {
        try (var ctx = new AnnotationConfigApplicationContext()) {
            var env = valid().withProperty("ABOGADOS_DEV_FIXTURES_ENABLED", "false");
            ctx.setEnvironment(env); ctx.register(RecomendacionesPrueba.class); ctx.refresh();
            assertTrue(ctx.getBeansOfType(RecomendacionesPrueba.class).isEmpty());
        }
    }
    @Test void invalidEnvironmentStopsBeforeOtherBeansAreCreated() {
        try (var ctx = new AnnotationConfigApplicationContext()) {
            ctx.setEnvironment(valid().withProperty("spring.jpa.hibernate.ddl-auto", "update"));
            ctx.register(AbogadosDevConfig.class);
            ctx.registerBean("mustNotInitializeJpa", Object.class, () -> { fail("Guard must run before beans initialize"); return null; });
            assertThrows(Exception.class, ctx::refresh);
        }
    }
    @Test void rejectsActualDatabaseIdentityMismatch() {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForMap(anyString())).thenReturn(Map.of("database_name", "abogacia_abogados", "user_name", "abogados_dev"));
        assertThrows(IllegalStateException.class, () -> new RecomendacionesPrueba(jdbc));
        when(jdbc.queryForMap(anyString())).thenReturn(Map.of("database_name", "abogacia_abogados_dev", "user_name", "postgres"));
        assertThrows(IllegalStateException.class, () -> new RecomendacionesPrueba(jdbc));
    }
    @Test void readsOnlyFixtureTableWithExplicitBadgeAndNoProfessionalVerification() throws Exception {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForMap(anyString())).thenReturn(Map.of("database_name", "abogacia_abogados_dev", "user_name", "abogados_dev"));
        var rs = mock(ResultSet.class); var array = mock(java.sql.Array.class);
        when(rs.getLong("id")).thenReturn(1L);
        when(rs.getString("nombre")).thenReturn("Valentina");
        when(rs.getString("apellido")).thenReturn("Torres");
        when(rs.getArray("especialidades")).thenReturn(array);
        when(array.getArray()).thenReturn(new String[]{"Derecho Laboral"});
        when(jdbc.query(anyString(), org.mockito.ArgumentMatchers.<RowMapper<AbogadoPublico>>any())).thenAnswer(call -> {
            String sql = call.getArgument(0);
            assertTrue(sql.contains("abogacia_dev.perfiles_prueba"));
            assertFalse(sql.contains("abogados_registrados"));
            RowMapper<AbogadoPublico> mapper = call.getArgument(1);
            return List.of(mapper.mapRow(rs, 0));
        });
        var reader = new RecomendacionesPrueba(jdbc);
        var result = reader.recomendar("derecho laboral");
        assertEquals(1, result.size()); var profile = result.getFirst();
        assertTrue(profile.perfilPrueba()); assertFalse(profile.matriculaVerificada());
        assertEquals(-1L, profile.idAbogado()); assertNull(profile.nroMatricula());
        assertNull(profile.colegioProfesional()); assertNull(profile.mail()); assertNull(profile.nroCelular());
        assertTrue(reader.recomendar("Derecho Penal").isEmpty());
        assertEquals(1, reader.recomendar(null).size());
        verify(array, times(3)).free();
    }
}

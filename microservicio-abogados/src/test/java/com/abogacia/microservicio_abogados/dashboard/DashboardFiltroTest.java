package com.abogacia.microservicio_abogados.dashboard;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class DashboardFiltroTest {
    @Test void aceptaFiltrosValidos() {
        var f=DashboardRepository.Filtro.parse(Map.of("desde","2026-01-01","hasta","2026-01-31","mes","2026-01","orden","importe"));
        assertEquals(20,f.tamano());assertEquals("importe",f.orden());
    }
    @Test void rechazaRangosInvalidos() {
        for(var p:java.util.List.of(Map.of("desde","2026-02-30"),Map.of("desde","2026-12-01","hasta","2026-01-01"),Map.of("desde","2000-01-01"),Map.of("tamano","101"),Map.of("pagina","-1"),Map.of("orden","importe;drop table"),Map.of("moneda","ars")))
            assertThrows(org.springframework.web.server.ResponseStatusException.class,()->DashboardRepository.Filtro.parse(p));
    }
    @Test void limitesDeCalendarioArgentinoSonInclusivosSinPerderUltimoDia() {
        var f=DashboardRepository.Filtro.parse(Map.of("desde","2026-01-01","hasta","2026-01-31"));
        var p=f.params(1);
        assertEquals(java.time.Instant.parse("2026-01-01T03:00:00Z"),((java.sql.Timestamp)p.getValue("desde")).toInstant());
        assertEquals(java.time.Instant.parse("2026-02-01T03:00:00Z"),((java.sql.Timestamp)p.getValue("hasta")).toInstant());
    }
}

package com.abogacia.microservicio_abogados;

import com.abogacia.microservicio_abogados.entity.*;
import com.abogacia.microservicio_abogados.padron.*;
import com.abogacia.microservicio_abogados.repository.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import java.io.ByteArrayOutputStream;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Synthetic workbooks and a dedicated H2 database; no private Excel or PostgreSQL. */
@SpringBootTest
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:actualizar-padron-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1")
class ActualizarPadronTest {
    @Autowired ImportarPadron importar;
    @MockitoSpyBean PadronEvidenciaRepository evidencias;
    @Autowired PadronRepository padron;
    @Autowired AbogadoRepository abogados;
    @Autowired EstadoRepository estados;
    @Autowired ValidarMatricula validar;

    @BeforeEach void limpiar() {
        reset(evidencias);
        abogados.deleteAll(); evidencias.deleteAll(); padron.deleteAll();
    }
    static byte[] excel(String matricula) throws Exception {
        try (var libro = new XSSFWorkbook(); var out = new ByteArrayOutputStream()) {
            for (int i = 1; i <= 5; i++) libro.createSheet("Hoja" + i);
            var h1 = libro.getSheet("Hoja1"); var cab = h1.createRow(0);
            cab.createCell(0).setCellValue("Mat"); cab.createCell(1).setCellValue("Apellido y Nombre"); cab.createCell(2).setCellValue("DNI");
            var fila = h1.createRow(1); fila.createCell(0).setCellValue(matricula);
            fila.createCell(1).setCellValue("PRUEBA ANA"); fila.createCell(2).setCellValue("12345678");
            var h4 = libro.getSheet("Hoja4"); cab = h4.createRow(0);
            cab.createCell(1).setCellValue("MP"); cab.createCell(2).setCellValue("Apellido y Nombre");
            cab.createCell(4).setCellValue("Estado"); cab.createCell(6).setCellValue("DNI");
            fila = h4.createRow(1); fila.createCell(1).setCellValue(matricula); fila.createCell(2).setCellValue("PRUEBA ANA");
            fila.createCell(4).setCellValue("ACTIVA"); fila.createCell(6).setCellValue("12345678");
            libro.write(out); return out.toByteArray();
        }
    }
    @Test void replacementKeepsReferencedParentsAndUsesOnlyCurrentEvidence() throws Exception {
        padron.saveAndFlush(new Padron("10-999", "ACTIVO"));
        var cuenta = new AbogadoRegistrado(); cuenta.setDni("99999999"); cuenta.setMail("synthetic@example.com");
        cuenta.setPadron(padron.findById("10-999").orElseThrow()); abogados.saveAndFlush(cuenta);
        var result = importar.importar(excel("10-001"));
        assertEquals(2, result.filas()); assertEquals(1, result.matriculas()); assertEquals(1, result.retiradas());
        assertEquals("INACTIVO", padron.findById("10-999").orElseThrow().getEstado());
        assertEquals(1, abogados.count()); assertEquals(2, evidencias.count());
        assertEquals(ValidarMatricula.Resultado.VALIDADA, validar.validar("10-001", "12345678", ValidarMatricula.COLEGIO, "Córdoba"));
        importar.importar(excel("10-002"));
        assertTrue(evidencias.findByMatricula("10-001").isEmpty());
        assertEquals("INACTIVO", padron.findById("10-001").orElseThrow().getEstado());
        assertEquals(ValidarMatricula.Resultado.INEXISTENTE, validar.validar("10-001", "12345678", ValidarMatricula.COLEGIO, "Córdoba"));
    }
    @Test void invalidFileCannotReplaceCurrentEvidence() throws Exception {
        importar.importar(excel("10-001")); var versiones = evidencias.versionesActuales();
        assertThrows(Exception.class, () -> importar.importar(new byte[]{1,2,3}));
        assertThrows(IllegalArgumentException.class, () -> importar.importar(new byte[8 * 1024 * 1024 + 1]));
        assertThrows(IllegalArgumentException.class, () -> importar.importar(excel("INVALIDA")));
        assertEquals(2, evidencias.count()); assertEquals(versiones, evidencias.versionesActuales());
    }
    @Test void databaseFailureRollsBackEvidenceAndParentChangesTogether() throws Exception {
        importar.importar(excel("10-001")); var versiones = evidencias.versionesActuales();
        doThrow(new IllegalStateException("synthetic persistence failure")).when(evidencias).flush();
        assertThrows(IllegalStateException.class, () -> importar.importar(excel("10-002")));
        reset(evidencias);
        assertEquals(versiones, evidencias.versionesActuales()); assertEquals(2, evidencias.count());
        assertEquals("ACTIVO", padron.findById("10-001").orElseThrow().getEstado());
        assertFalse(padron.existsById("10-002"));
    }
}

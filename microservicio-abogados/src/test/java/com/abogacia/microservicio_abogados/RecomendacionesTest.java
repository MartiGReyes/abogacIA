package com.abogacia.microservicio_abogados;

import com.abogacia.microservicio_abogados.entity.*;
import com.abogacia.microservicio_abogados.repository.*;
import com.abogacia.microservicio_abogados.padron.ValidarMatricula;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import java.util.List;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

/** H2 only, with transaction rollback. Never uses the application PostgreSQL database. */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:recomendaciones;MODE=PostgreSQL;DB_CLOSE_DELAY=-1")
@Transactional
class RecomendacionesTest {
    @Autowired WebApplicationContext context;
    @Autowired AbogadoRepository abogados;
    @Autowired EstadoRepository estados;
    @Autowired PadronEvidenciaRepository evidencias;
    MockMvc mvc;
    int sequence;
    @BeforeEach void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }
    AbogadoRegistrado habilitado(String mail, String... especialidades) {
        String id = "TEST-REC-" + (++sequence);
        var a = new AbogadoRegistrado();
        a.setNombre("Profesional"); a.setApellido("Prueba H2");
        a.setDni("9000000" + sequence); a.setMail(mail);
        a.setContrasenaHash("HASH-PRIVADO"); a.setCodigoConfirmacion("CODIGO-PRIVADO");
        a.setEstado(estados.findByNombreEstado("REGISTRADO").orElseThrow());
        a.setCorreoConfirmado(true); a.setVerificacionDni("APROBADA"); a.setDniVerificado(true);
        a.setValidacionMatricula("VALIDADA"); a.setMatriculaVerificada(true);
        a.setNroMatricula(id); a.setColegioProfesional(ValidarMatricula.COLEGIO); a.setProvincia("Córdoba");
        a.setEspecialidades(List.of(especialidades));
        evidencias.save(new PadronEvidencia(id, a.getDni(), "PROFESIONAL TEST", "ACTIVO", "test-h2", sequence, "test"));
        return abogados.saveAndFlush(a);
    }
    @Test void filtroPublicoYProteccionDatos() throws Exception {
        habilitado("laboral@profesional.local", "Derecho Laboral", "Derecho Civil");
        habilitado("civil@profesional.local", "Derecho Civil");
        String body = mvc.perform(get("/api/abogados/recomendaciones").param("especialidad", "derecho LABORAL"))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].matriculaVerificada").value(true))
            .andExpect(jsonPath("$[0].perfilPrueba").value(false))
            .andExpect(jsonPath("$[0].dni").doesNotExist())
            .andExpect(jsonPath("$[0].contrasenaHash").doesNotExist())
            .andExpect(jsonPath("$[0].codigoConfirmacion").doesNotExist())
            .andExpect(jsonPath("$[0].sesionDidit").doesNotExist())
            .andReturn().getResponse().getContentAsString();
        assertFalse(body.contains("HASH-PRIVADO")); assertFalse(body.contains("CODIGO-PRIVADO"));
        mvc.perform(post("/api/abogados/recomendaciones")).andExpect(status().isForbidden());
        mvc.perform(get("/api/interno/abogados/privado")).andExpect(status().isUnauthorized());
    }
    @Test void sinEspecialidadesYFiltroInexistente() throws Exception {
        habilitado("general@profesional.local");
        mvc.perform(get("/api/abogados/recomendaciones"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].especialidades.length()").value(0));
        mvc.perform(get("/api/abogados/recomendaciones").param("especialidad", "Inventada"))
            .andExpect(status().isOk()).andExpect(content().json("[]"));
        mvc.perform(get("/api/abogados/recomendaciones").param("especialidad", "x".repeat(101)))
            .andExpect(status().isBadRequest());
    }
    @Test void excluyeNoHabilitadosYPerfilesDePrueba() throws Exception {
        var pendiente = habilitado("pendiente@profesional.local");
        pendiente.setEstado(estados.findByNombreEstado("PENDIENTE").orElseThrow());
        var baja = habilitado("baja@profesional.local");
        baja.setEstado(estados.findByNombreEstado("BAJA").orElseThrow());
        var correo = habilitado("correo@profesional.local"); correo.setCorreoConfirmado(false);
        var dni = habilitado("dni@profesional.local"); dni.setVerificacionDni("PENDIENTE");
        var matricula = habilitado("matricula@profesional.local"); matricula.setMatriculaVerificada(false);
        var solicitud = habilitado("solicitud@profesional.local"); solicitud.setContrasenaHash(null);
        habilitado("ficticio@example.com", "Derecho Laboral");
        abogados.flush();
        mvc.perform(get("/api/abogados/recomendaciones"))
            .andExpect(status().isOk()).andExpect(content().json("[]"));
    }
    @Test void revalidaPadronSinModificarCuenta() throws Exception {
        var a = habilitado("inactivo@profesional.local");
        evidencias.saveAndFlush(new PadronEvidencia(a.getNroMatricula(), a.getDni(), "PROFESIONAL TEST", "INACTIVO", "test-h2", 20, "test"));
        mvc.perform(get("/api/abogados/recomendaciones"))
            .andExpect(status().isOk()).andExpect(content().json("[]"));
        assertEquals("REGISTRADO", a.getEstado().getNombreEstado());
        assertTrue(a.getMatriculaVerificada());
    }
    @Test void baseVacia() throws Exception {
        mvc.perform(get("/api/abogados/recomendaciones"))
            .andExpect(status().isOk()).andExpect(content().json("[]"));
    }
}

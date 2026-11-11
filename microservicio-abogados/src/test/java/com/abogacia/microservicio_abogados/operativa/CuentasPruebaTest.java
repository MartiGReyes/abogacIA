package com.abogacia.microservicio_abogados.operativa;

import com.abogacia.microservicio_abogados.entity.*;
import com.abogacia.microservicio_abogados.repository.AbogadoRepository;
import com.abogacia.microservicio_abogados.contacto.AutorizacionWhatsApp;
import com.abogacia.microservicio_abogados.controller.ValidarCredencialesAbogadoController;
import com.abogacia.microservicio_abogados.padron.ValidarMatricula;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;

class CuentasPruebaTest {
    @Test void excepcionRechazaProduccionYLosCircuitosIndependientes(){
        var e=new OperativaConfigTest().correcto().withProperty("ABOGADOS_LOCAL_RUNTIME","cuentas-autenticadas-loopback");
        assertDoesNotThrow(()->CuentasPruebaConfig.validar(e));
        for(String flag:List.of("abogados.desarrollo-local.enabled","abogados.legacy-operativa.enabled")){
            e.withProperty(flag,"true");assertThrows(IllegalStateException.class,()->CuentasPruebaConfig.validar(e));e.withProperty(flag,"false");
        }
        e.withProperty("spring.datasource.url","jdbc:postgresql://habitual:5432/abogados");assertThrows(IllegalStateException.class,()->CuentasPruebaConfig.validar(e));
        var prod=new OperativaConfigTest().correcto().withProperty("ABOGADOS_LOCAL_RUNTIME","cuentas-autenticadas-loopback");prod.setActiveProfiles("production");
        assertThrows(IllegalStateException.class,()->CuentasPruebaConfig.validar(prod));
    }
    private AbogadoRegistrado cuenta(){
        var a=new AbogadoRegistrado();a.setIdAbogado(961001L);a.setMail("abogado.prueba@abogacia.local");a.setNroMatricula("PRUEBA-961001");a.setContrasenaHash("hash");
        var estado=new Estado();estado.setNombreEstado("REGISTRADO");a.setEstado(estado);a.setVerificacionDni("DECLARADA_NO_VERIFICADA");a.setValidacionMatricula("FICTICIA_NO_VERIFICADA");return a;
    }
    @Test void elLoginNormalBloqueaMatriculaPruebaInclusoConFlagsAlterados(){
        var a=cuenta();a.setCorreoConfirmado(true);a.setVerificacionDni("APROBADA");a.setValidacionMatricula("VALIDADA");
        var repo=mock(AbogadoRepository.class);when(repo.findByMail(a.getMail())).thenReturn(Optional.of(a));var encoder=mock(PasswordEncoder.class);when(encoder.matches("password","hash")).thenReturn(true);
        var padron=mock(ValidarMatricula.class);var c=new ValidarCredencialesAbogadoController(repo,encoder,padron);
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->c.validar(new ValidarCredencialesAbogadoController.Request(a.getMail(),"password")));verifyNoInteractions(padron);
    }
    @Test void cuentaAutenticadaDePruebaNoRequiereNiFabricaVerificaciones(){
        var a=cuenta();var repo=mock(AbogadoRepository.class);when(repo.findByMail(a.getMail())).thenReturn(Optional.of(a));var encoder=mock(PasswordEncoder.class);when(encoder.matches("password","hash")).thenReturn(true);
        var local=mock(CuentaPruebaService.class);when(local.cuenta(a)).thenReturn(true);var c=new ValidarCredencialesAbogadoController(repo,encoder,mock(ValidarMatricula.class));ReflectionTestUtils.setField(c,"pruebas",local);
        assertEquals(961001L,c.validar(new ValidarCredencialesAbogadoController.Request(a.getMail(),"password")).get("idAbogado"));
        assertEquals("DECLARADA_NO_VERIFICADA",a.getVerificacionDni());assertFalse(a.getMatriculaVerificada());assertFalse(a.getCorreoConfirmado());
    }
    @Test void laExtensionCifradaExigeCuentaPersistidaYRechazaAprobaciones(){
        var jdbc=mock(JdbcTemplate.class);when(jdbc.queryForMap("select current_database() db,current_user usuario")).thenReturn(Map.of("db","contacto_operativo_test","usuario","operativa_runtime"));
        when(jdbc.queryForObject("select count(*) from operativa.cuenta_prueba where id_abogado=?",Long.class,961001L)).thenReturn(1L);
        var s=new CuentaPruebaService(jdbc,new DatosOperativos(new byte[32]),mock(AbogadoRepository.class),mock(AutorizacionWhatsApp.class));var a=cuenta();assertTrue(s.cuenta(a));a.setDniVerificado(true);assertFalse(s.cuenta(a));a.setDniVerificado(false);a.setVerificacionDni("APROBADA");assertFalse(s.cuenta(a));
    }
    @Test void catalogoYContactoProfesionalRechazanLaMarcaDePruebaAunqueAlterenVerificaciones(){
        var a=cuenta();a.setCorreoConfirmado(true);a.setDniVerificado(true);a.setMatriculaVerificada(true);a.setVerificacionDni("APROBADA");a.setValidacionMatricula("VALIDADA");
        var padron=mock(ValidarMatricula.class);var permisos=mock(AutorizacionWhatsApp.class);
        var contacto=new com.abogacia.microservicio_abogados.contacto.ProfesionalContactable(padron,permisos);assertFalse(contacto.habilitado(a));
        var repo=mock(AbogadoRepository.class);when(repo.findHabilitadosRecomendaciones()).thenReturn(List.of(a));
        var provider=mock(org.springframework.beans.factory.ObjectProvider.class);
        var gestor=new com.abogacia.microservicio_abogados.gestor.RecomendarAbogadosGestor(repo,padron,provider,contacto);
        assertTrue(gestor.catalogo().isEmpty());verifyNoInteractions(padron);
    }
}

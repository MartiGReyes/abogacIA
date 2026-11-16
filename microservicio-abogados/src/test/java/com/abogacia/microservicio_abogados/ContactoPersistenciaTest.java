package com.abogacia.microservicio_abogados;

import com.abogacia.microservicio_abogados.contacto.*;
import com.abogacia.microservicio_abogados.entity.AbogadoRegistrado;
import com.abogacia.microservicio_abogados.extension.ContactoRegistro;
import com.abogacia.microservicio_abogados.operativa.CuentaPruebaService;
import com.abogacia.microservicio_abogados.repository.AbogadoRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.oauth2.jwt.Jwt;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ContactoPersistenciaTest {
    @Test @SuppressWarnings("unchecked") void noEntregaEnlaceSiNoSeGuardaLaSolicitud(){
        var repo=mock(AbogadoRepository.class);var profesionales=mock(ProfesionalContactable.class);
        var registro=mock(ContactoRegistro.class);var provider=(ObjectProvider<CuentaPruebaService>)mock(ObjectProvider.class);
        var a=new AbogadoRegistrado();a.setIdAbogado(1L);a.setNombre("Profesional");a.setApellido("Sintético");a.setNroMatricula("10-001");a.setDni("99000111");a.setNroCelular("+5493510000001");
        when(repo.findById(1L)).thenReturn(Optional.of(a));when(profesionales.habilitado(a)).thenReturn(true);when(profesionales.disponible(a)).thenReturn(true);
        when(registro.guardar(anyLong(),anyLong(),anyString(),anyCollection(),anyString(),anyString(),anyString(),anyString())).thenThrow(new DataAccessResourceFailureException("Fallo sintético"));
        var c=new ContactoWhatsAppController(repo,profesionales,provider,registro);
        var body=new ContactoWhatsAppController.Formulario(new ContactoWhatsAppController.Referencia("PROFESIONAL","1"),"Ciudadano sintético","+5493510000009","Consulta de prueba","Mensaje editado y confirmado.",true,ContactoWhatsAppController.AVISO);
        var jwt=Jwt.withTokenValue("sintetico").header("alg","HS256").subject("2").claim("rol","CIUDADANO").build();
        assertThrows(DataAccessResourceFailureException.class,()->c.preparar(body,new MockHttpServletRequest(),jwt));
    }
}

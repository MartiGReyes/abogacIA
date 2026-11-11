package com.abogacia.microservicio_abogados.operativa;

import com.abogacia.microservicio_abogados.controller.PerfilAbogadoController;
import com.abogacia.microservicio_abogados.contacto.*;
import com.abogacia.microservicio_abogados.entity.*;
import com.abogacia.microservicio_abogados.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Optional;

class WhatsAppPerfilTest {
    final AbogadoRepository repo=mock(AbogadoRepository.class);
    final AutorizacionWhatsApp permiso=mock(AutorizacionWhatsApp.class);
    final ProfesionalContactable profesional=mock(ProfesionalContactable.class);
    final CuentaPruebaService pruebas=mock(CuentaPruebaService.class);
    final PerfilAbogadoController controller=new PerfilAbogadoController(repo,mock(EstadoRepository.class),permiso,profesional);
    final AbogadoRegistrado a=new AbogadoRegistrado();
    final Jwt jwt=Jwt.withTokenValue("synthetic").header("alg","HS256").subject("981101").claim("rol","ABOGADO").build();
    WhatsAppPerfilTest(){
        a.setIdAbogado(981101L);a.setNroMatricula("PRUEBA-981101");a.setContrasenaHash("synthetic");a.setNombre("AUTOTEST");a.setApellido("WhatsApp");a.setVerificacionDni("DECLARADA_NO_VERIFICADA");a.setValidacionMatricula("FICTICIA_NO_VERIFICADA");
        var e=new Estado();e.setNombreEstado("REGISTRADO");a.setEstado(e);
        when(repo.findById(981101L)).thenReturn(Optional.of(a));when(repo.findByIdForUpdate(981101L)).thenReturn(Optional.of(a));when(pruebas.cuenta(a)).thenReturn(true);when(pruebas.dni(a)).thenReturn("99000991");when(pruebas.telefono(a)).thenReturn("");ReflectionTestUtils.setField(controller,"pruebas",pruebas);
    }
    @Test void dniCargadoSinCelularExplicaElBloqueoYNoActivaLaPreferencia(){
        var dto=controller.obtener(jwt).getBody();assertEquals(false,dto.get("whatsappPuedeActivar"));assertTrue(dto.get("whatsappBloqueo").toString().contains("Guardá un celular"));
        var ex=assertThrows(ResponseStatusException.class,()->controller.permisoWhatsApp(jwt,new PerfilAbogadoController.WhatsAppRequest(true)));assertEquals(400,ex.getStatusCode().value());verify(permiso,never()).guardar(anyLong(),anyBoolean());
    }
    @Test void telefonoDelPerfilAutenticadoHabilitaCuentaPruebaSinAprobarDiditOMatricula(){
        doAnswer(x->{when(pruebas.telefono(a)).thenReturn("5493510000007");a.setNroCelular("CIFRADO");return null;}).when(pruebas).guardarTelefono(a,"+5493510000007");
        var dto=controller.telefonoWhatsApp(jwt,new PerfilAbogadoController.TelefonoWhatsAppRequest("+5493510000007")).getBody();assertEquals(true,dto.get("whatsappPuedeActivar"));verify(repo).saveAndFlush(a);
        controller.permisoWhatsApp(jwt,new PerfilAbogadoController.WhatsAppRequest(true));verify(permiso).guardar(981101L,true);
        controller.permisoWhatsApp(jwt,new PerfilAbogadoController.WhatsAppRequest(false));verify(permiso).guardar(981101L,false);
        assertEquals("DECLARADA_NO_VERIFICADA",a.getVerificacionDni());assertEquals("FICTICIA_NO_VERIFICADA",a.getValidacionMatricula());verifyNoInteractions(profesional);
    }
    @Test void unProfesionalNoVerificadoNoPuedeActivarAunqueTengaCelular(){
        a.setNroMatricula("10-981101");a.setNroCelular("+5493510000007");when(pruebas.cuenta(a)).thenReturn(false);
        var ex=assertThrows(ResponseStatusException.class,()->controller.permisoWhatsApp(jwt,new PerfilAbogadoController.WhatsAppRequest(true)));assertEquals(403,ex.getStatusCode().value());verify(permiso,never()).guardar(anyLong(),anyBoolean());
    }
    @Test void cuentaPruebaFueraDelRuntimeYCiudadanosNoPuedenEditarElCelular(){
        ReflectionTestUtils.setField(controller,"pruebas",null);assertThrows(ResponseStatusException.class,()->controller.telefonoWhatsApp(jwt,new PerfilAbogadoController.TelefonoWhatsAppRequest("+5493510000007")));
        var ciudadano=Jwt.withTokenValue("synthetic").header("alg","HS256").subject("981101").claim("rol","CIUDADANO").build();assertThrows(ResponseStatusException.class,()->controller.telefonoWhatsApp(ciudadano,new PerfilAbogadoController.TelefonoWhatsAppRequest("+5493510000007")));verify(repo,never()).saveAndFlush(any());
    }
}

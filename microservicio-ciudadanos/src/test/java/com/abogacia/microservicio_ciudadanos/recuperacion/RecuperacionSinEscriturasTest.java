package com.abogacia.microservicio_ciudadanos.recuperacion;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import com.abogacia.microservicio_ciudadanos.correo.InterfazCorreo;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class RecuperacionSinEscriturasTest {
 @Test void deshabilitadaNoConsultaNiEscribe(){var j=mock(JdbcTemplate.class);var p=mock(PasswordEncoder.class);var c=mock(InterfazCorreo.class);var r=new RecuperacionController(j,p,c,false);assertEquals(503,assertThrows(ResponseStatusException.class,()->r.solicitar(new RecuperacionController.Solicitud("fixture@example.invalid"))).getStatusCode().value());verifyNoInteractions(j,p,c);}
 @Test void sinCanalNoDistingueCuentasNiTocaLaBase(){var j=mock(JdbcTemplate.class);var p=mock(PasswordEncoder.class);var c=mock(InterfazCorreo.class);var r=new RecuperacionController(j,p,c,true);assertEquals(503,assertThrows(ResponseStatusException.class,()->r.solicitar(new RecuperacionController.Solicitud("fixture@example.invalid"))).getStatusCode().value());verifyNoInteractions(j,p);}
 @Test void limitaBytesBcryptAntesDeAccederATokens(){var j=mock(JdbcTemplate.class);var p=mock(PasswordEncoder.class);var c=mock(InterfazCorreo.class);when(c.recuperacionDisponible()).thenReturn(true);var r=new RecuperacionController(j,p,c,true);String pass="é".repeat(40);assertEquals(400,assertThrows(ResponseStatusException.class,()->r.confirmar(new RecuperacionController.Confirmacion("A".repeat(43),pass,pass))).getStatusCode().value());verifyNoInteractions(j,p);}
}

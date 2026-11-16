package com.abogacia.microservicio_abogados.correo;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
class CorreoSmtpTest {
 @Test void componeCorreoDeRecuperacionDelTipoSinEnviarRed(){var sender=mock(JavaMailSender.class);var c=new CorreoSmtp(sender,"noreply@example.invalid");c.enviarRecuperacion("fixture@example.invalid","TOKEN-SINTETICO");var m=ArgumentCaptor.forClass(SimpleMailMessage.class);verify(sender).send(m.capture());assertTrue(m.getValue().getSubject().contains("ABOGADO"));assertTrue(m.getValue().getText().contains("TOKEN-SINTETICO"));assertTrue(m.getValue().getText().contains("15 minutos"));assertEquals("fixture@example.invalid",m.getValue().getTo()[0]);}
 @Test void noAdmiteRemitenteInvalido(){assertThrows(IllegalArgumentException.class,()->new CorreoSmtp(mock(JavaMailSender.class),"invalido"));}

 @Test void confirmaPorCorreoSinActivarLaCuenta(){var sender=mock(JavaMailSender.class);new CorreoSmtp(sender,"noreply@example.invalid").enviarMailConfirmacion("fixture@example.invalid","SOLO-PRUEBA");var c=ArgumentCaptor.forClass(SimpleMailMessage.class);verify(sender).send(c.capture());assertTrue(c.getValue().getText().contains("SOLO-PRUEBA"));}
 @Test void smtpFallaSinExponerCausa(){var sender=mock(JavaMailSender.class);doThrow(new org.springframework.mail.MailSendException("SECRETO-SINTETICO")).when(sender).send(any(SimpleMailMessage.class));var ex=assertThrows(org.springframework.web.server.ResponseStatusException.class,()->new CorreoSmtp(sender,"noreply@example.invalid").enviarMailConfirmacion("fixture@example.invalid","CODE"));assertFalse(ex.toString().contains("SECRETO-SINTETICO"));assertNull(ex.getCause());}
 @Test void deshabilitadoNoEnvia(){var sender=mock(JavaMailSender.class);var c=new CorreoSmtp(sender,"noreply@example.invalid");org.springframework.test.util.ReflectionTestUtils.setField(c,"enabled",false);assertFalse(c.recuperacionDisponible());assertThrows(org.springframework.web.server.ResponseStatusException.class,()->c.enviarRecuperacion("fixture@example.invalid","CODE"));verifyNoInteractions(sender);}
 @Test void enlaceTemporalUsaFragmentoYCuenta(){var sender=mock(JavaMailSender.class);new CorreoSmtp(sender,"noreply@example.invalid").enviarRecuperacion("fixture@example.invalid","TOKEN");var c=ArgumentCaptor.forClass(SimpleMailMessage.class);verify(sender).send(c.capture());assertTrue(c.getValue().getText().contains("/recuperar-acceso?cuenta=ABOGADO#token=TOKEN"));}
}

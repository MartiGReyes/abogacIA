package com.abogacia.microservicio_abogados.correo;
import org.junit.jupiter.api.Test;import static org.junit.jupiter.api.Assertions.*;import static org.mockito.Mockito.*;import static org.mockito.ArgumentMatchers.*;import java.util.*;
import com.abogacia.microservicio_abogados.repository.AbogadoRepository;import com.abogacia.microservicio_abogados.entity.*;
class ReenvioSeguroTest {
 @Test void correoDesconocidoNoEnvia(){var r=mock(AbogadoRepository.class);var mail=mock(InterfazCorreo.class);new ReenviarConfirmacion(r,mail,mock(org.springframework.security.crypto.password.PasswordEncoder.class)).enviar("fixture@example.invalid");verifyNoInteractions(mail);}
 @Test void confirmadoNuncaRotaCodigo(){var r=mock(AbogadoRepository.class);var mail=mock(InterfazCorreo.class);var a=new AbogadoRegistrado();a.setCorreoConfirmado(true);when(r.findByMailForUpdate(anyString())).thenReturn(Optional.of(a));new ReenviarConfirmacion(r,mail,mock(org.springframework.security.crypto.password.PasswordEncoder.class)).enviar("fixture@example.invalid");verifyNoInteractions(mail);verify(r,never()).saveAndFlush(any());}

}

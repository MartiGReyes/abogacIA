package com.abogacia.microservicio_abogados.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.abogacia.microservicio_abogados.operativa.SembrarCuentasPrueba;
import com.abogacia.microservicio_abogados.extension.EsquemaExtendido;
import com.abogacia.microservicio_abogados.padron.PadronConfig;
import com.abogacia.microservicio_abogados.repository.EstadoRepository;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BootstrapRunnersTest {
 @Test void desactivarSeedsConservaPasswordEncoderSinNecesitarJdbcNiArchivoDePassword() {
  try(var ctx=new AnnotationConfigApplicationContext()) {
   ctx.setEnvironment(new MockEnvironment().withProperty("abogados.cuentas-prueba.enabled","true"));
   ctx.register(RegistroConfig.class,SembrarCuentasPrueba.class,EsquemaExtendido.class,PadronConfig.class);
   ctx.refresh();assertTrue(ctx.getBeansOfType(ApplicationRunner.class).isEmpty());
   assertNotNull(ctx.getBean(PasswordEncoder.class));
  }
 }
 @Test void estadosSeRegistranSoloConOptIn() {
  var repo=mock(EstadoRepository.class);
  try(var ctx=new AnnotationConfigApplicationContext()) {
   ctx.setEnvironment(new MockEnvironment().withProperty("abogacia.bootstrap.states-enabled","true"));
   ctx.registerBean(EstadoRepository.class,()->repo);ctx.register(RegistroConfig.class);ctx.refresh();
   assertEquals(1,ctx.getBeansOfType(ApplicationRunner.class).size());verifyNoInteractions(repo);
  }
 }
}

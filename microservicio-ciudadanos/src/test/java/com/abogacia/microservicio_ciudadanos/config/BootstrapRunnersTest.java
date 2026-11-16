package com.abogacia.microservicio_ciudadanos.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import com.abogacia.microservicio_ciudadanos.repository.*;
import com.abogacia.microservicio_ciudadanos.controller.ConsultasLexiController;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class BootstrapRunnersTest {
 @Test void estadosNoSeRegistranSinOptIn() {
  try(var ctx=new AnnotationConfigApplicationContext()) {
   ctx.register(DataInitializer.class);ctx.refresh();
   assertTrue(ctx.getBeansOfType(CommandLineRunner.class).isEmpty());
  }
 }
 @Test void estadosSeRegistranConOptIn() {
  var repo=mock(EstadoRepository.class);
  try(var ctx=new AnnotationConfigApplicationContext()) {
   ctx.setEnvironment(new MockEnvironment().withProperty("abogacia.bootstrap.states-enabled","true"));
   ctx.registerBean(EstadoRepository.class,()->repo);ctx.register(DataInitializer.class);ctx.refresh();
   assertEquals(1,ctx.getBeansOfType(CommandLineRunner.class).size());verifyNoInteractions(repo);
  }
 }
 @Test void historialNoPreparaTablasSinOptInAunqueHibernateSeaUpdate() {
  var jdbc=mock(JdbcTemplate.class);
  var c=new ConsultasLexiController(jdbc,mock(CiudadanoRepository.class),"update");
  c.run(null);verifyNoInteractions(jdbc);
  ReflectionTestUtils.setField(c,"schemaEnabled",true);c.run(null);
  verify(jdbc,times(2)).execute(anyString());
 }
}

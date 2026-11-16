package com.abogacia.microservicio_ciudadanos.config;
import java.util.*;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
/** Fail before datasource initialization if bootstrap or safe-start settings conflict. */
@Configuration
public class BootstrapSeguroConfig {
 public static final List<String> FLAGS=List.of("states-enabled","test-accounts-enabled","schema-enabled","padron-enabled");
 public static void validar(Environment e){
  boolean writing=FLAGS.stream().anyMatch(f->e.getProperty("abogacia.bootstrap."+f,Boolean.class,false));
  boolean protectedProfile=Arrays.stream(e.getActiveProfiles()).map(s->s.toLowerCase(Locale.ROOT)).anyMatch(s->Set.of("beta","prod","production","produccion").contains(s));
  if(writing&&(protectedProfile||!e.getProperty("abogacia.bootstrap.development-enabled",Boolean.class,false)))throw new IllegalStateException("Bootstrap con escrituras requiere desarrollo controlado explícito y está prohibido en beta/producción.");
  boolean safe=e.getProperty("abogacia.bootstrap.safe-start",Boolean.class,false)||Arrays.asList(e.getActiveProfiles()).contains("arranque-seguro");
  if(safe&&(writing||!"validate".equals(e.getProperty("spring.jpa.hibernate.ddl-auto"))||!"never".equals(e.getProperty("spring.sql.init.mode"))||e.getProperty("spring.flyway.enabled",Boolean.class,false)||e.getProperty("spring.liquibase.enabled",Boolean.class,false)||e.getProperty("DIDIT_RECONCILIATION_ENABLED",Boolean.class,true)||e.getProperty("abogados.padron.importar",Boolean.class,false)))throw new IllegalStateException("Arranque seguro exige validate, SQL/migraciones/bootstrap/padrón/reconciliación deshabilitados.");
 }
 @Bean static BeanFactoryPostProcessor bootstrapGuard(Environment e){return factory->validar(e);}
}

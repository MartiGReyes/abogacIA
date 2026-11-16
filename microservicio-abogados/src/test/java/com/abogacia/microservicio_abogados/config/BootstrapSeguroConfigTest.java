package com.abogacia.microservicio_abogados.config;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import static org.junit.jupiter.api.Assertions.*;
class BootstrapSeguroConfigTest {
 private MockEnvironment seguro(){return new MockEnvironment()
  .withProperty("abogacia.bootstrap.safe-start","true")
  .withProperty("spring.jpa.hibernate.ddl-auto","validate")
  .withProperty("spring.sql.init.mode","never")
  .withProperty("spring.flyway.enabled","false")
  .withProperty("spring.liquibase.enabled","false")
  .withProperty("DIDIT_RECONCILIATION_ENABLED","false");}
 @Test void seguroValidaSinEscrituras(){assertDoesNotThrow(()->BootstrapSeguroConfig.validar(seguro()));}
 @Test void cadaInicializadorRequiereDesarrolloExplicito(){
  for(String flag:BootstrapSeguroConfig.FLAGS){
   var e=new MockEnvironment().withProperty("abogacia.bootstrap."+flag,"true");
   assertThrows(IllegalStateException.class,()->BootstrapSeguroConfig.validar(e));
   e.withProperty("abogacia.bootstrap.development-enabled","true");
   assertDoesNotThrow(()->BootstrapSeguroConfig.validar(e));
   for(String profile:new String[]{"beta","prod","production","produccion"}){
    e.setActiveProfiles(profile);assertThrows(IllegalStateException.class,()->BootstrapSeguroConfig.validar(e));
   }
  }
 }
 @Test void seguroRechazaCadaOverridePeligroso(){
  var overrides=java.util.Map.of("spring.jpa.hibernate.ddl-auto","update","spring.sql.init.mode","always",
   "spring.flyway.enabled","true","spring.liquibase.enabled","true","DIDIT_RECONCILIATION_ENABLED","true",
   "abogados.padron.importar","true");
  overrides.forEach((k,v)->assertThrows(IllegalStateException.class,()->BootstrapSeguroConfig.validar(seguro().withProperty(k,v)),k));
  for(String flag:BootstrapSeguroConfig.FLAGS)assertThrows(IllegalStateException.class,()->BootstrapSeguroConfig.validar(seguro()
   .withProperty("abogacia.bootstrap.development-enabled","true").withProperty("abogacia.bootstrap."+flag,"true")));
 }
 @Test void perfilSeguroNoPuedeDesactivarsePorBandera(){var e=seguro().withProperty("abogacia.bootstrap.safe-start","false")
  .withProperty("spring.jpa.hibernate.ddl-auto","create-drop");e.setActiveProfiles("arranque-seguro");
  assertThrows(IllegalStateException.class,()->BootstrapSeguroConfig.validar(e));}
}

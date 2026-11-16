package com.abogacia.microservicio_ciudadanos.correo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import static org.junit.jupiter.api.Assertions.*;
/** Disposable H2 context only: no host DB, no real email, no bootstrap seeds. */
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:p1correociudadanos;MODE=PostgreSQL;DB_CLOSE_DELAY=-1","spring.datasource.username=sa","spring.datasource.password=","spring.datasource.driver-class-name=org.h2.Driver","spring.jpa.hibernate.ddl-auto=create-drop","spring.jpa.show-sql=false","spring.sql.init.mode=never","spring.flyway.enabled=false","spring.liquibase.enabled=false","INTERNAL_USERNAME=fixture","INTERNAL_PASSWORD=FixtureInternalPassword","JWT_SECRET=QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUE=","abogacia.bootstrap.safe-start=false","abogacia.bootstrap.states-enabled=false","abogacia.bootstrap.schema-enabled=false","abogacia.bootstrap.test-accounts-enabled=false","abogacia.bootstrap.padron-enabled=false","DIDIT_RECONCILIATION_ENABLED=false","abogacia.recuperacion.enabled=false"})
class CorreoArranqueTest {
 @Autowired ApplicationContext context;
 @Test void adaptadorDefaultNoHabilitaRecuperacionNiCorreoSmtp(){assertInstanceOf(InterfazCorreoConsola.class,context.getBean(InterfazCorreo.class));assertFalse(context.getBean(InterfazCorreo.class).recuperacionDisponible());assertTrue(context.getBeansOfType(CorreoSmtp.class).isEmpty());}
}

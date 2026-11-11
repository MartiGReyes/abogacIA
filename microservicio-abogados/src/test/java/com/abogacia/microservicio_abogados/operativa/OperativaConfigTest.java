package com.abogacia.microservicio_abogados.operativa;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import static org.junit.jupiter.api.Assertions.*;
class OperativaConfigTest {
    MockEnvironment correcto() {
        var e=new MockEnvironment();e.setActiveProfiles("contacto-operativo-test");
        return e.withProperty("spring.datasource.url","jdbc:postgresql://postgres-operativa:5432/contacto_operativo_test")
            .withProperty("spring.datasource.username","operativa_runtime").withProperty("spring.jpa.hibernate.ddl-auto","validate")
            .withProperty("spring.sql.init.mode","never").withProperty("DIDIT_RECONCILIATION_ENABLED","false")
            .withProperty("OP_ENCRYPTION_KEY_FILE","/run/secrets/operativa_key").withProperty("OP_OPERATOR_CODE_FILE","/run/secrets/operativa_operator")
            .withProperty("OP_LEXI_URL","http://host.docker.internal:5678/webhook/orientacion-legal");
    }
    @Test void guardasImpidenUsarBasesOAjustesHabituales() {
        assertDoesNotThrow(()->OperativaConfig.validar(correcto()));
        for(String propiedad:java.util.List.of("spring.datasource.url","spring.datasource.username","spring.jpa.hibernate.ddl-auto","spring.sql.init.mode","DIDIT_RECONCILIATION_ENABLED","OP_LEXI_URL","OP_ENCRYPTION_KEY_FILE"))
            assertThrows(RuntimeException.class,()->OperativaConfig.validar(correcto().withProperty(propiedad,"incorrecto")));
        var mixto=correcto();mixto.setActiveProfiles("contacto-operativo-test","abogados-dev");
        assertThrows(IllegalStateException.class,()->OperativaConfig.validar(mixto));
    }
}

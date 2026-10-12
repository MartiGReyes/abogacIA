package com.abogacia.microservicio_abogados;

import com.abogacia.microservicio_abogados.didit.DiditPruebaLocal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.env.MockEnvironment;
import java.time.Instant;
import static org.junit.jupiter.api.Assertions.*;

class DiditPruebaLocalTest {
    MockEnvironment local(){
        var env=new MockEnvironment();env.setActiveProfiles("didit-local-test");
        return env.withProperty("DIDIT_DEV_TEST_ENABLED","true")
            .withProperty("DIDIT_DEV_TEST_ABOGADO_ID","42")
            .withProperty("DIDIT_DEV_TEST_EXPIRES_AT",Instant.now().plusSeconds(300).toString())
            .withProperty("server.address","127.0.0.1")
            .withProperty("DIDIT_RECONCILIATION_ENABLED","false");
    }
    @Test void desactivadaPorDefecto(){assertFalse(new DiditPruebaLocal(new MockEnvironment()).habilitada());}
    @Test void soloTitularConfigurado(){var p=new DiditPruebaLocal(local());assertTrue(p.permite(42L));assertFalse(p.permite(43L));}
    @ParameterizedTest @ValueSource(strings={"prod","production","default","dev"})
    void perfilesDistintosYCombinadosNoArrancan(String perfil){
        var env=local();env.setActiveProfiles(perfil);assertThrows(IllegalStateException.class,()->new DiditPruebaLocal(env));
        env.setActiveProfiles("didit-local-test",perfil);assertThrows(IllegalStateException.class,()->new DiditPruebaLocal(env));
    }
    @ParameterizedTest @ValueSource(strings={"server.address","DIDIT_DEV_TEST_ABOGADO_ID","DIDIT_DEV_TEST_EXPIRES_AT"})
    void configuracionIncompletaNoArranca(String propiedad){
        var env=local().withProperty(propiedad,"");assertThrows(IllegalStateException.class,()->new DiditPruebaLocal(env));
    }
    @Test void escuchaPublicaPrivacidadGeneralCallbackRemotoOReconciliacionNoArrancan(){
        for(var pair:new String[][]{{"server.address","0.0.0.0"},{"DIDIT_PRIVACY_READY","true"},
                {"DIDIT_CALLBACK_URL","https://example.com"},{"DIDIT_RECONCILIATION_ENABLED","true"},
                {"DIDIT_DEV_TEST_EXPIRES_AT",Instant.now().plusSeconds(3600).toString()},
                {"DIDIT_DEV_TEST_EXPIRES_AT",Instant.now().minusSeconds(1).toString()}}){
            assertThrows(IllegalStateException.class,()->new DiditPruebaLocal(local().withProperty(pair[0],pair[1])));
        }
    }
}

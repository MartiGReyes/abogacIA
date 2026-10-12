package com.abogacia.microservicio_abogados.didit;

import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.net.URI;
import java.util.Arrays;

/** Explicit local-only configuration. Never enables general privacy readiness. */
@Component
public class DiditPruebaLocal {
    private final boolean enabled;
    private final long abogadoId;
    private final Instant expires;

    public DiditPruebaLocal(Environment env) {
        enabled=env.getProperty("DIDIT_DEV_TEST_ENABLED",Boolean.class,false);
        if(!enabled){abogadoId=0;expires=Instant.EPOCH;return;}
        try {
            abogadoId=Long.parseLong(env.getRequiredProperty("DIDIT_DEV_TEST_ABOGADO_ID"));
            expires=Instant.parse(env.getRequiredProperty("DIDIT_DEV_TEST_EXPIRES_AT"));
            Instant now=Instant.now();
            URI callback=URI.create(env.getProperty("DIDIT_CALLBACK_URL","http://localhost:5173/verificar-identidad"));
            boolean localCallback="http".equals(callback.getScheme()) && callback.getUserInfo()==null
                    && ("localhost".equals(callback.getHost()) || "127.0.0.1".equals(callback.getHost()));
            if(!Arrays.equals(env.getActiveProfiles(),new String[]{"didit-local-test"})
                    || !"127.0.0.1".equals(env.getProperty("server.address"))
                    || env.getProperty("DIDIT_PRIVACY_READY",Boolean.class,false)
                    || env.getProperty("DIDIT_RECONCILIATION_ENABLED",Boolean.class,true)
                    || abogadoId<=0 || !expires.isAfter(now) || expires.isAfter(now.plusSeconds(1800))
                    || !localCallback) throw new IllegalArgumentException();
        } catch(Exception e) {
            // Do not attach configuration values or original exceptions.
            throw new IllegalStateException("La prueba Didit requiere perfil exclusivo didit-local-test, escucha 127.0.0.1, callback local, privacidad general y reconciliación desactivadas, un titular y vencimiento de hasta 30 minutos.");
        }
    }
    public boolean habilitada(){return enabled;}
    public boolean permite(Long id){return enabled && id!=null && id==abogadoId && expires.isAfter(Instant.now());}
}

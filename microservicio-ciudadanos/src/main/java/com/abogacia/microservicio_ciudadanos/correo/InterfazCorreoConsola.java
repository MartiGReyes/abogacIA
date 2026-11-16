package com.abogacia.microservicio_ciudadanos.correo;
import org.springframework.stereotype.Service;

@Service
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="abogacia.correo.adapter",havingValue="consola",matchIfMissing=true)
public class InterfazCorreoConsola implements InterfazCorreo {
    @org.springframework.beans.factory.annotation.Autowired private org.springframework.core.env.Environment environment;
    @org.springframework.beans.factory.annotation.Value("${abogacia.recuperacion.consola-enabled:false}") private boolean recoveryConsole;
    @Override public boolean recuperacionDisponible() {
        return recoveryConsole && environment.acceptsProfiles(org.springframework.core.env.Profiles.of("dev","desarrollo","test"))
            && !environment.acceptsProfiles(org.springframework.core.env.Profiles.of("beta","prod","production","produccion"));
    }
    @Override public void enviarRecuperacion(String mail,String token) {
        if(!recuperacionDisponible())throw new IllegalStateException("Canal de recuperación no configurado");
    }

    @Override
    public void enviarMailConfirmacion(String destinatario, String codigo) {

        System.out.println("------------------------------------");
        System.out.println("MAIL DE CONFIRMACIÓN");
        System.out.println("------------------------------------");
    }
}
//SIMULA (NO MANDA REALMENTE EL CORREO) ServidorCorreo para que podamos terminar y probar US01. Más adelante podemos conectarlo a SMTP, n8n u otro servicio.

package com.abogacia.microservicio_ciudadanos.correo;
import org.springframework.stereotype.Service;

@Service
public class InterfazCorreoConsola implements InterfazCorreo {

    @Override
    public void enviarMailConfirmacion(String destinatario, String codigo) {

        System.out.println("------------------------------------");
        System.out.println("MAIL DE CONFIRMACIÓN");
        System.out.println("Destinatario: " + destinatario);
        System.out.println("Código: " + codigo);
        System.out.println("------------------------------------");
    }
}
//SIMULA (NO MANDA REALMENTE EL CORREO) ServidorCorreo para que podamos terminar y probar US01. Más adelante podemos conectarlo a SMTP, n8n u otro servicio.
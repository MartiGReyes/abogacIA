package com.abogacia.microservicio_abogados.didit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.util.UUID;

@Component
public class DiditConfig {
    final String key, workflow, callback;
    private final String version, responsable, contacto, retencion, ubicacion, modelos;
    private final boolean ready;

    public DiditConfig(@Value("${DIDIT_API_KEY:}") String key,
            @Value("${DIDIT_WORKFLOW_ID:}") String workflow,
            @Value("${DIDIT_CALLBACK_URL:http://localhost:5173/registro-abogado}") String callback,
            @Value("${DIDIT_PRIVACY_READY:false}") boolean ready,
            @Value("${DIDIT_NOTICE_VERSION:}") String version,
            @Value("${DIDIT_DATA_CONTROLLER:}") String responsable,
            @Value("${DIDIT_PRIVACY_CONTACT:}") String contacto,
            @Value("${DIDIT_RETENTION_NOTICE:}") String retencion,
            @Value("${DIDIT_DATA_LOCATION_NOTICE:}") String ubicacion,
            @Value("${DIDIT_MODEL_USE_NOTICE:}") String modelos) {
        this.key=key; this.workflow=workflow; this.callback=callback; this.ready=ready;
        this.version=version; this.responsable=responsable; this.contacto=contacto;
        this.retencion=retencion; this.ubicacion=ubicacion; this.modelos=modelos;
    }

    public record Aviso(boolean disponible, String version, String texto) {}
    public String workflowId(){return workflow;}
    public Aviso aviso() {
        return aviso(false);
    }
    public Aviso avisoPruebaLocal() {
        return aviso(true);
    }
    private Aviso aviso(boolean prueba) {
        boolean configured=(prueba || ready) && !key.isBlank() && !workflow.isBlank()
                && !version.isBlank() && version.length()<=100 && !responsable.isBlank() && !contacto.isBlank()
                && !retencion.isBlank() && !ubicacion.isBlank() && !modelos.isBlank();
        try { UUID.fromString(workflow); } catch (IllegalArgumentException e) { configured=false; }
        if(prueba && version.length()+"-dev-test".length()>100)configured=false;
        String text="Responsable: " + responsable + ". Finalidad: verificar tu identidad para el registro profesional en abogacIA. "
                + "Didit procesará tu DNI argentino, imágenes del documento, captura facial, prueba de vida y comparación facial (Face Match). "
                + "La captura se realiza en Didit; abogacIA conserva referencias, estados, fechas, constancia de consentimiento y los datos leídos de tu documento (nombre, apellido, fecha de nacimiento, género y domicilio) para crear tu cuenta, sin medios biométricos. "
                + "Conservación y eliminación en Didit: " + retencion + ". Procesamiento y transferencias: " + ubicacion
                + ". Uso para mejora de modelos: " + modelos + ". Contacto para consultas, retiro del consentimiento y solicitudes sobre tus datos: "
                + contacto + ". Podés no consentir; tu cuenta permanecerá pendiente y no tendrá acceso profesional. "
                + "Aviso del proveedor: https://didit.me/es/terms/verification-privacy-notice/";
        if(prueba) text="PRUEBA REAL DE DESARROLLO. Didit recibirá imágenes de tu DNI y capturas biométricas para documento, prueba de vida y Face Match. La retención informada es ilimitada. Podés cancelar antes de iniciar sin enviar datos a Didit; cerrar el acceso después no elimina los datos enviados. " + text;
        return new Aviso(configured,prueba?version+"-dev-test":version,configured?text:"La verificación está bloqueada hasta configurar el aviso de privacidad y Didit.");
    }
}

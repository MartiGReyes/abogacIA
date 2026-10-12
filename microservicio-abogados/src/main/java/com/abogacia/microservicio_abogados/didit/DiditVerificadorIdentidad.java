package com.abogacia.microservicio_abogados.didit;

import org.springframework.stereotype.Component;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class DiditVerificadorIdentidad implements VerificadorIdentidad {
    private final DiditClient client;
    public DiditVerificadorIdentidad(DiditClient client){this.client=client;}
    public Resultado consultarResultadoVerificado(String sesion){return evaluar(client.consultar(sesion));}

    public static Resultado evaluar(DiditClient.Decision d) {
        Estado estado=Estado.PENDIENTE;
        String dni="";
        if("Declined".equals(d.status())) estado=Estado.RECHAZADA;
        if("Approved".equals(d.status())) {
            if(rechazado(d.id_verifications()) || rechazado(d.liveness_checks()) || rechazado(d.face_matches())) estado=Estado.RECHAZADA;
            else if(aprobados(d.id_verifications()) && d.id_verifications().size()==1
                    && aprobados(d.liveness_checks()) && aprobados(d.face_matches())) {
                var doc=d.id_verifications().getFirst();
                if("ARG".equals(doc.issuing_state()) && "Identity Card".equals(doc.document_type())
                        && "document".equals(doc.verification_method())) {
                    String numero=normalizarDni(doc.document_number());
                    String personal=normalizarDni(doc.personal_number());
                    // No fallback guessing between identifiers. Conflicts or missing document number stay pending.
                    if(!numero.isEmpty() && (doc.personal_number()==null || doc.personal_number().isBlank() || numero.equals(personal))) {
                        dni=numero; estado=Estado.APROBADA;
                    }
                }
            }
        }
        String evidencia=d.session_id()+"|"+d.status()+"|"+estado+"|"+dni;
        try {
            String digest=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(evidencia.getBytes(StandardCharsets.UTF_8)));
            return new Resultado(d.session_id(),digest,dni,estado);
        } catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException();}
    }
    public static String normalizarDni(String valor) {
        if(valor==null)return "";
        String limpio=valor.trim();
        if(limpio.matches("[0-9]{7,8}"))return limpio;
        if(limpio.matches("[0-9]{1,2}\\.[0-9]{3}\\.[0-9]{3}"))return limpio.replace(".","");
        return "";
    }
    private static boolean aprobados(List<DiditClient.Reporte> reports){
        return reports!=null && !reports.isEmpty() && reports.stream().allMatch(r->r!=null && "Approved".equals(r.status()));
    }
    private static boolean rechazado(List<DiditClient.Reporte> reports){
        return reports!=null && reports.stream().anyMatch(r->r!=null && "Declined".equals(r.status()));
    }
}

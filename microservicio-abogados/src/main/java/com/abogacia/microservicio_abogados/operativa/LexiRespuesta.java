package com.abogacia.microservicio_abogados.operativa;

import java.util.Map;

final class LexiRespuesta {
    static Map<String, Object> normalizar(Map<?, ?> result) {
        if (result == null || !(result.get("orientacion") instanceof String texto)
                || texto.isBlank() || texto.length() > 20000) throw new IllegalStateException("Respuesta inválida");
        Object estado = result.get("estado");
        if ("FUERA_DE_ALCANCE".equals(estado)) return Map.of("orientacion", "No puedo responder esa consulta", "estado", estado, "mostrarAbogados", false);
        if ("LENGUAJE_INAPROPIADO".equals(estado)) return Map.of("orientacion", "Tu mensaje incumple las normas de uso de Lexi. Reformulá tu consulta con respeto", "estado", estado, "mostrarAbogados", false);
        if (!"RESPONDIDA".equals(estado)) throw new IllegalStateException("Clasificación incierta");
        return Map.of("orientacion", texto, "estado", estado, "mostrarAbogados", Boolean.TRUE.equals(result.get("mostrarAbogados")));
    }
}

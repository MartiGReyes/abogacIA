package com.abogacia.microservicio_ciudadanos.didit;
/** Only the trusted backend adapter implements this contract. No public callback is provided. */
public interface VerificadorIdentidad {
 record Resultado(String sesion, String evento, String dni, Estado estado) {}
 enum Estado { PENDIENTE, APROBADA, RECHAZADA }
 /** Fetch and authenticate the final decision from the provider, never accept a browser boolean. */
 Resultado consultarResultadoVerificado(String sesion);
}

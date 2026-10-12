package com.abogacia.microservicio_abogados.didit;
/** Only the trusted backend adapter implements this contract. No public callback is provided. */
public interface VerificadorIdentidad {
 /** Personal data read by the provider from the approved document. Any field may be null. */
 record DatosPersonales(String nombre, String apellido, java.time.LocalDate fechaNacimiento, String genero, String domicilio) {
  @Override public String toString(){return "DatosPersonales[datos omitidos]";}
 }
 record Resultado(String sesion, String evento, String dni, Estado estado, DatosPersonales datos) {
  public Resultado(String sesion, String evento, String dni, Estado estado){this(sesion,evento,dni,estado,null);}
  @Override public String toString(){return "Resultado[datos omitidos]";}
 }
 enum Estado { PENDIENTE, APROBADA, RECHAZADA }
 /** Fetch and authenticate the final decision from the provider, never accept a browser boolean. */
 Resultado consultarResultadoVerificado(String sesion);
}

package com.abogacia.microservicio_abogados.correo;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
@Component
public class InterfazCorreoConsola implements InterfazCorreo {
 private final boolean habilitado;
 public InterfazCorreoConsola(@Value("${abogados.correo.consola:false}") boolean habilitado) { this.habilitado=habilitado; }
 public void enviarMailConfirmacion(String mail, String codigo) {
  if (!habilitado) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
   "El envío de correo no está configurado.");
  System.out.println("Correo de desarrollo para " + mail + ": código de confirmación " + codigo);
 }
}

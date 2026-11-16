package com.abogacia.microservicio_abogados.correo;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
@Component
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="abogacia.correo.adapter",havingValue="consola",matchIfMissing=true)
public class InterfazCorreoConsola implements InterfazCorreo {
 private final boolean habilitado;
 public InterfazCorreoConsola(@Value("${abogados.correo.consola:false}") boolean habilitado) { this.habilitado=habilitado; }
 public void enviarMailConfirmacion(String mail, String codigo) {
  if (!habilitado) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
   "El envío de correo no está configurado.");
 }

 @org.springframework.beans.factory.annotation.Autowired private org.springframework.core.env.Environment environment;
 @org.springframework.beans.factory.annotation.Value("${abogacia.recuperacion.consola-enabled:false}") private boolean recoveryConsole;
 @Override public boolean recuperacionDisponible(){return recoveryConsole && environment.acceptsProfiles(org.springframework.core.env.Profiles.of("dev","desarrollo","test")) && !environment.acceptsProfiles(org.springframework.core.env.Profiles.of("beta","prod","production","produccion"));}
}

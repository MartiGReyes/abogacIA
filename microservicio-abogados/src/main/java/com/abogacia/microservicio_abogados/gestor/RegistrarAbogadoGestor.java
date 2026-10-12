package com.abogacia.microservicio_abogados.gestor;
import com.abogacia.microservicio_abogados.dto.*;
import com.abogacia.microservicio_abogados.entity.*;
import com.abogacia.microservicio_abogados.repository.*;
import com.abogacia.microservicio_abogados.correo.InterfazCorreo;
import com.abogacia.microservicio_abogados.padron.ValidarMatricula;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.*;
import java.util.*;
@Service
public class RegistrarAbogadoGestor {
 private final AbogadoRepository abogados; private final EstadoRepository estados;
 private final PadronRepository padron; private final ValidarMatricula matriculas;
 private final PasswordEncoder passwords; private final InterfazCorreo correo;
 public RegistrarAbogadoGestor(AbogadoRepository abogados,EstadoRepository estados,PadronRepository padron,ValidarMatricula matriculas,PasswordEncoder passwords,InterfazCorreo correo){
  this.abogados=abogados;this.estados=estados;this.padron=padron;this.matriculas=matriculas;this.passwords=passwords;this.correo=correo;
 }
 @Transactional public AbogadoResponse registrar(RegistrarAbogadoRequest r){
  if(!r.contrasena().equals(r.confirmarContrasena()))throw error("Las contraseñas no coinciden.");
  if(r.contrasena().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)throw error("La contraseña excede el límite de 72 bytes de BCrypt.");
  String mail=r.mail().trim().toLowerCase(Locale.ROOT);
  if(abogados.existsByDni(r.dni()))throw error("Ya existe un abogado con ese DNI.");
  if(abogados.existsByMail(mail))throw error("Ya existe un abogado con ese correo.");
  var resultado=matriculas.validar(r.nroMatricula(),r.dni(),r.colegioProfesional(),r.provincia());
  if(resultado!=ValidarMatricula.Resultado.VALIDADA && resultado!=ValidarMatricula.Resultado.PENDIENTE_REVISION)
   throw error(switch(resultado){case INEXISTENTE->"Matrícula inexistente en el padrón local.";case INACTIVA->"Matrícula no habilitada.";default->"La matrícula no corresponde al DNI ingresado.";});
  AbogadoRegistrado a=new AbogadoRegistrado();
  a.setNombre(r.nombre().trim());a.setApellido(r.apellido().trim());a.setDni(r.dni());a.setMail(mail);a.setNroCelular(r.nroCelular());
  a.setFechaNacimiento(r.fechaNacimiento());a.setGenero(r.genero());a.setDomicilio(r.domicilio());
  a.setNroMatricula(r.nroMatricula());a.setColegioProfesional(r.colegioProfesional());a.setProvincia(r.provincia());
  a.setEspecialidad(r.especialidad());a.setAniosExperiencia(r.aniosExperiencia());a.setHonorarios(r.honorarios());
  a.setUbicacion(r.ubicacion());a.setDireccionProfesional(r.direccionProfesional());a.setDescripcionProfesional(r.descripcionProfesional());
  a.setContrasenaHash(passwords.encode(r.contrasena()));a.setFechaRegistro(LocalDate.now());
  a.setVerificacionDni("PENDIENTE");a.setValidacionMatricula(resultado.name());a.setMatriculaVerificada(resultado==ValidarMatricula.Resultado.VALIDADA);
  padron.findById(r.nroMatricula()).ifPresent(a::setPadron);
  a.setEstado(estados.findByNombreEstado("PENDIENTE").orElseThrow());
  byte[] bytes=new byte[24];new java.security.SecureRandom().nextBytes(bytes);String codigo=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  a.setCodigoConfirmacion(passwords.encode(codigo));a.setConfirmacionVence(Instant.now().plusSeconds(1800));
  abogados.saveAndFlush(a);correo.enviarMailConfirmacion(mail,codigo);
  return AbogadoResponse.de(a);
 }
 // Failed attempts must commit to enforce the limit; errors are thrown after leaving this transaction by the controller.
 @Transactional public Optional<AbogadoResponse> confirmar(String mail,String codigo){
  var encontrado=abogados.findByMailForUpdate(mail.trim().toLowerCase(Locale.ROOT));
  if(encontrado.isEmpty())return Optional.empty();
  var a=encontrado.get();
  if(a.getCorreoConfirmado() || a.getCodigoConfirmacion()==null || a.getConfirmacionVence()==null || !a.getConfirmacionVence().isAfter(Instant.now()) || a.getIntentosConfirmacion()>=5)return Optional.empty();
  a.setIntentosConfirmacion(a.getIntentosConfirmacion()+1);
  if(!passwords.matches(codigo,a.getCodigoConfirmacion()))return Optional.empty();
  a.setCorreoConfirmado(true);a.setCodigoConfirmacion(null);a.setConfirmacionVence(null);actualizarEstado(a);
  return Optional.of(AbogadoResponse.de(a));
 }
 public void actualizarEstado(AbogadoRegistrado a){
  if("BAJA".equals(a.getEstado().getNombreEstado()))return;
  var actual=matriculas.validar(a.getNroMatricula(),a.getDni(),a.getColegioProfesional(),a.getProvincia());
  a.setValidacionMatricula(actual.name());
  a.setMatriculaVerificada(actual==ValidarMatricula.Resultado.VALIDADA);
  boolean habilitado=a.getCorreoConfirmado() && "APROBADA".equals(a.getVerificacionDni()) && "VALIDADA".equals(a.getValidacionMatricula());
  a.setEstado(estados.findByNombreEstado(habilitado?"REGISTRADO":"PENDIENTE").orElseThrow());
 }
 private static ResponseStatusException error(String mensaje){return new ResponseStatusException(HttpStatus.BAD_REQUEST,mensaje);}
}

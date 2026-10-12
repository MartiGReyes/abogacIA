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
import java.security.SecureRandom;
import java.time.*;
import java.util.*;
/**
 * Registro en dos tramos: la solicitud (DNI, correo y teléfono) permite validar la identidad con Didit
 * antes de crear la cuenta; la cuenta se completa con datos profesionales y contraseña.
 */
@Service
public class RegistrarAbogadoGestor {
 public static final List<String> ESPECIALIDADES=List.of("Derecho de Familia","Derecho Laboral","Derecho Penal","Derecho Civil",
  "Derecho Comercial","Derecho Inmobiliario","Derecho Administrativo","Derecho Tributario");
 static final long DURACION_SOLICITUD=3600;
 private final AbogadoRepository abogados; private final EstadoRepository estados;
 private final VerificacionIdentidadRepository verificaciones;
 private final PadronRepository padron; private final ValidarMatricula matriculas;
 private final PasswordEncoder passwords; private final InterfazCorreo correo;
 private final SecureRandom random=new SecureRandom();
 public RegistrarAbogadoGestor(AbogadoRepository abogados,EstadoRepository estados,VerificacionIdentidadRepository verificaciones,
   PadronRepository padron,ValidarMatricula matriculas,PasswordEncoder passwords,InterfazCorreo correo){
  this.abogados=abogados;this.estados=estados;this.verificaciones=verificaciones;this.padron=padron;
  this.matriculas=matriculas;this.passwords=passwords;this.correo=correo;
 }
 public record Acceso(String token,Instant vence) {
  @Override public String toString(){return "Acceso[token omitido]";}
 }

 /** Paso 1. Una solicitud anterior sin cuenta creada con el mismo DNI o correo se reemplaza. */
 @Transactional public Acceso iniciar(IniciarSolicitudRequest r){
  String mail=r.mail().trim().toLowerCase(Locale.ROOT);
  for(var existente:new LinkedHashSet<>(Arrays.asList(abogados.findByDni(r.dni()).orElse(null),abogados.findByMail(mail).orElse(null)))){
   if(existente==null)continue;
   if(!existente.esSolicitud())throw new ResponseStatusException(HttpStatus.CONFLICT,"Ya existe una cuenta profesional con ese DNI o correo.");
   verificaciones.deleteById(existente.getIdAbogado());abogados.delete(existente);
  }
  abogados.flush();
  AbogadoRegistrado a=new AbogadoRegistrado();
  a.setDni(r.dni());a.setMail(mail);a.setNroCelular(r.nroCelular().trim());
  a.setVerificacionDni("PENDIENTE");a.setFechaRegistro(LocalDate.now());
  a.setEstado(estados.findByNombreEstado("PENDIENTE").orElseThrow());
  byte[] bytes=new byte[32];random.nextBytes(bytes);
  String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  Instant vence=Instant.now().plusSeconds(DURACION_SOLICITUD);
  a.setAccesoRegistroHash(VerificacionIdentidadGestor.hash(token));a.setAccesoRegistroVence(vence);
  abogados.saveAndFlush(a);
  return new Acceso(token,vence);
 }

 /** Paso 4. Requiere la identidad aprobada por Didit; los datos personales ya vienen del documento. */
 @Transactional public AbogadoResponse completar(Long id,String token,CompletarRegistroRequest r){
  var a=abogados.findByIdForUpdate(id).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"No se pudo autorizar el acceso a la solicitud."));
  if(!VerificacionIdentidadGestor.hash(token).equals(a.getAccesoRegistroHash()) || a.getAccesoRegistroVence()==null
    || !a.getAccesoRegistroVence().isAfter(Instant.now()))throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"No se pudo autorizar el acceso a la solicitud.");
  if(!a.esSolicitud())throw new ResponseStatusException(HttpStatus.CONFLICT,"La cuenta ya fue creada.");
  if(!"APROBADA".equals(a.getVerificacionDni()))throw new ResponseStatusException(HttpStatus.CONFLICT,"Primero validá tu identidad con Didit.");
  if(a.getNombre()==null)throw new ResponseStatusException(HttpStatus.CONFLICT,"Didit no informó tu nombre. Solicitá revisión.");
  if(!r.contrasena().equals(r.confirmarContrasena()))throw error("Las contraseñas no coinciden.");
  if(r.contrasena().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)throw error("La contraseña excede el límite de 72 bytes de BCrypt.");
  var especialidades=new LinkedHashSet<>(r.especialidades());
  if(especialidades.isEmpty() || !ESPECIALIDADES.containsAll(especialidades))throw error("Seleccioná especialidades válidas.");
  String matricula=r.nroMatricula().trim();
  if(abogados.findByNroMatricula(matricula).filter(o->!o.getIdAbogado().equals(a.getIdAbogado())).isPresent())
   throw new ResponseStatusException(HttpStatus.CONFLICT,"Esa matrícula ya está registrada en otra cuenta.");
  var resultado=matriculas.validar(matricula,a.getDni(),r.colegioProfesional(),r.provincia());
  if(resultado!=ValidarMatricula.Resultado.VALIDADA && resultado!=ValidarMatricula.Resultado.PENDIENTE_REVISION)
   throw error(switch(resultado){case INEXISTENTE->"Matrícula inexistente en el padrón local.";case INACTIVA->"Matrícula no habilitada.";default->"La matrícula no corresponde al DNI validado.";});
  a.setNroMatricula(matricula);a.setColegioProfesional(r.colegioProfesional().trim());a.setProvincia(r.provincia().trim());
  a.setEspecialidades(especialidades);a.setAniosExperiencia(r.aniosExperiencia());a.setHonorarios(r.honorarios());
  a.setUbicacion(r.ubicacion().trim());a.setDireccionProfesional(r.direccionProfesional().trim());a.setDescripcionProfesional(r.descripcionProfesional().trim());
  a.setValidacionMatricula(resultado.name());a.setMatriculaVerificada(resultado==ValidarMatricula.Resultado.VALIDADA);
  padron.findById(matricula).ifPresent(a::setPadron);
  a.setContrasenaHash(passwords.encode(r.contrasena()));
  // La solicitud termina aquí: el token temporal deja de servir.
  a.setAccesoRegistroHash(null);a.setAccesoRegistroVence(null);
  String codigo="%06d".formatted(random.nextInt(1_000_000));
  a.setCodigoConfirmacion(passwords.encode(codigo));a.setConfirmacionVence(Instant.now().plusSeconds(1800));a.setIntentosConfirmacion(0);
  abogados.saveAndFlush(a);correo.enviarMailConfirmacion(a.getMail(),codigo);
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
  if(a.getNroMatricula()!=null){
   var actual=matriculas.validar(a.getNroMatricula(),a.getDni(),a.getColegioProfesional(),a.getProvincia());
   a.setValidacionMatricula(actual.name());
   a.setMatriculaVerificada(actual==ValidarMatricula.Resultado.VALIDADA);
  }
  boolean habilitado=!a.esSolicitud() && a.getCorreoConfirmado() && "APROBADA".equals(a.getVerificacionDni()) && "VALIDADA".equals(a.getValidacionMatricula());
  a.setEstado(estados.findByNombreEstado(habilitado?"REGISTRADO":"PENDIENTE").orElseThrow());
 }
 private static ResponseStatusException error(String mensaje){return new ResponseStatusException(HttpStatus.BAD_REQUEST,mensaje);}
}

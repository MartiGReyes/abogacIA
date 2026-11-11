package com.abogacia.microservicio_abogados.controller;

import com.abogacia.microservicio_abogados.dto.ModificarAbogadoRequest;

import com.abogacia.microservicio_abogados.entity.AbogadoRegistrado;

import com.abogacia.microservicio_abogados.repository.AbogadoRepository;
import com.abogacia.microservicio_abogados.repository.EstadoRepository;
import jakarta.validation.constraints.*;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;

import org.springframework.security.oauth2.jwt.Jwt;

import org.springframework.web.bind.annotation.*;

import org.springframework.web.server.ResponseStatusException;

import org.springframework.http.*;

import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@RestController

@RequestMapping("/api/abogados/me")

public class PerfilAbogadoController {

 @org.springframework.beans.factory.annotation.Autowired(required=false) private com.abogacia.microservicio_abogados.operativa.CuentaPruebaService pruebas;
 private final AbogadoRepository abogados;

 private final EstadoRepository estados;
 private final com.abogacia.microservicio_abogados.contacto.AutorizacionWhatsApp whatsapp;
 private final com.abogacia.microservicio_abogados.contacto.ProfesionalContactable contactable;
 public PerfilAbogadoController(AbogadoRepository abogados, EstadoRepository estados,com.abogacia.microservicio_abogados.contacto.AutorizacionWhatsApp whatsapp,com.abogacia.microservicio_abogados.contacto.ProfesionalContactable contactable) {this.abogados=abogados;this.estados=estados;this.whatsapp=whatsapp;this.contactable=contactable;}

 private AbogadoRegistrado titular(Jwt jwt, boolean bloquear) {

  if (!"ABOGADO".equals(jwt.getClaimAsString("rol"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Acceso exclusivo para abogados.");

  long id;

  try {id=Long.parseLong(jwt.getSubject());} catch (NumberFormatException e) {throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Titular inválido.");}

  var a=(bloquear ? abogados.findByIdForUpdate(id) : abogados.findById(id)).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Cuenta no encontrada."));

  if(a.esSolicitud() || a.getEstado()==null || !"REGISTRADO".equals(a.getEstado().getNombreEstado())) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Cuenta no habilitada.");

  if(com.abogacia.microservicio_abogados.operativa.CuentaPruebaService.marcada(a) && (pruebas==null || !pruebas.cuenta(a))) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  return a;

 }

 private ResponseEntity<Map<String,Object>> respuesta(AbogadoRegistrado a) {

  Map<String,Object> r=new LinkedHashMap<>();
  r.put("estado",a.getEstado().getNombreEstado());
  r.put("whatsappAutorizado",whatsapp.permitido(a.getIdAbogado()));
  try { validarWhatsApp(a); r.put("whatsappPuedeActivar",true); r.put("whatsappBloqueo",""); }
  catch(ResponseStatusException e){r.put("whatsappPuedeActivar",false);r.put("whatsappBloqueo",e.getReason());}
  r.put("fechaRegistro",a.getFechaRegistro());
  r.put("genero",a.getGenero());
  r.put("correoConfirmado",a.getCorreoConfirmado());
  r.put("validacionMatricula",a.getValidacionMatricula());

  r.put("nombre",a.getNombre()); r.put("apellido",a.getApellido()); r.put("dni",a.getDni());

  r.put("fechaNacimiento",a.getFechaNacimiento()); r.put("mail",a.getMail()); r.put("nroCelular",a.getNroCelular()); r.put("domicilio",a.getDomicilio());

  r.put("nroMatricula",a.getNroMatricula()); r.put("colegioProfesional",a.getColegioProfesional()); r.put("provincia",a.getProvincia());

  r.put("especialidades",a.getEspecialidades()); r.put("aniosExperiencia",a.getAniosExperiencia()); r.put("honorarios",a.getHonorarios());

  r.put("ubicacion",a.getUbicacion()); r.put("direccionProfesional",a.getDireccionProfesional()); r.put("descripcionProfesional",a.getDescripcionProfesional()); r.put("verificacionDni",a.getVerificacionDni());

  r.put("cuentaPrueba",false); if(pruebas!=null && pruebas.cuenta(a))pruebas.completarPerfil(a,r);
  return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(r);

 }

 @GetMapping @Transactional(readOnly=true)

 public ResponseEntity<Map<String,Object>> obtener(@AuthenticationPrincipal Jwt jwt) {return respuesta(titular(jwt,false));}

 @PutMapping @Transactional

 public ResponseEntity<Map<String,Object>> modificar(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody ModificarAbogadoRequest r) {

  var a=titular(jwt,true); String mail=r.mail().trim().toLowerCase(Locale.ROOT);

  if(abogados.existsByMailIgnoreCaseAndIdAbogadoNot(mail,a.getIdAbogado())) throw new ResponseStatusException(HttpStatus.CONFLICT,"El correo electrónico ya está registrado.");

  a.setNombre(r.nombre().trim()); a.setApellido(r.apellido().trim()); a.setFechaNacimiento(r.fechaNacimiento()); a.setMail(mail);

  if(pruebas!=null && pruebas.cuenta(a))pruebas.guardarTelefono(a,r.nroCelular());
  else { if(!Objects.equals(a.getNroCelular(),r.nroCelular().trim()))whatsapp.revocar(a.getIdAbogado()); a.setNroCelular(r.nroCelular().trim()); }
  a.setDomicilio(r.domicilio().trim());

  a.setEspecialidades(r.especialidades().stream().map(String::trim).distinct().toList()); a.setAniosExperiencia(r.aniosExperiencia()); a.setHonorarios(r.honorarios());

  a.setUbicacion(r.ubicacion().trim()); a.setDireccionProfesional(r.direccionProfesional().trim()); a.setDescripcionProfesional(r.descripcionProfesional().trim());

  abogados.saveAndFlush(a); return respuesta(a);

 }


 public record DniPruebaRequest(@NotBlank @Pattern(regexp="[0-9]{7,8}") String dni){@Override public String toString(){return "DniPruebaRequest[omitido]";}}
 @PostMapping("/dni-prueba") @Transactional
 public ResponseEntity<Map<String,Object>> dniPrueba(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody DniPruebaRequest request){
  var a=titular(jwt,true);if(pruebas==null || !pruebas.cuenta(a))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  pruebas.guardarDni(a,request.dni());return respuesta(a);
 }
 public record BajaRequest(@NotNull Boolean confirmacion, @NotBlank @Email @Size(max=255) String mail) {
  @Override public String toString() { return "BajaRequest[datos omitidos]"; }
 }
 public record WhatsAppRequest(@NotNull Boolean permitido) {}
 private void validarWhatsApp(AbogadoRegistrado a){
  if(pruebas!=null && pruebas.cuenta(a)){
   try{com.abogacia.microservicio_abogados.operativa.DatosOperativos.telefono(pruebas.telefono(a));}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Guardá un celular argentino válido en Contacto por WhatsApp antes de activar la opción.");}
   if(pruebas.dni(a).isBlank())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Guardá tu DNI en la sección de cuenta de prueba antes de activar WhatsApp.");
  }else{
   if(!contactable.habilitado(a))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Se requiere habilitación profesional vigente para recibir consultas por WhatsApp.");
   try{com.abogacia.microservicio_abogados.operativa.DatosOperativos.telefono(a.getNroCelular());}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Guardá un celular argentino válido en Contacto por WhatsApp antes de activar la opción.");}
  }
 }
 public record TelefonoWhatsAppRequest(@NotBlank @Size(max=35) String telefono){
  @Override public String toString(){return "TelefonoWhatsAppRequest[omitido]";}
 }
 @PutMapping("/whatsapp/telefono") @Transactional
 public ResponseEntity<Map<String,Object>> telefonoWhatsApp(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody TelefonoWhatsAppRequest request){
  var a=titular(jwt,true);
  if(pruebas!=null && pruebas.cuenta(a))pruebas.guardarTelefono(a,request.telefono());
  else{
   String numero;try{numero=com.abogacia.microservicio_abogados.operativa.DatosOperativos.telefono(request.telefono());}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Ingresá un celular argentino válido: +54 9, área y número sin 0 ni 15.");}
   String anterior="";try{anterior=com.abogacia.microservicio_abogados.operativa.DatosOperativos.telefono(a.getNroCelular());}catch(IllegalArgumentException ignored){}
   if(!numero.equals(anterior))whatsapp.revocar(a.getIdAbogado());a.setNroCelular(numero);
  }
  abogados.saveAndFlush(a);return respuesta(a);
 }
 @PostMapping("/whatsapp") @Transactional
 public ResponseEntity<Map<String,Object>> permisoWhatsApp(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody WhatsAppRequest request){
  var a=titular(jwt,false);
  if(Boolean.TRUE.equals(request.permitido()))validarWhatsApp(a);
  whatsapp.guardar(a.getIdAbogado(),Boolean.TRUE.equals(request.permitido()));return respuesta(a);
 }
 @PostMapping("/baja") @Transactional
 public ResponseEntity<Map<String,String>> baja(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody BajaRequest request) {
  var a=titular(jwt,true);
  if (!Boolean.TRUE.equals(request.confirmacion()) || !a.getMail().equalsIgnoreCase(request.mail().trim()))
   throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Para confirmar la baja, ingresa el correo de tu cuenta y confirma la operacion.");
  var estado=estados.findByNombreEstado("BAJA").orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,"No se pudo registrar la baja. Intenta nuevamente."));
  a.setEstado(estado);
  a.setAccesoRegistroHash(null);a.setAccesoRegistroVence(null);
  a.setCodigoConfirmacion(null);a.setConfirmacionVence(null);
  abogados.saveAndFlush(a);
  return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("estado","BAJA","mensaje","Tu cuenta de abogado fue dada de baja correctamente."));
 }
}


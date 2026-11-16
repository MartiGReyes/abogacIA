package com.abogacia.microservicio_ciudadanos.correo;
@org.springframework.stereotype.Service
public class ReenviarConfirmacion {
 private final com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository repository;
 private final InterfazCorreo correo;private final org.springframework.security.crypto.password.PasswordEncoder passwords;
 public ReenviarConfirmacion(com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository r,InterfazCorreo c,org.springframework.security.crypto.password.PasswordEncoder p){repository=r;correo=c;passwords=p;}
 @org.springframework.transaction.annotation.Transactional public void enviar(String mail){
  var found=repository.findByMailForUpdate(mail.trim().toLowerCase(java.util.Locale.ROOT));if(found.isEmpty())return;var a=found.get();
  if(Boolean.TRUE.equals(a.getCorreoConfirmado())||!"PENDIENTE".equals(a.getEstado().getNombreEstado()))return;

  long deadline=0;try{deadline=Long.parseLong(a.getCodigoConfirmacion().split(":")[1]);}catch(Exception ignored){}
  if(deadline>java.time.Instant.now().plusSeconds(1740).getEpochSecond())return;
  String code=com.abogacia.microservicio_ciudadanos.correo.TokenCorreo.nuevo();
  a.setCodigoConfirmacion(com.abogacia.microservicio_ciudadanos.correo.TokenCorreo.guardar(code));
  repository.saveAndFlush(a);correo.enviarMailConfirmacion(a.getMail(),code);
 }
}

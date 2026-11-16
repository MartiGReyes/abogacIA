package com.abogacia.microservicio_abogados.correo;
@org.springframework.stereotype.Service
public class ReenviarConfirmacion {
 private final com.abogacia.microservicio_abogados.repository.AbogadoRepository repository;
 private final InterfazCorreo correo;private final org.springframework.security.crypto.password.PasswordEncoder passwords;
 public ReenviarConfirmacion(com.abogacia.microservicio_abogados.repository.AbogadoRepository r,InterfazCorreo c,org.springframework.security.crypto.password.PasswordEncoder p){repository=r;correo=c;passwords=p;}
 @org.springframework.transaction.annotation.Transactional public void enviar(String mail){
  var found=repository.findByMailForUpdate(mail.trim().toLowerCase(java.util.Locale.ROOT));if(found.isEmpty())return;var a=found.get();
  if(Boolean.TRUE.equals(a.getCorreoConfirmado())||!"PENDIENTE".equals(a.getEstado().getNombreEstado()))return;

  if(a.esSolicitud())return;
  if(a.getConfirmacionVence()!=null&&a.getConfirmacionVence().isAfter(java.time.Instant.now().plusSeconds(1740)))return;
  String code="%06d".formatted(new java.security.SecureRandom().nextInt(1000000));
  a.setCodigoConfirmacion(passwords.encode(code));a.setConfirmacionVence(java.time.Instant.now().plusSeconds(1800));a.setIntentosConfirmacion(0);
  repository.saveAndFlush(a);correo.enviarMailConfirmacion(a.getMail(),code);
 }
}

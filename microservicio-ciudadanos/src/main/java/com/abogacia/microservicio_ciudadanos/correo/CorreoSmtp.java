package com.abogacia.microservicio_ciudadanos.correo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
/** Opt-in SMTP adapter. JavaMailSender uses external spring.mail configuration; no credentials in code. */
@Component
@ConditionalOnProperty(name="abogacia.correo.adapter",havingValue="smtp")
public class CorreoSmtp implements InterfazCorreo {
 @Value("${abogacia.correo.enabled:false}") private boolean enabled=true;
 @Value("${abogacia.frontend.url:http://localhost:5173}") private String frontend="http://localhost:5173";
 @org.springframework.beans.factory.annotation.Autowired private CuotaCorreo cuota=new CuotaCorreo();
 private final JavaMailSender sender; private final String from;
 public CorreoSmtp(JavaMailSender sender,@Value("${abogacia.correo.from}") String from){
  if(from==null||!from.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))throw new IllegalArgumentException("Remitente de correo inválido");
  this.sender=sender;this.from=from;
 }
 private void send(String to,String subject,String text){
  if(!enabled)throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"El correo no está habilitado.");
  cuota.reservar(to);
  var message=new SimpleMailMessage();message.setFrom(from);message.setTo(to);message.setSubject(subject);message.setText(text);try{sender.send(message);}catch(org.springframework.mail.MailException ex){throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"No se pudo enviar el correo. Intentá nuevamente más tarde.");}
 }
 @Override public void enviarMailConfirmacion(String mail,String code){send(mail,"abogacIA · Confirmación CIUDADANO","Código para confirmar tu cuenta CIUDADANO: "+code+". No lo compartas.");}
 @Override public boolean recuperacionDisponible(){return enabled;}

 private String enlace(String token){
  var uri=java.net.URI.create(frontend);
  if(uri.getHost()==null||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null||!("https".equals(uri.getScheme())||("http".equals(uri.getScheme())&&java.util.Set.of("localhost","127.0.0.1").contains(uri.getHost()))))throw new IllegalStateException("URL de frontend inválida");
  return frontend.replaceAll("/+$","")+"/recuperar-acceso?cuenta=CIUDADANO#token="+java.net.URLEncoder.encode(token,java.nio.charset.StandardCharsets.UTF_8);
 }
 @Override public void enviarRecuperacion(String mail,String token){send(mail,"abogacIA · Recuperación CIUDADANO","Solicitaste recuperar tu cuenta CIUDADANO. Abrí este enlace: "+enlace(token)+"\n En la aplicación abogacIA, abrí Recuperar acceso y seleccioná CIUDADANO. Código de recuperación: "+token+". Vence en 15 minutos y se usa una sola vez. Si no lo solicitaste, ignorá este correo.");}
}

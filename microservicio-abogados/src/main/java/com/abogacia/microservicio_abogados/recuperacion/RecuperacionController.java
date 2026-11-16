package com.abogacia.microservicio_abogados.recuperacion;
import java.time.*;
import java.util.*;
import java.security.*;
import java.nio.charset.StandardCharsets;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import com.abogacia.microservicio_abogados.correo.InterfazCorreo;
/** Opt-in, role-local, single-use recovery. No schema or data bootstrap. */
@RestController
@RequestMapping("/api/abogados/recuperacion")
public class RecuperacionController {
 private final JdbcTemplate jdbc; private final PasswordEncoder passwords; private final InterfazCorreo correo;
 private final boolean enabled; private final SecureRandom random=new SecureRandom();
 public RecuperacionController(JdbcTemplate j,PasswordEncoder p,InterfazCorreo c,@Value("${abogacia.recuperacion.enabled:false}") boolean e){jdbc=j;passwords=p;correo=c;enabled=e;}
 public record Solicitud(@NotBlank @Email @Size(max=254) String mail){
  public Solicitud {mail=com.abogacia.microservicio_abogados.correo.CorreoNormalizado.normalizar(mail);}
@Override public String toString(){return "Solicitud[omitida]";}}
 public record Confirmacion(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{43}") String token,@NotBlank @Size(min=8,max=72) String contrasena,@NotBlank String confirmarContrasena){@Override public String toString(){return "Confirmacion[omitida]";}}
 private void disponible(){if(!enabled||!correo.recuperacionDisponible())throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"La recuperación de contraseña no está disponible temporalmente.");}
 private static Map<String,String> respuesta(){return Map.of("mensaje","Si la cuenta permite recuperar el acceso, recibirás las instrucciones.");}
 private static String hash(String token){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(("abogados:"+token).getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException();}}
 @PostMapping("/solicitar") @Transactional
 public Map<String,String> solicitar(@Valid @RequestBody Solicitud r){
  disponible();
  var cuentas=jdbc.queryForList("select a.id_abogado id,a.mail from abogados_registrados a join estado e on e.id_estado=a.id_estado where lower(btrim(a.mail))=? and a.contrasena_hash is not null and a.correo_confirmado=true and e.nombre_estado not in ('BAJA','SUSPENDIDO') for update of a",r.mail().trim().toLowerCase(Locale.ROOT));
  if(cuentas.size()!=1)return respuesta();
  long id=((Number)cuentas.getFirst().get("id")).longValue();
  var recientes=jdbc.queryForList("select cuenta_id from recuperacion_cuenta where cuenta_id=? and solicitada_en>CURRENT_TIMESTAMP-INTERVAL '60 seconds'",id);
  if(!recientes.isEmpty())return respuesta();
  byte[] bytes=new byte[32];random.nextBytes(bytes);String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  jdbc.update("insert into recuperacion_cuenta(cuenta_id,token_hash,vence,solicitada_en) values(?,?,CURRENT_TIMESTAMP+INTERVAL '15 minutes',CURRENT_TIMESTAMP) on conflict(cuenta_id) do update set token_hash=excluded.token_hash,vence=excluded.vence,solicitada_en=excluded.solicitada_en",id,hash(token));
  try { correo.enviarRecuperacion((String)cuentas.getFirst().get("mail"),token); } catch(org.springframework.web.server.ResponseStatusException ex) { if(ex.getStatusCode().value()!=503&&ex.getStatusCode().value()!=429)throw ex;org.springframework.transaction.interceptor.TransactionAspectSupport.currentTransactionStatus().setRollbackOnly(); }
  return respuesta();
 }
 @PostMapping("/confirmar") @Transactional
 public Map<String,String> confirmar(@Valid @RequestBody Confirmacion r){
  disponible();if(!r.contrasena().equals(r.confirmarContrasena())||r.contrasena().getBytes(StandardCharsets.UTF_8).length>72)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Revisá la contraseña y su confirmación.");
  // Lock the account before its token, the same order as request, to avoid lock inversion.
  var ids=jdbc.queryForList("select a.id_abogado id from abogados_registrados a join recuperacion_cuenta t on t.cuenta_id=a.id_abogado where t.token_hash=? for update of a",hash(r.token()));
  if(ids.isEmpty())throw invalido();long id=((Number)ids.getFirst().get("id")).longValue();
  var tokens=jdbc.queryForList("select cuenta_id from recuperacion_cuenta where cuenta_id=? and token_hash=? and vence>CURRENT_TIMESTAMP for update",id,hash(r.token()));
  if(tokens.isEmpty())throw invalido();
  int changed=jdbc.update("update abogados_registrados set contrasena_hash=? where id_abogado=? and correo_confirmado=true and id_estado in(select id_estado from estado where nombre_estado not in ('BAJA','SUSPENDIDO'))",passwords.encode(r.contrasena()),id);
  if(changed!=1)throw invalido();jdbc.update("delete from recuperacion_cuenta where cuenta_id=?",id);
  return Map.of("mensaje","Contraseña actualizada. Iniciá sesión con esta cuenta.");
 }
 private static ResponseStatusException invalido(){return new ResponseStatusException(HttpStatus.BAD_REQUEST,"El acceso de recuperación no es válido o venció.");}
}

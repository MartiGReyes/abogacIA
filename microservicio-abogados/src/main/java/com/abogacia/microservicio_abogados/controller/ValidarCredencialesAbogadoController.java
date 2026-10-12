package com.abogacia.microservicio_abogados.controller;
import com.abogacia.microservicio_abogados.repository.AbogadoRepository;
import com.abogacia.microservicio_abogados.padron.ValidarMatricula;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;
@RestController
@RequestMapping("/api/interno/abogados")
public class ValidarCredencialesAbogadoController {
 public record Request(@NotBlank @Email String mail,@NotBlank @Size(max=72) String contrasena){
  @Override public String toString(){return "Request[credenciales omitidas]";}
 }
 private final AbogadoRepository abogados;private final PasswordEncoder passwords;private final ValidarMatricula matriculas;private final String dummy;
 public ValidarCredencialesAbogadoController(AbogadoRepository abogados,PasswordEncoder passwords,ValidarMatricula matriculas){
  this.abogados=abogados;this.passwords=passwords;this.matriculas=matriculas;this.dummy=passwords.encode(UUID.randomUUID().toString());
 }
 @PostMapping("/validar-credenciales") public Map<String,Long> validar(@Valid @RequestBody Request r){
  var a=abogados.findByMail(r.mail().trim().toLowerCase(Locale.ROOT)).orElse(null);
  boolean coincide=passwords.matches(r.contrasena(),a==null?dummy:a.getContrasenaHash());
  if(a==null || !coincide || !a.getCorreoConfirmado() || !"APROBADA".equals(a.getVerificacionDni()) || !"VALIDADA".equals(a.getValidacionMatricula()) || a.getEstado()==null || !"REGISTRADO".equals(a.getEstado().getNombreEstado())
    || matriculas.validar(a.getNroMatricula(),a.getDni(),a.getColegioProfesional(),a.getProvincia())!=ValidarMatricula.Resultado.VALIDADA)
   throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Credenciales incorrectas.");
  return Map.of("idAbogado",a.getIdAbogado());
 }
}

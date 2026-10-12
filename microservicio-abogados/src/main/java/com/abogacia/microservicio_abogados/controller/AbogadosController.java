package com.abogacia.microservicio_abogados.controller;
import com.abogacia.microservicio_abogados.dto.*;
import com.abogacia.microservicio_abogados.gestor.RegistrarAbogadoGestor;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
/** El alta se hace en /api/abogados/verificacion/solicitud y /cuenta; aquí queda la confirmación del correo. */
@RestController
@RequestMapping("/api/abogados")
public class AbogadosController {
 public record ConfirmarRequest(@NotBlank @Email String mail,@NotBlank @Size(max=128) String codigo) {
  @Override public String toString(){return "ConfirmarRequest[datos omitidos]";}
 }
 private final RegistrarAbogadoGestor registro;
 public AbogadosController(RegistrarAbogadoGestor registro){this.registro=registro;}
 @PostMapping("/confirmar") public AbogadoResponse confirmar(@Valid @RequestBody ConfirmarRequest request){
  return registro.confirmar(request.mail(),request.codigo()).orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST,"Código inválido, vencido o sin intentos disponibles."));
 }
}

package com.abogacia.microservicio_abogados.controller;
@org.springframework.web.bind.annotation.RestController
@org.springframework.web.bind.annotation.RequestMapping("/api/abogados/correo")
public class ReenviarCorreoController {
 private final com.abogacia.microservicio_abogados.correo.ReenviarConfirmacion servicio;
 public ReenviarCorreoController(com.abogacia.microservicio_abogados.correo.ReenviarConfirmacion s){servicio=s;}
 public record Solicitud(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Email @jakarta.validation.constraints.Size(max=254) String mail){
  public Solicitud {mail=com.abogacia.microservicio_abogados.correo.CorreoNormalizado.normalizar(mail);}
@Override public String toString(){return "Solicitud[omitida]";}}
 @org.springframework.web.bind.annotation.PostMapping("/reenviar")
 public java.util.Map<String,String> reenviar(@jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody Solicitud r){
  try{servicio.enviar(r.mail());}catch(org.springframework.web.server.ResponseStatusException ex){if(ex.getStatusCode().value()!=503&&ex.getStatusCode().value()!=429)throw ex;}
  return java.util.Map.of("mensaje","Si la cuenta tiene un correo pendiente, recibirás las instrucciones. Esperá un minuto antes de volver a solicitarlo.");
 }
}

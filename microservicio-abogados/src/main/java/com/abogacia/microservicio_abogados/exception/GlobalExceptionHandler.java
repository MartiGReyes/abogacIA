package com.abogacia.microservicio_abogados.exception;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.*;
import org.springframework.dao.DataIntegrityViolationException;
import java.util.Map;
@RestControllerAdvice
public class GlobalExceptionHandler {
 @ExceptionHandler(ResponseStatusException.class) ResponseEntity<Map<String,String>> estado(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("error",e.getReason()));}
 @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<Map<String,String>> validar(MethodArgumentNotValidException e){
  String campos=e.getBindingResult().getFieldErrors().stream().map(x->x.getField()).distinct().sorted().collect(java.util.stream.Collectors.joining(", "));
  return ResponseEntity.badRequest().body(Map.of("error","Revisá los campos: "+campos));
 }
 @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class) ResponseEntity<Map<String,String>> formato(){return ResponseEntity.badRequest().body(Map.of("error","Solicitud inválida o campos no permitidos."));}
 @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<Map<String,String>> duplicado(){return ResponseEntity.status(409).body(Map.of("error","Los datos entran en conflicto con un registro existente."));}
}

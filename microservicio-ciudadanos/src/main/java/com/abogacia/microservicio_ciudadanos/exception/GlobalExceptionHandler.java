package com.abogacia.microservicio_ciudadanos.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
 @org.springframework.web.bind.annotation.ExceptionHandler(org.springframework.dao.IncorrectResultSizeDataAccessException.class) public org.springframework.http.ResponseEntity<java.util.Map<String,String>> ambiguo(){return org.springframework.http.ResponseEntity.status(409).body(java.util.Map.of("error","No se puede identificar la cuenta de forma inequívoca. Contactá con soporte."));}
 @org.springframework.web.bind.annotation.ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class) public org.springframework.http.ResponseEntity<java.util.Map<String,String>> conflicto(){return org.springframework.http.ResponseEntity.status(409).body(java.util.Map.of("error","Los datos entran en conflicto con un registro existente."));}

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleStatus(
            org.springframework.web.server.ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
                .body(Map.of("error", ex.getReason() == null ? "Acceso denegado." : ex.getReason()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(
            IllegalArgumentException ex
    ) {

        Map<String, String> response = new HashMap<>();

        response.put("error", ex.getMessage());

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(
            MethodArgumentNotValidException ex
    ) {

        Map<String, String> errors = new HashMap<>();

        ex.getBindingResult()
                .getFieldErrors()
                .forEach(error ->
                        errors.put(
                                error.getField(),
                                error.getDefaultMessage()
                        )
                );

        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(errors);
    }
}

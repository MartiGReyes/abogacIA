package com.abogacia.microservicio_abogados.extension;
import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.abogacia.microservicio_abogados.contacto.ContactoWhatsAppController;
@RestControllerAdvice(assignableTypes={ContactosController.class,ValoracionesController.class,ContactoWhatsAppController.class,EstadisticasContactoController.class})
public class ErroresSolicitudes {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> esperado(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("error",e.getReason()==null?"No se pudo completar la operación.":e.getReason()));}
    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<?> datos(DataAccessException e){return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error","No se pudo guardar o recuperar la información. Intentá nuevamente."));}
}

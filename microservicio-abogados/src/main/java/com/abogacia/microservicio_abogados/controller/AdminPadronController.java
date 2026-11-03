package com.abogacia.microservicio_abogados.controller;

import com.abogacia.microservicio_abogados.padron.ImportarPadron;
import com.abogacia.microservicio_abogados.repository.*;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@RestController
@Profile("!admin-readonly-test & !abogados-dev")
@RequestMapping("/api/admin/abogados/padron")
public class AdminPadronController {
    private final ImportarPadron importar;
    private final PadronRepository padron;
    private final PadronEvidenciaRepository evidencias;
    public AdminPadronController(ImportarPadron importar, PadronRepository padron, PadronEvidenciaRepository evidencias) {
        this.importar = importar; this.padron = padron; this.evidencias = evidencias;
    }
    public record Resumen(long matriculasAlmacenadas, long filas, List<String> versiones) {}
    @GetMapping
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    public ResponseEntity<Resumen> resumen() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(new Resumen(padron.count(), evidencias.count(), evidencias.versionesActuales()));
    }
    @PostMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportarPadron.Resultado> actualizar(@RequestParam MultipartFile archivo, @RequestParam boolean confirmacion) {
        if (!confirmacion) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Confirmá el reemplazo del padrón.");
        String nombre = archivo.getOriginalFilename();
        if (archivo.isEmpty() || archivo.getSize() > 8 * 1024 * 1024 || nombre == null || !nombre.toLowerCase(Locale.ROOT).endsWith(".xlsx"))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccioná un archivo .xlsx de hasta 8 MiB.");
        try {
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(importar.importar(archivo.getBytes()));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El padrón no cumple el formato de cinco hojas esperado. No se aplicaron cambios.");
        } catch (java.io.IOException | org.apache.poi.openxml4j.exceptions.OpenXML4JException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo leer el Excel. No se aplicaron cambios.");
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "No se pudo actualizar el padrón. La operación se revirtió; consultá el estado antes de reintentar.");
        }
    }
}

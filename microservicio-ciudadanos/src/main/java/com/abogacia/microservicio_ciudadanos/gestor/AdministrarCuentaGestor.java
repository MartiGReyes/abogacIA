package com.abogacia.microservicio_ciudadanos.gestor;

import com.abogacia.microservicio_ciudadanos.entity.Estado;
import com.abogacia.microservicio_ciudadanos.repository.*;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
@Profile("!admin-readonly-test")
public class AdministrarCuentaGestor {
    private final CiudadanoRepository cuentas;
    private final EstadoRepository estados;
    public AdministrarCuentaGestor(CiudadanoRepository cuentas, EstadoRepository estados) {
        this.cuentas = cuentas; this.estados = estados; 
    }
    public record Resultado(Long id, String estadoCuenta) {}

    @Transactional
    public Resultado cambiar(Long id, boolean suspender) {
        if (id == null || id <= 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador inválido.");
        var registrado = estados.bloquearAdministracion().orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Falta el estado REGISTRADO."));
        var c = cuentas.findByIdForUpdate(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cuenta no encontrada."));
        String actual = c.getEstado() == null ? "" : c.getEstado().getNombreEstado();
        if (suspender) {
            if ("SUSPENDIDO".equals(actual)) return new Resultado(id, actual);
            if (!java.util.Set.of("REGISTRADO", "PENDIENTE").contains(actual))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Solo se pueden suspender cuentas registradas o pendientes; una baja no se reactiva.");
            var suspendido = estados.findByNombreEstado("SUSPENDIDO").orElseGet(() -> {
                var nuevo = new Estado(); nuevo.setNombreEstado("SUSPENDIDO"); return estados.saveAndFlush(nuevo);
            });
            c.setEstado(suspendido);
            c.setAccesoRegistroHash(null); c.setAccesoRegistroVence(null);
        } else {
            if (!"SUSPENDIDO".equals(actual)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Solo se puede rehabilitar una cuenta suspendida.");
            boolean habilitada = c.getCorreoConfirmado() && "APROBADA".equals(c.getVerificacionDni());
            c.setEstado(habilitada ? registrado : estados.findByNombreEstado("PENDIENTE")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT, "Falta el estado PENDIENTE.")));
        }
        cuentas.saveAndFlush(c);
        return new Resultado(id, c.getEstado().getNombreEstado());
    }
}

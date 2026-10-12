package com.abogacia.microservicio_ciudadanos.gestor;

import com.abogacia.microservicio_ciudadanos.didit.DiditVerificadorIdentidad;
import com.abogacia.microservicio_ciudadanos.didit.VerificadorIdentidad;
import com.abogacia.microservicio_ciudadanos.entity.Ciudadano;
import com.abogacia.microservicio_ciudadanos.repository.EstadoRepository;
import org.springframework.stereotype.Service;

@Service
public class VerificarDniCiudadanoGestor {
    private final EstadoRepository estados;

    public VerificarDniCiudadanoGestor(EstadoRepository estados) { this.estados = estados; }

    /** Trusted backend adapter only. Must run inside the transaction that holds the account lock. */
    public void aplicar(Ciudadano c, VerificadorIdentidad.Resultado r) {
        if (r == null || !c.getSesionDidit().equals(r.sesion()) || r.evento() == null || r.evento().isBlank() || r.estado() == null)
            throw new IllegalArgumentException("Resultado de identidad inválido.");
        if ("BAJA".equals(c.getEstado().getNombreEstado())) return;
        c.setResultadoDiditId(r.evento());
        // The DNI read from the physical document must be the registered one.
        boolean coincide = DiditVerificadorIdentidad.coincideDni(c.getDni(), r.dni());
        c.setVerificacionDni(r.estado() == VerificadorIdentidad.Estado.APROBADA && !coincide ? "RECHAZADA" : r.estado().name());
        actualizarEstado(c);
    }

    /** Correo confirmado + identidad APROBADA pasan a REGISTRADO. BAJA nunca se reactiva. */
    public void actualizarEstado(Ciudadano c) {
        if (!"PENDIENTE".equals(c.getEstado().getNombreEstado())) return;
        if (c.getCorreoConfirmado() && "APROBADA".equals(c.getVerificacionDni())) {
            c.setEstado(estados.findByNombreEstado("REGISTRADO")
                    .orElseThrow(() -> new IllegalStateException("No existe el estado REGISTRADO.")));
        }
    }
}

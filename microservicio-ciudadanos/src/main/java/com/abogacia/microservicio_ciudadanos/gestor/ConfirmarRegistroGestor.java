package com.abogacia.microservicio_ciudadanos.gestor;

import com.abogacia.microservicio_ciudadanos.dto.CiudadanoResponse;
import com.abogacia.microservicio_ciudadanos.dto.ConfirmarRegistroRequest;
import com.abogacia.microservicio_ciudadanos.entity.Ciudadano;
import com.abogacia.microservicio_ciudadanos.entity.Estado;
import com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository;
import com.abogacia.microservicio_ciudadanos.repository.EstadoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConfirmarRegistroGestor {

    private final CiudadanoRepository ciudadanoRepository;
    private final EstadoRepository estadoRepository;

    public ConfirmarRegistroGestor(
            CiudadanoRepository ciudadanoRepository,
            EstadoRepository estadoRepository
    ) {
        this.ciudadanoRepository = ciudadanoRepository;
        this.estadoRepository = estadoRepository;
    }

    @Transactional
    public CiudadanoResponse confirmar(
            ConfirmarRegistroRequest request
    ) {

        Ciudadano ciudadano = ciudadanoRepository
                .findByCodigoConfirmacion(request.getCodigo())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "El código de confirmación es incorrecto."
                        )
                );

        Estado estadoRegistrado = estadoRepository
                .findByNombreEstado("REGISTRADO")
                .orElseThrow(() ->
                        new IllegalStateException(
                                "No existe el estado REGISTRADO."
                        )
                );

        ciudadano.setEstado(estadoRegistrado);

        // Una vez utilizado, eliminamos el código de confirmación.
        ciudadano.setCodigoConfirmacion(null);

        ciudadanoRepository.save(ciudadano);

        return new CiudadanoResponse(ciudadano);
    }
}
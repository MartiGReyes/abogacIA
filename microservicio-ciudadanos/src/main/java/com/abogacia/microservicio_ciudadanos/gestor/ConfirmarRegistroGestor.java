package com.abogacia.microservicio_ciudadanos.gestor;

import com.abogacia.microservicio_ciudadanos.dto.CiudadanoResponse;
import com.abogacia.microservicio_ciudadanos.dto.ConfirmarRegistroRequest;
import com.abogacia.microservicio_ciudadanos.entity.Ciudadano;
import com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConfirmarRegistroGestor {

    private final CiudadanoRepository ciudadanoRepository;
    private final VerificarDniCiudadanoGestor verificarDniCiudadanoGestor;

    public ConfirmarRegistroGestor(
            CiudadanoRepository ciudadanoRepository,
            VerificarDniCiudadanoGestor verificarDniCiudadanoGestor
    ) {
        this.ciudadanoRepository = ciudadanoRepository;
        this.verificarDniCiudadanoGestor = verificarDniCiudadanoGestor;
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

        // La cuenta sigue PENDIENTE hasta que Didit apruebe la identidad.
        ciudadano.setCorreoConfirmado(true);
        verificarDniCiudadanoGestor.actualizarEstado(ciudadano);

        // Una vez utilizado, eliminamos el código de confirmación.
        ciudadano.setCodigoConfirmacion(null);

        ciudadanoRepository.save(ciudadano);

        return new CiudadanoResponse(ciudadano);
    }
}

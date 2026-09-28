package com.abogacia.microservicio_ciudadanos.gestor;

import com.abogacia.microservicio_ciudadanos.dto.CiudadanoResponse;
import com.abogacia.microservicio_ciudadanos.entity.Ciudadano;
import com.abogacia.microservicio_ciudadanos.entity.Estado;
import com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository;
import com.abogacia.microservicio_ciudadanos.repository.EstadoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrarBajaCiudadanoGestor {

    private final CiudadanoRepository ciudadanoRepository;
    private final EstadoRepository estadoRepository;

    public RegistrarBajaCiudadanoGestor(
            CiudadanoRepository ciudadanoRepository,
            EstadoRepository estadoRepository
    ) {
        this.ciudadanoRepository = ciudadanoRepository;
        this.estadoRepository = estadoRepository;
    }

    @Transactional
    public CiudadanoResponse darDeBaja(String cuil) {

        Ciudadano ciudadano = ciudadanoRepository
                .findByCuil(cuil)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "No existe un ciudadano con ese CUIL."
                        )
                );

        if (!"REGISTRADO".equals(
                ciudadano.getEstado().getNombreEstado()
        )) {

            throw new IllegalArgumentException(
                    "Solo se puede dar de baja un ciudadano registrado."
            );
        }

        Estado estadoBaja = estadoRepository
                .findByNombreEstado("BAJA")
                .orElseThrow(() ->
                        new IllegalStateException(
                                "No existe el estado BAJA."
                        )
                );

        ciudadano.setEstado(estadoBaja);

        Ciudadano actualizado =
                ciudadanoRepository.save(ciudadano);

        return new CiudadanoResponse(actualizado);
    }
}
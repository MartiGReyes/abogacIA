package com.abogacia.microservicio_ciudadanos.gestor;

import com.abogacia.microservicio_ciudadanos.dto.CiudadanoResponse;
import com.abogacia.microservicio_ciudadanos.entity.Ciudadano;
import com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository;
import org.springframework.stereotype.Service;

@Service
public class ConsultarCiudadanoGestor {

    private final CiudadanoRepository ciudadanoRepository;

    public ConsultarCiudadanoGestor(
            CiudadanoRepository ciudadanoRepository
    ) {
        this.ciudadanoRepository = ciudadanoRepository;
    }

    public CiudadanoResponse consultar(String dni) {

        Ciudadano ciudadano = ciudadanoRepository
                .findByDni(dni)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "No existe un ciudadano con ese DNI."
                        )
                );

        return new CiudadanoResponse(ciudadano);
    }
}
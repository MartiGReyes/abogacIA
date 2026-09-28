package com.abogacia.microservicio_ciudadanos.gestor;

import com.abogacia.microservicio_ciudadanos.dto.CiudadanoResponse;
import com.abogacia.microservicio_ciudadanos.dto.ModificarCiudadanoRequest;
import com.abogacia.microservicio_ciudadanos.entity.Ciudadano;
import com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ModificarCiudadanoGestor {

    private final CiudadanoRepository ciudadanoRepository;

    public ModificarCiudadanoGestor(
            CiudadanoRepository ciudadanoRepository
    ) {
        this.ciudadanoRepository = ciudadanoRepository;
    }

    @Transactional
    public CiudadanoResponse modificar(
            String cuil,
            ModificarCiudadanoRequest request
    ) {

        Ciudadano ciudadano = ciudadanoRepository
                .findByCuil(cuil)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "No existe un ciudadano con ese CUIL."
                        )
                );

        if (!ciudadano.getMail().equals(request.getMail())
                && ciudadanoRepository.existsByMail(request.getMail())) {

            throw new IllegalArgumentException(
                    "El correo ya pertenece a otro ciudadano."
            );
        }

        ciudadano.setNombre(request.getNombre());
        ciudadano.setApellido(request.getApellido());
        ciudadano.setDireccion(request.getDireccion());
        ciudadano.setMail(request.getMail());
        ciudadano.setNroCelular(request.getNroCelular());

        Ciudadano actualizado =
                ciudadanoRepository.save(ciudadano);

        return new CiudadanoResponse(actualizado);
    }
}
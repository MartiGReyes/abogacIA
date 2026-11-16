package com.abogacia.microservicio_ciudadanos.gestor;

import com.abogacia.microservicio_ciudadanos.dto.CiudadanoResponse;
import com.abogacia.microservicio_ciudadanos.dto.ModificarCiudadanoRequest;
import com.abogacia.microservicio_ciudadanos.entity.Ciudadano;
import com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;

@Service
public class ModificarCiudadanoGestor {

    @org.springframework.beans.factory.annotation.Autowired private com.abogacia.microservicio_ciudadanos.correo.CambiarCorreo cambioCorreo;
    private final CiudadanoRepository ciudadanoRepository;

    public ModificarCiudadanoGestor(
            CiudadanoRepository ciudadanoRepository
    ) {
        this.ciudadanoRepository = ciudadanoRepository;
    }

    @Transactional
    public CiudadanoResponse modificar(
            String dni,
            ModificarCiudadanoRequest request
    ) {

        Ciudadano ciudadano = ciudadanoRepository
                .findByDniForUpdate(dni)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "No existe un ciudadano con ese DNI."
                        )
                );

        if (ciudadano.getEstado() == null || !"REGISTRADO".equals(ciudadano.getEstado().getNombreEstado()))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Cuenta no habilitada.");

        if (!com.abogacia.microservicio_ciudadanos.correo.CorreoNormalizado.normalizar(ciudadano.getMail()).equals(com.abogacia.microservicio_ciudadanos.correo.CorreoNormalizado.normalizar(request.getMail()))
                && ciudadanoRepository.existsByMail(request.getMail())) {

            throw new IllegalArgumentException(
                    "El correo ya pertenece a otro ciudadano."
            );
        }

        ciudadano.setNombre(request.getNombre());
        ciudadano.setApellido(request.getApellido());
        if (request.getFechaNacimiento() != null
        && !request.getFechaNacimiento().isBlank()) {
                ciudadano.setFechaNacimiento(
                LocalDate.parse(request.getFechaNacimiento())
                );}
        ciudadano.setDireccion(request.getDireccion());
        if(!com.abogacia.microservicio_ciudadanos.correo.CorreoNormalizado.normalizar(ciudadano.getMail()).equals(request.getMail()))cambioCorreo.cambiar(ciudadano,request.getMail());
        ciudadano.setNroCelular(request.getNroCelular());

        Ciudadano actualizado =
                ciudadanoRepository.save(ciudadano);

        return new CiudadanoResponse(actualizado);
    }
}
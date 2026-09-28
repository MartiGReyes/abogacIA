package com.abogacia.microservicio_ciudadanos.gestor;

import com.abogacia.microservicio_ciudadanos.correo.InterfazCorreo;
import com.abogacia.microservicio_ciudadanos.dto.CiudadanoResponse;
import com.abogacia.microservicio_ciudadanos.dto.RegistrarCiudadanoRequest;
import com.abogacia.microservicio_ciudadanos.entity.Ciudadano;
import com.abogacia.microservicio_ciudadanos.entity.Estado;
import com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository;
import com.abogacia.microservicio_ciudadanos.repository.EstadoRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.util.Random;

@Service
public class RegistrarCiudadanoGestor {

    private final CiudadanoRepository ciudadanoRepository;
    private final EstadoRepository estadoRepository;
    private final PasswordEncoder passwordEncoder;
    private final InterfazCorreo interfazCorreo;

    public RegistrarCiudadanoGestor(
            CiudadanoRepository ciudadanoRepository,
            EstadoRepository estadoRepository,
            PasswordEncoder passwordEncoder,
            InterfazCorreo interfazCorreo
    ) {
        this.ciudadanoRepository = ciudadanoRepository;
        this.estadoRepository = estadoRepository;
        this.passwordEncoder = passwordEncoder;
        this.interfazCorreo = interfazCorreo;
    }

    @Transactional
    public CiudadanoResponse registrar(RegistrarCiudadanoRequest request) {

        validarEdad(request.getFechaNacimiento());

        if (ciudadanoRepository.existsByCuil(request.getCuil())) {
            throw new IllegalArgumentException(
                    "Ya existe un ciudadano registrado con ese CUIL."
            );
        }

        if (ciudadanoRepository.existsByMail(request.getMail())) {
            throw new IllegalArgumentException(
                    "Ya existe un ciudadano registrado con ese correo."
            );
        }

        Estado estadoPendiente = estadoRepository
                .findByNombreEstado("PENDIENTE")
                .orElseThrow(() ->
                        new IllegalStateException(
                                "No existe el estado PENDIENTE."
                        )
                );

        String codigoConfirmacion = generarCodigoConfirmacion();

        Ciudadano ciudadano = new Ciudadano();

        ciudadano.setNombre(request.getNombre());
        ciudadano.setApellido(request.getApellido());
        ciudadano.setCuil(request.getCuil());
        ciudadano.setFechaNacimiento(request.getFechaNacimiento());
        ciudadano.setDireccion(request.getDireccion());
        ciudadano.setMail(request.getMail());
        ciudadano.setNroCelular(request.getNroCelular());

        ciudadano.setContrasenaHash(
                passwordEncoder.encode(request.getContrasena())
        );

        ciudadano.setCodigoConfirmacion(codigoConfirmacion);
        ciudadano.setEstado(estadoPendiente);

        Ciudadano ciudadanoGuardado =
                ciudadanoRepository.save(ciudadano);

        interfazCorreo.enviarMailConfirmacion(
                ciudadanoGuardado.getMail(),
                codigoConfirmacion
        );

        return new CiudadanoResponse(ciudadanoGuardado);
    }

    private void validarEdad(LocalDate fechaNacimiento) {

        int edad = Period.between(
                fechaNacimiento,
                LocalDate.now()
        ).getYears();

        if (edad < 18) {
            throw new IllegalArgumentException(
                    "El ciudadano debe ser mayor de edad."
            );
        }
    }

    private String generarCodigoConfirmacion() {

        int codigo = 100000 + new Random().nextInt(900000);

        return String.valueOf(codigo);
    }
}
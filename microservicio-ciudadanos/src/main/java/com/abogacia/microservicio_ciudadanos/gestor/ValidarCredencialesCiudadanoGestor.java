package com.abogacia.microservicio_ciudadanos.gestor;

import com.abogacia.microservicio_ciudadanos.entity.Ciudadano;
import com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ValidarCredencialesCiudadanoGestor {
    private final CiudadanoRepository ciudadanoRepository;
    private final PasswordEncoder passwordEncoder;
    private final String dummyHash;

    public ValidarCredencialesCiudadanoGestor(CiudadanoRepository ciudadanoRepository,
            PasswordEncoder passwordEncoder) {
        this.ciudadanoRepository = ciudadanoRepository;
        this.passwordEncoder = passwordEncoder;
        this.dummyHash = passwordEncoder.encode(java.util.UUID.randomUUID().toString());
    }

    public Long validar(String mail, String contrasena) {
        Ciudadano ciudadano = ciudadanoRepository.findByMail(mail).orElse(null);
        // Ejecutar BCrypt también para correos inexistentes evita una diferencia obvia de tiempos.
        boolean coincide = passwordEncoder.matches(contrasena,
                ciudadano == null ? dummyHash : ciudadano.getContrasenaHash());
        if (ciudadano == null || !coincide
                || !"REGISTRADO".equals(ciudadano.getEstado().getNombreEstado())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales incorrectas.");
        }
        return ciudadano.getIdCiudadano();
    }
}

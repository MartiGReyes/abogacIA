package com.abogacia.microservicio_ciudadanos.config;

import com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component("cuentaPropia")
public class CuentaPropia {
    private final CiudadanoRepository repository;
    public CuentaPropia(CiudadanoRepository repository) { this.repository = repository; }

    public boolean permite(Authentication authentication, String cuil) {
        if (!(authentication instanceof JwtAuthenticationToken jwt)
                || !"CIUDADANO".equals(jwt.getToken().getClaimAsString("rol"))) return false;
        return repository.findByCuil(cuil)
                .filter(c -> c.getIdCiudadano().toString().equals(jwt.getName()))
                .filter(c -> "REGISTRADO".equals(c.getEstado().getNombreEstado()))
                .isPresent();
    }
}

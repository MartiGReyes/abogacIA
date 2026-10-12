package com.abogacia.microservicio_abogados.config;
import org.springframework.context.annotation.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.boot.ApplicationRunner;
import com.abogacia.microservicio_abogados.repository.EstadoRepository;
import com.abogacia.microservicio_abogados.entity.Estado;
@Configuration
public class RegistroConfig {
 @Bean PasswordEncoder passwords() { return new BCryptPasswordEncoder(); }
 @Bean ApplicationRunner estados(EstadoRepository repository) {
  return args -> { for (String nombre : new String[]{"PENDIENTE", "REGISTRADO", "BAJA"}) {
   if (repository.findByNombreEstado(nombre).isEmpty()) { Estado estado=new Estado(); estado.setNombreEstado(nombre); repository.save(estado); }
  }};
 }
}

package com.abogacia.microservicio_abogados.padron;
import org.springframework.context.annotation.*;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import java.nio.file.Path;
@Configuration
public class PadronConfig {
 @Bean ApplicationRunner cargarPadron(ImportarPadron importar,@Value("${abogados.padron.importar:false}") boolean habilitado,
  @Value("${abogados.padron.archivo:../PADRON-RIO-TERCERO-ENERO.xlsx}") String archivo) {
  return args -> {if(habilitado)importar.importar(Path.of(archivo));};
 }
}

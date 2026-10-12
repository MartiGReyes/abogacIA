package com.abogacia.microservicio_abogados;
import com.abogacia.microservicio_abogados.padron.*;
import com.abogacia.microservicio_abogados.repository.*;
import com.abogacia.microservicio_abogados.entity.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest
@Transactional
class PadronTest {
 @Autowired ImportarPadron importer; @Autowired PadronEvidenciaRepository repository; @Autowired ValidarMatricula validador;
 @Test void interpretaLasCincoHojasYElAnexoReal()throws Exception{
  importer.importar(Path.of("../PADRON-RIO-TERCERO-ENERO.xlsx"));
  assertEquals(2690,repository.count());
  assertFalse(repository.findByMatricula("10-132").isEmpty());
  assertFalse(repository.findByMatricula("10-632").isEmpty());
 }
 @Test void estadosDesconocidosContradictoriosYDatosInsuficientes(){
  repository.deleteAll();
  repository.save(new PadronEvidencia("10-999","","PRUEBA ANA","ACTIVO","test",1,"test"));
  assertEquals(ValidarMatricula.Resultado.PENDIENTE_REVISION,validador.validar("10-999","12345678",ValidarMatricula.COLEGIO,"Córdoba"));
  repository.save(new PadronEvidencia("10-999","12345678","PRUEBA ANA","SUSPENDIDA","test",2,"test"));
  assertEquals(ValidarMatricula.Resultado.PENDIENTE_REVISION,validador.validar("10-999","12345678",ValidarMatricula.COLEGIO,"Córdoba"));
  assertEquals(ValidarMatricula.Resultado.PENDIENTE_REVISION,validador.validar("10-999","12345678","Otro colegio","Córdoba"));
 }
}

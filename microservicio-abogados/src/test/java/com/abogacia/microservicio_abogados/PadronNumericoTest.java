package com.abogacia.microservicio_abogados;
import com.abogacia.microservicio_abogados.padron.*;
import com.abogacia.microservicio_abogados.repository.*;
import com.abogacia.microservicio_abogados.entity.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.io.ByteArrayOutputStream;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Synthetic workbook and mock repositories only: never connects to a database. */
class PadronNumericoTest {
 @Test @SuppressWarnings({"unchecked","rawtypes"}) void compruebaArchivoIndicadoSinBaseDeDatos()throws Exception{
  String file=System.getProperty("padron.ensayo.archivo");org.junit.jupiter.api.Assumptions.assumeTrue(file!=null,"Sin archivo externo de ensayo");
  var e=mock(PadronEvidenciaRepository.class);var p=mock(PadronRepository.class);var s=mock(EstadoRepository.class);when(s.bloquearAdministracion()).thenReturn(Optional.of(new Estado()));
  var result=new ImportarPadron(e,p,s).importar(java.nio.file.Files.readAllBytes(java.nio.file.Path.of(file)));
  var cap=(ArgumentCaptor<Iterable<PadronEvidencia>>)(ArgumentCaptor)ArgumentCaptor.forClass(Iterable.class);verify(e).saveAll(cap.capture());var rows=new ArrayList<PadronEvidencia>();cap.getValue().forEach(rows::add);
  var numeric=rows.stream().filter(r->r.getMatricula().equals("12345")).toList();assertEquals(2,numeric.size());when(e.findByMatricula("12345")).thenReturn(numeric);
  assertEquals(ValidarMatricula.Resultado.VALIDADA,new ValidarMatricula(e).validar("12345","45246252",ValidarMatricula.COLEGIO,"Córdoba"));
  assertEquals(ValidarMatricula.Resultado.DNI_DISTINTO,new ValidarMatricula(e).validar("12345","45085078",ValidarMatricula.COLEGIO,"Córdoba"));
  System.out.println("ENSAYO_PADRON filas="+result.filas()+" matriculas="+result.matriculas()+" evidencias12345="+numeric.size());
 }
 private byte[] archivo(String matricula,boolean activo)throws Exception{
  try(var w=new XSSFWorkbook();var out=new ByteArrayOutputStream()){
   var s=w.createSheet("Hoja1");var h=s.createRow(0);h.createCell(0).setCellValue("Mat");h.createCell(1).setCellValue("Apellido y Nombre");h.createCell(2).setCellValue("DNI");
   var r=s.createRow(1);r.createCell(0).setCellValue(matricula);r.createCell(1).setCellValue("PERSONA SINTETICA");r.createCell(2).setCellValue("99009001");
   var s2=w.createSheet("Hoja2");if(activo){var a=s2.createRow(0);a.createCell(0).setCellValue(matricula);a.createCell(1).setCellValue("PERSONA SINTETICA");a.createCell(2).setCellValue("ACTIVO");}
   w.createSheet("Hoja3");var sh=w.createSheet("Hoja4").createRow(0);sh.createCell(1).setCellValue("MP");sh.createCell(2).setCellValue("Apellido y Nombre");sh.createCell(4).setCellValue("Estado");sh.createCell(6).setCellValue("DNI");w.createSheet("Hoja5");w.write(out);return out.toByteArray();
  }
 }
 @Test @SuppressWarnings({"unchecked","rawtypes"}) void aceptaNumericaSinInventarActividad()throws Exception{
  var evidence=mock(PadronEvidenciaRepository.class);var parents=mock(PadronRepository.class);var states=mock(EstadoRepository.class);when(states.bloquearAdministracion()).thenReturn(Optional.of(new Estado()));
  new ImportarPadron(evidence,parents,states).importar(archivo("12345",false));
  var capture=(ArgumentCaptor<Iterable<PadronEvidencia>>)(ArgumentCaptor)ArgumentCaptor.forClass(Iterable.class);verify(evidence).saveAll(capture.capture());var rows=new ArrayList<PadronEvidencia>();capture.getValue().forEach(rows::add);
  assertEquals("12345",rows.getFirst().getMatricula());assertEquals("",rows.getFirst().getEstado());
  var parent=ArgumentCaptor.forClass(Padron.class);verify(parents).save(parent.capture());assertEquals("PENDIENTE",parent.getValue().getEstado());
  when(evidence.findByMatricula("12345")).thenReturn(rows);
  assertEquals(ValidarMatricula.Resultado.PENDIENTE_REVISION,new ValidarMatricula(evidence).validar("12345","99009001",ValidarMatricula.COLEGIO,"Córdoba"));
 }
 @Test void conservaFormatoAnteriorYRechazaDocumentoDistinto()throws Exception{
  var e=mock(PadronEvidenciaRepository.class);var p=mock(PadronRepository.class);var s=mock(EstadoRepository.class);when(s.bloquearAdministracion()).thenReturn(Optional.of(new Estado()));
  assertDoesNotThrow(()->new ImportarPadron(e,p,s).importar(archivo("10-394",true)));
  when(e.findByMatricula("10-394")).thenReturn(List.of(new PadronEvidencia("10-394","99009001","PERSONA SINTETICA","ACTIVO","test",1,"test")));
  assertEquals(ValidarMatricula.Resultado.DNI_DISTINTO,new ValidarMatricula(e).validar("10-394","99009002",ValidarMatricula.COLEGIO,"Córdoba"));
 }
 @Test void formatoInvalidoNoIniciaReemplazo()throws Exception{
  for(String m:List.of("1234567","10-1234567","ABC","123 45")){
   var e=mock(PadronEvidenciaRepository.class);var p=mock(PadronRepository.class);var s=mock(EstadoRepository.class);
   assertThrows(IllegalArgumentException.class,()->new ImportarPadron(e,p,s).importar(archivo(m,false)));verifyNoInteractions(e,p,s);
  }
 }
}

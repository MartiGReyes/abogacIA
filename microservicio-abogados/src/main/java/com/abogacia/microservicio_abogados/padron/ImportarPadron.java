package com.abogacia.microservicio_abogados.padron;
import com.abogacia.microservicio_abogados.entity.*;
import com.abogacia.microservicio_abogados.repository.*;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
@Service
public class ImportarPadron {
 private final PadronEvidenciaRepository evidencias;
 private final PadronRepository padron;
 public ImportarPadron(PadronEvidenciaRepository evidencias,PadronRepository padron){this.evidencias=evidencias;this.padron=padron;}
 @Transactional
 public void importar(Path archivo) throws Exception {
  byte[] bytes=Files.readAllBytes(archivo);
  String version=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
  List<PadronEvidencia> datos=new ArrayList<>();
  try (Workbook libro=WorkbookFactory.create(new java.io.ByteArrayInputStream(bytes))) {
   if(libro.getNumberOfSheets()!=5) throw new IllegalArgumentException("Formato de padrón inesperado: revisar importador.");
   DataFormatter formatter=new DataFormatter(Locale.ROOT);
   for(Sheet hoja:libro){
    // Layouts inspected in the supplied workbook; unknown changes fail closed.
    int m,n,d,e,inicio;
    switch(hoja.getSheetName()) {
     case "Hoja1" -> { m=0;n=1;d=2;e=-1;inicio=1; verificar(hoja,formatter,0,"Mat",1,"Apellido y Nombre",2,"DNI"); }
     case "Hoja2" -> { m=0;n=1;d=-1;e=2;inicio=0; }
     case "Hoja3" -> { m=1;n=2;d=-1;e=4;inicio=0; }
     case "Hoja4" -> { m=1;n=2;d=6;e=4;inicio=1; verificar(hoja,formatter,1,"MP",2,"Apellido y Nombre",4,"Estado",6,"DNI"); }
     case "Hoja5" -> { m=0;n=1;d=-1;e=3;inicio=0; }
     default -> throw new IllegalArgumentException("Hoja no reconocida.");
    }
    boolean anexo=false;
    for(Row fila:hoja) {
     if(hoja.getSheetName().equals("Hoja2") && celda(fila,1,formatter).equals("MP") && celda(fila,4,formatter).equals("Estado")) {
      anexo=true; continue;
     }
     if(anexo) { m=1;n=2;d=6;e=4; }
     if(fila.getRowNum()<inicio)continue;
     String matricula=celda(fila,m,formatter);
     if(matricula.isBlank())continue;
     if(!matricula.matches("10-[0-9]{3}")) throw new IllegalArgumentException("Matrícula con formato inesperado en "+hoja.getSheetName()+":"+(fila.getRowNum()+1));
     String dni=d<0?"":celda(fila,d,formatter).replace(".","").replace(",","").replace(" ","");
     if(!dni.isBlank() && !dni.matches("[0-9]{7,8}"))dni="INVALIDO";
     datos.add(new PadronEvidencia(matricula,dni,celda(fila,n,formatter),e<0?"":estado(celda(fila,e,formatter)),hoja.getSheetName(),fila.getRowNum()+1,version));
    }
   }
  }
  if(datos.isEmpty())throw new IllegalArgumentException("Padr?n vacío.");
  // Keep parent rows referenced by accounts; only replace evidence atomically.
  evidencias.deleteAllInBatch(); evidencias.saveAll(datos);
  for(String matricula:datos.stream().map(PadronEvidencia::getMatricula).distinct().toList()) {
   Set<String> estados=new HashSet<>();
   datos.stream().filter(f->f.getMatricula().equals(matricula)).map(PadronEvidencia::getEstado)
    .filter(e->!e.isBlank()).forEach(estados::add);
   String estado=estados.size()==1?estados.iterator().next():"PENDIENTE";
   padron.save(new Padron(matricula,estado.length()<=16?estado:"PENDIENTE"));
  }
 }
 private static String estado(String texto){
  String valor=texto.toUpperCase(Locale.ROOT);
  return valor.equals("ACTIVA")?"ACTIVO":valor;
 }
 private static String celda(Row row,int col,DataFormatter f){return f.formatCellValue(row.getCell(col)).trim();}
 private static void verificar(Sheet sheet,DataFormatter f,Object... pares){
  for(int i=0;i<pares.length;i+=2)if(!celda(sheet.getRow(0),(Integer)pares[i],f).equals(pares[i+1]))
   throw new IllegalArgumentException("Cabecera inesperada en "+sheet.getSheetName());
 }
}

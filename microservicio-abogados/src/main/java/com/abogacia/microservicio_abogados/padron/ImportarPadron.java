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
 private final EstadoRepository estados;
 public ImportarPadron(PadronEvidenciaRepository evidencias,PadronRepository padron,EstadoRepository estados){this.evidencias=evidencias;this.padron=padron;this.estados=estados;}
 public record Resultado(int filas, int matriculas, int retiradas, String versionArchivo) {}
 @Transactional(rollbackFor=Exception.class)
 public void importar(Path archivo) throws Exception { importar(Files.readAllBytes(archivo)); }

 @Transactional(rollbackFor=Exception.class)
 public Resultado importar(byte[] bytes) throws Exception {
  if(bytes == null || bytes.length == 0 || bytes.length > 8 * 1024 * 1024)
   throw new IllegalArgumentException("El archivo debe contener datos y pesar como máximo 8 MiB.");
  String version=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
  List<PadronEvidencia> datos=new ArrayList<>();
  try (Workbook libro=new org.apache.poi.xssf.usermodel.XSSFWorkbook(new java.io.ByteArrayInputStream(bytes))) {
   if(libro.getNumberOfSheets()!=5) throw new IllegalArgumentException("Formato de padrón inesperado: revisar importador.");
   DataFormatter formatter=new DataFormatter(Locale.ROOT);
   for(Sheet hoja:libro){
    if(hoja.getLastRowNum()>30000)throw new IllegalArgumentException("Demasiadas filas en el padrón.");
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
     if(datos.size()>=30000)throw new IllegalArgumentException("El padrón admite como máximo 30000 filas.");
     datos.add(new PadronEvidencia(matricula,dni,celda(fila,n,formatter),e<0?"":estado(celda(fila,e,formatter)),hoja.getSheetName(),fila.getRowNum()+1,version));
    }
   }
  }
  if(datos.isEmpty())throw new IllegalArgumentException("Padrón vacío.");
  // Parse completely before any mutation; serialize imports and preserve referenced parent rows.
  estados.bloquearAdministracion().orElseThrow(() -> new IllegalStateException("Falta el estado REGISTRADO."));
  Map<String,List<PadronEvidencia>> porMatricula = new LinkedHashMap<>();
  datos.forEach(f -> porMatricula.computeIfAbsent(f.getMatricula(), k -> new ArrayList<>()).add(f));
  Set<String> presentes = porMatricula.keySet();
  int retiradas = 0;
  for(Padron anterior : padron.findAll()) {
   if(!presentes.contains(anterior.getNroMatricula())) {
    padron.save(new Padron(anterior.getNroMatricula(), "INACTIVO")); retiradas++;
   }
  }
  // Evidence replacement and parent updates commit or roll back together.
  evidencias.deleteAllInBatch(); evidencias.saveAll(datos);
  for(var grupo : porMatricula.entrySet()) {
   String matricula = grupo.getKey();
   Set<String> estados=new HashSet<>();
   grupo.getValue().stream().map(PadronEvidencia::getEstado)
    .filter(e->!e.isBlank()).forEach(estados::add);
   String estado=estados.size()==1?estados.iterator().next():"PENDIENTE";
   padron.save(new Padron(matricula,estado.length()<=16?estado:"PENDIENTE"));
  }
  evidencias.flush(); padron.flush();
  return new Resultado(datos.size(), presentes.size(), retiradas, version);
 }
 private static String estado(String texto){
  String valor=texto.toUpperCase(Locale.ROOT);
  return valor.equals("ACTIVA")?"ACTIVO":valor;
 }
 private static String celda(Row row,int col,DataFormatter f){return row == null ? "" : f.formatCellValue(row.getCell(col)).trim();}
 private static void verificar(Sheet sheet,DataFormatter f,Object... pares){
  for(int i=0;i<pares.length;i+=2)if(!celda(sheet.getRow(0),(Integer)pares[i],f).equals(pares[i+1]))
   throw new IllegalArgumentException("Cabecera inesperada en "+sheet.getSheetName());
 }
}

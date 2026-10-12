package com.abogacia.microservicio_abogados.padron;
import org.springframework.stereotype.Service;
import com.abogacia.microservicio_abogados.repository.PadronEvidenciaRepository;
import com.abogacia.microservicio_abogados.entity.PadronEvidencia;
import java.text.Normalizer;
import java.util.*;
@Service
public class ValidarMatricula {
 public enum Resultado { VALIDADA, INEXISTENTE, INACTIVA, DNI_DISTINTO, PENDIENTE_REVISION }
 public static final String COLEGIO="Colegio de Abogados de Río Tercero";
 private final PadronEvidenciaRepository repository;
 public ValidarMatricula(PadronEvidenciaRepository repository){this.repository=repository;}
 public Resultado validar(String matricula,String dni,String colegio,String provincia){
  if(!normalizar(colegio).equals(normalizar(COLEGIO)) || !normalizar(provincia).equals("CORDOBA"))return Resultado.PENDIENTE_REVISION;
  var filas=repository.findByMatricula(matricula);
  if(filas.isEmpty())return repository.count()==0?Resultado.PENDIENTE_REVISION:Resultado.INEXISTENTE;
  Set<String> documentos=new HashSet<>(),estados=new HashSet<>(),nombres=new HashSet<>();
  for(var f:filas){
   if(!f.getDni().isBlank())documentos.add(f.getDni());
   if(!f.getEstado().isBlank())estados.add(f.getEstado());
   if(!f.getNombreCompleto().isBlank())nombres.add(normalizar(f.getNombreCompleto()));
  }
  if(documentos.stream().anyMatch(d->!d.matches("[0-9]{7,8}")))return Resultado.PENDIENTE_REVISION;
  if(documentos.size()>1 || estados.size()>1 || nombres.size()>1)return Resultado.PENDIENTE_REVISION;
  if(documentos.size()==1 && !documentos.contains(dni))return Resultado.DNI_DISTINTO;
  if(documentos.isEmpty() || estados.isEmpty() || nombres.isEmpty())return Resultado.PENDIENTE_REVISION;
  if(estados.contains("ACTIVO"))return Resultado.VALIDADA;
  if(estados.stream().anyMatch(Set.of("INACTIVO","BAJA","FALLECIDO","SUSPENDIDO","CANCELADO","CANCELADA","SUSPENDIDA","SUSPENSIÓN","TRAN/CANCELADA")::contains))return Resultado.INACTIVA;
  return Resultado.PENDIENTE_REVISION;
 }
 static String normalizar(String texto){return Normalizer.normalize(texto,Normalizer.Form.NFD).replaceAll("\\p{M}","").toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9 ]"," ").trim().replaceAll(" +"," ");}
}

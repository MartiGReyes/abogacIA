package com.abogacia.microservicio_abogados.operativa;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class LexiRespuestaTest {
 @Test void fijaRechazosYNoConfiaEnBanderaContradictoria(){
  var fuera=LexiRespuesta.normalizar(Map.of("orientacion","No usar","estado","FUERA_DE_ALCANCE","mostrarAbogados",true));
  assertEquals(Map.of("orientacion","No puedo responder esa consulta","estado","FUERA_DE_ALCANCE","mostrarAbogados",false),fuera);
  var normas=LexiRespuesta.normalizar(Map.of("orientacion","No usar","estado","LENGUAJE_INAPROPIADO","mostrarAbogados",true));
  assertEquals("Tu mensaje incumple las normas de uso de Lexi. Reformulá tu consulta con respeto",normas.get("orientacion"));assertEquals(false,normas.get("mostrarAbogados"));
 }
 @Test void exigeBooleanoExplicitoYEstadoValido(){
  for(Object flag:new Object[]{true,false,"true",1}){
   var r=LexiRespuesta.normalizar(Map.of("orientacion","Laboral","estado","RESPONDIDA","mostrarAbogados",flag));
   assertEquals(Boolean.TRUE.equals(flag),r.get("mostrarAbogados"));
  }
  assertEquals(false,LexiRespuesta.normalizar(Map.of("orientacion","Laboral","estado","RESPONDIDA")).get("mostrarAbogados"));
 }
 @Test void invalidaDesconocidosYRespuestasInvalidas(){
  for(var body:java.util.List.of(Map.of(),Map.of("orientacion","Legada"),Map.of("orientacion","Laboral","estado","INCIERTA","mostrarAbogados",true),Map.of("orientacion"," ","estado","RESPONDIDA"),Map.of("orientacion","x".repeat(20001),"estado","RESPONDIDA")))assertThrows(IllegalStateException.class,()->LexiRespuesta.normalizar(body));
 }
}

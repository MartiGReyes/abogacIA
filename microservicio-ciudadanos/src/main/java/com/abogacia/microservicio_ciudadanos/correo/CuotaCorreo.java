package com.abogacia.microservicio_ciudadanos.correo;
/** Single-instance delivery budget. No raw addresses retained. Failed sends consume quota too. */
@org.springframework.stereotype.Component
public class CuotaCorreo {
 private record Destino(long minuto,long hora,int cantidad,int cantidadMinuto){}
 private final java.util.Map<String,Destino> destinos=new java.util.HashMap<>();private long minuto=-1,dia=-1;private int minutos,diarios;
 public synchronized void reservar(String mail){
  long now=System.currentTimeMillis()/60000,hora=now/60,d=now/1440;
  if(minuto!=now){minuto=now;minutos=0;}if(dia!=d){dia=d;diarios=0;}
  destinos.entrySet().removeIf(e->e.getValue().hora()!=hora);
  String key;try{key=java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(CorreoNormalizado.normalizar(mail).getBytes(java.nio.charset.StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException();}
  var old=destinos.get(key);if(minutos>=20||diarios>=200||(old!=null&&(old.minuto()==now&&old.cantidadMinuto()>=3||old.cantidad()>=5)))throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,"Esperá antes de solicitar otro correo.");
  destinos.put(key,new Destino(now,hora,old==null?1:old.cantidad()+1,old==null||old.minuto()!=now?1:old.cantidadMinuto()+1));minutos++;diarios++;
 }
}

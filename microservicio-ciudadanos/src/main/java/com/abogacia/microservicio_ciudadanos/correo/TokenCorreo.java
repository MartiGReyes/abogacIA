package com.abogacia.microservicio_ciudadanos.correo;
import java.security.*;import java.nio.charset.StandardCharsets;import java.time.Instant;import java.util.*;
/** High entropy token; only its role-specific hash and deadline fit in the existing varchar. */
public final class TokenCorreo {
 private TokenCorreo(){}
 public static String nuevo(){byte[] b=new byte[32];new SecureRandom().nextBytes(b);return Base64.getUrlEncoder().withoutPadding().encodeToString(b);}
 public static String hash(String token){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(("confirmar-ciudadano:"+token).getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException();}}
 public static String guardar(String token){return hash(token)+":"+Instant.now().plusSeconds(1800).getEpochSecond();}
 public static boolean vigente(String guardado){try{return Long.parseLong(guardado.split(":")[1])>Instant.now().getEpochSecond();}catch(Exception e){return false;}}
}

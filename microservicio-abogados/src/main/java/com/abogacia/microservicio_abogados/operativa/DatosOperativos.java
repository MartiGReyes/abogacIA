package com.abogacia.microservicio_abogados.operativa;

import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.*;
import java.util.*;
import javax.crypto.Cipher;
import javax.crypto.spec.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** No personal data is used as a key, log value, JWT claim or index. */
@Component
@Profile("contacto-operativo-test")
public class DatosOperativos {
    private final byte[] key;
    private final SecureRandom random = new SecureRandom();
    @org.springframework.beans.factory.annotation.Autowired
    public DatosOperativos(@Value("${OP_ENCRYPTION_KEY_FILE}") String file) throws java.io.IOException {
        this(Base64.getDecoder().decode(Files.readString(Path.of(file)).trim()));
    }
    DatosOperativos(byte[] key) {
        if (key.length != 32) throw new IllegalArgumentException("La clave operativa debe tener 32 bytes.");
        this.key = key.clone();
    }
    public byte[] cifrar(String valor, UUID id, String campo) {
        try {
            byte[] nonce = new byte[12]; random.nextBytes(nonce);
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key,"AES"), new GCMParameterSpec(128,nonce));
            cipher.updateAAD((id+":"+campo).getBytes(StandardCharsets.UTF_8));
            byte[] payload = cipher.doFinal(valor.getBytes(StandardCharsets.UTF_8));
            return java.nio.ByteBuffer.allocate(12+payload.length).put(nonce).put(payload).array();
        } catch (GeneralSecurityException ex) { throw new IllegalStateException("No se pudo proteger el dato operativo."); }
    }
    public String descifrar(byte[] valor, UUID id, String campo) {
        try {
            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,Arrays.copyOfRange(valor,0,12)));
            cipher.updateAAD((id+":"+campo).getBytes(StandardCharsets.UTF_8));
            return new String(cipher.doFinal(Arrays.copyOfRange(valor,12,valor.length)),StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | RuntimeException ex) { throw new IllegalStateException("No se pudo recuperar el dato protegido."); }
    }
    public String token() { byte[] bytes=new byte[32];random.nextBytes(bytes);return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    public static String hash(String valor) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8))); }
        catch (GeneralSecurityException ex) { throw new IllegalStateException("Hash no disponible."); }
    }
    public static String telefono(String valor) {
        if (valor == null || !valor.matches("[+0-9() .-]{10,35}")) throw new IllegalArgumentException("Ingresá el celular en formato +54 9, área y número sin 0 ni 15 local.");
        String n=valor.replaceAll("[^0-9]", "");
        if(n.matches("54[1-9][0-9]{9}"))n="549"+n.substring(2);
        if(!n.matches("549[1-9][0-9]{9}"))throw new IllegalArgumentException("Ingresá el celular en formato +54 9, área y número sin 0 ni 15 local.");
        return n;
    }
    public static String mensaje(String nombre, String telefono, String resumen) {
        return "Prueba operativa de abogacIA — contacto técnico.\n"
            +(nombre.isBlank()?"":"Nombre: "+nombre+"\n")
            +(telefono.isBlank()?"":"Teléfono de contacto: "+telefono+"\n")
            +"Resumen revisado: "+resumen;
    }
}

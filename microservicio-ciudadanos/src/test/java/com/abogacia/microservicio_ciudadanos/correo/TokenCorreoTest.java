package com.abogacia.microservicio_ciudadanos.correo;
import org.junit.jupiter.api.Test;import static org.junit.jupiter.api.Assertions.*;
class TokenCorreoTest {
 @Test void codigoNoSeGuardaEnClaroYTieneVencimiento(){String token=TokenCorreo.nuevo(),stored=TokenCorreo.guardar(token);assertTrue(token.matches("[A-Za-z0-9_-]{43}"));assertFalse(stored.contains(token));assertTrue(TokenCorreo.vigente(stored));assertNotEquals(token,TokenCorreo.nuevo());}
 @Test void antiguosSinVencimientoYVencidosSeRechazan(){assertFalse(TokenCorreo.vigente("123456"));assertFalse(TokenCorreo.vigente("hash:1"));assertFalse(TokenCorreo.vigente(null));}
}

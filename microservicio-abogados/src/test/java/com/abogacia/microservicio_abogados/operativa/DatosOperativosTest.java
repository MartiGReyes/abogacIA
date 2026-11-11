package com.abogacia.microservicio_abogados.operativa;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class DatosOperativosTest {
    @Test void cifradoAutenticadoEsAleatorioYVinculadoAlCampoYPerfil() {
        var crypto=new DatosOperativos(new byte[32]);UUID id=UUID.randomUUID();
        byte[] a=crypto.cifrar("99000111",id,"dni"),b=crypto.cifrar("99000111",id,"dni");
        assertFalse(Arrays.equals(a,b));assertEquals("99000111",crypto.descifrar(a,id,"dni"));
        assertThrows(IllegalStateException.class,()->crypto.descifrar(a,id,"telefono"));
        assertThrows(IllegalStateException.class,()->crypto.descifrar(a,UUID.randomUUID(),"dni"));
        a[a.length-1]^=1;assertThrows(IllegalStateException.class,()->crypto.descifrar(a,id,"dni"));
    }
    @Test void normalizaArgentinaSinBorrar15Legitimo() {
        assertEquals("5493511500000",DatosOperativos.telefono("+54 9 351 150-0000"));
        assertEquals("5493510000000",DatosOperativos.telefono("+54 351 0000000"));
        for(String n:List.of("0351 15 0000000","3510000000","+1 3510000000","5493510000000https://otro","5490351000000"))
            assertThrows(IllegalArgumentException.class,()->DatosOperativos.telefono(n));
    }
    @Test void registrosNoExponenDatosEnToString() {
        var alta=new OperativaService.Alta("Alias","99000111","5493510000000","Derecho Laboral",true,"operativa-v1");
        assertFalse(alta.toString().contains("99000111"));assertFalse(alta.toString().contains("549351"));
        assertEquals("Acceso[datos omitidos]",new OperativaService.Acceso("secret",null).toString());
    }
    @Test void plantillaNoIncluyeVerificacionOMatricula() {
        String mensaje=DatosOperativos.mensaje("", "", "Caso técnico sintético.");
        assertFalse(mensaje.toLowerCase().contains("matrícula"));assertFalse(mensaje.toLowerCase().contains("dni"));
        assertFalse(mensaje.contains("Teléfono"));assertTrue(mensaje.endsWith("Caso técnico sintético."));
    }
}

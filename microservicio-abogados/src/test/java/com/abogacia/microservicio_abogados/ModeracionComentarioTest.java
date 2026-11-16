package com.abogacia.microservicio_abogados;
import com.abogacia.microservicio_abogados.extension.ModeracionComentario;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
class ModeracionComentarioTest {
    @Test void aceptaCriticasYComentarioOpcional(){
        assertEquals("",ModeracionComentario.validar(null));
        assertEquals("No respondió a tiempo. No recomiendo su atención.",ModeracionComentario.validar(" No respondió a tiempo. No recomiendo su atención. "));
        assertEquals("Buena disponibilidad y atención.",ModeracionComentario.validar("Buena disponibilidad y atención."));
    }
    @Test void rechazaInsultosNormalizadosYExpresionesDiscriminatorias(){
        for(String texto:new String[]{"Es un pelotudo","Un IMBÉCIL","p3lotud0","p.e.l.o.t.u.d.o","hijo de puta","negros de mierda","hay que matar a todos ellos"})
            assertThrows(ResponseStatusException.class,()->ModeracionComentario.validar(texto),texto);
    }
    @Test void limitaLongitud(){assertDoesNotThrow(()->ModeracionComentario.validar("a".repeat(1000)));assertThrows(ResponseStatusException.class,()->ModeracionComentario.validar("a".repeat(1001)));}
}

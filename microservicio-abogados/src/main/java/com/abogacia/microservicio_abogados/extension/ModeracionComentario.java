package com.abogacia.microservicio_abogados.extension;
import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
/** Política local determinista, aplicada también al editar. */
public final class ModeracionComentario {
    private ModeracionComentario(){}
    private static final Pattern OFENSIVO=Pattern.compile("\\b(hdps?|hijos? de puta|hijas? de puta|put[oa]s?|putitos?|putazos?|pelotud[oa]s?|bolud[oa]s?|idiotas?|imbecil(?:es)?|mierda|carajo|forr[oa]s?|conchud[oa]s?|mogolic[oa]s?|retardad[oa]s?|maric[oa]n(?:es)?|negros? de mierda|judios? de mierda|mueran l[oa]s? .+|hay que matar a .+|fuck(?:ing)?|bitch(?:es)?|assholes?|nigg(?:er|a)s?|fagg?ots?)\\b");
    public static String validar(String comentario){
        String texto=comentario==null?"":comentario.strip();
        if(texto.length()>1000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"El comentario admite hasta 1000 caracteres.");
        String normal=Normalizer.normalize(texto.toLowerCase(Locale.ROOT),Normalizer.Form.NFD).replaceAll("\\p{M}","").replace('0','o').replace('1','i').replace('3','e').replace('4','a').replace('@','a').replace('$','s');
        normal=normal.replaceAll("[\\p{Punct}]+"," ").replaceAll("\\s+"," ");
        normal=Pattern.compile("\\b(?:[a-z] ){2,}[a-z]\\b").matcher(normal).replaceAll(m->m.group().replace(" ",""));
        if(OFENSIVO.matcher(normal).find())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Reformulá el comentario sin insultos ni expresiones ofensivas o discriminatorias.");
        if(Pattern.compile("[\\w.+-]+@[\\w.-]+\\.[a-zA-Z]{2,}|(?:\\d[ .()-]*){7,}").matcher(texto).find())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Retirá correos, teléfonos y números de documento del comentario público.");
        return texto;
    }
}

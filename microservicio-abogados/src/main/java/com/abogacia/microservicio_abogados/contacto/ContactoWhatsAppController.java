package com.abogacia.microservicio_abogados.contacto;
import com.abogacia.microservicio_abogados.repository.AbogadoRepository;
import com.abogacia.microservicio_abogados.operativa.*;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

@RestController
public class ContactoWhatsAppController {
    public static final String AVISO="contacto-whatsapp-v1";
    public record Referencia(String tipo,String id) {}
    public record Formulario(Referencia abogado,String nombre,String telefono,String resumen,String mensajeConfirmado,boolean consentimiento,String avisoVersion){
        @Override public String toString(){return "Formulario[datos omitidos]";}
    }
    private final AbogadoRepository abogados;private final ProfesionalContactable profesionales;private final ObjectProvider<CuentaPruebaService> operativa;
    public ContactoWhatsAppController(AbogadoRepository a,ProfesionalContactable p,ObjectProvider<CuentaPruebaService> o){abogados=a;profesionales=p;operativa=o;}
    public static String mensaje(String destinatario,String nombre,String telefono,String resumen){
        return "Hola, "+destinatario+". Quisiera realizar una consulta.\n\nNombre: "+nombre+"\nTeléfono de contacto: "+telefono+"\nResumen: "+resumen;
    }
    private static ResponseStatusException noDisponible(){return new ResponseStatusException(HttpStatus.CONFLICT,"Contacto no disponible");}
    private static String campo(String s,int max){if(s==null||s.trim().isEmpty()||s.trim().length()>max)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Completá nombre, teléfono y resumen dentro de los límites indicados.");return s.trim();}
    @PostMapping("/api/abogados/contacto/whatsapp") @Transactional(readOnly=true)
    public ResponseEntity<?> preparar(@RequestBody Formulario f,HttpServletRequest request,@org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.oauth2.jwt.Jwt jwt){
        if(jwt==null || !"CIUDADANO".equals(jwt.getClaimAsString("rol")))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if(!f.consentimiento()||!AVISO.equals(f.avisoVersion()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Revisá el mensaje y aceptá el consentimiento.");
        String nombre=campo(f.nombre(),100),telefono=campo(f.telefono(),35),resumen=campo(f.resumen(),800);
        if(nombre.contains("\n")||nombre.contains("\r")||telefono.contains("\n"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Revisá nombre y teléfono.");
        try{DatosOperativos.telefono(telefono);}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Ingresá tu teléfono en formato internacional argentino.");}
        String destino,numero,dni,matricula;
        if(f.abogado()==null)throw noDisponible();
        if("PROFESIONAL".equals(f.abogado().tipo())){
            long id;try{id=Long.parseLong(f.abogado().id());}catch(RuntimeException e){throw noDisponible();}
            var a=abogados.findById(id).orElseThrow(ContactoWhatsAppController::noDisponible);
            var servicio=operativa.getIfAvailable();
            if(CuentaPruebaService.marcada(a)){
                if(servicio==null||!servicio.disponible(a))throw noDisponible();
                PerfilLocalController.origen(request,true);
                destino=a.getNombre()+" "+a.getApellido();numero=servicio.telefono(a);dni=servicio.dni(a);matricula=a.getNroMatricula();
            }else{
                if(!profesionales.habilitado(a)||!profesionales.disponible(a))throw noDisponible();
                destino=a.getNombre()+" "+a.getApellido();numero=DatosOperativos.telefono(a.getNroCelular());dni=a.getDni();matricula=a.getNroMatricula();
            }
        }else throw noDisponible();
        String texto=mensaje(destino,nombre,telefono,resumen);
        if(!texto.equals(f.mensajeConfirmado()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"El destinatario o el mensaje cambió. Revisá y confirmá nuevamente.");
        if((dni!=null&&texto.replaceAll("[^0-9]","").contains(dni))||(matricula!=null&&!matricula.isBlank()&&(nombre+" "+resumen).matches("(?s).*(?<![0-9])"+java.util.regex.Pattern.quote(matricula)+"(?![0-9]).*"))
            ||texto.toLowerCase(Locale.ROOT).matches("(?s).*\\b(dni|didit|matr[ií]cula)\\b.*"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Retirá DNI, matrícula y datos sensibles del mensaje.");
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("url","https://wa.me/"+numero+"?text="+URLEncoder.encode(texto,StandardCharsets.UTF_8).replace("+","%20"),"aviso","Confirmá el envío desde WhatsApp. Abrir el enlace no confirma envío ni recepción."));
    }
}

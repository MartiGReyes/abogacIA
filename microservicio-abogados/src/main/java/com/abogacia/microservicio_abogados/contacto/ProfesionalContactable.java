package com.abogacia.microservicio_abogados.contacto;
import com.abogacia.microservicio_abogados.entity.AbogadoRegistrado;
import com.abogacia.microservicio_abogados.padron.ValidarMatricula;
import com.abogacia.microservicio_abogados.operativa.DatosOperativos;
import org.springframework.stereotype.Service;
@Service
public class ProfesionalContactable {
    private final ValidarMatricula matriculas;
    private final AutorizacionWhatsApp permisos;
    public ProfesionalContactable(ValidarMatricula matriculas,AutorizacionWhatsApp permisos){this.matriculas=matriculas;this.permisos=permisos;}
    public boolean habilitado(AbogadoRegistrado a){
        return a!=null&&!com.abogacia.microservicio_abogados.operativa.CuentaPruebaService.marcada(a)&&!a.esSolicitud()&&a.getEstado()!=null&&"REGISTRADO".equals(a.getEstado().getNombreEstado())
            &&a.getCorreoConfirmado()&&"APROBADA".equals(a.getVerificacionDni())&&"VALIDADA".equals(a.getValidacionMatricula())
            &&Boolean.TRUE.equals(a.getMatriculaVerificada())&&a.getNroMatricula()!=null&&a.getColegioProfesional()!=null&&a.getProvincia()!=null
            &&matriculas.validar(a.getNroMatricula(),a.getDni(),a.getColegioProfesional(),a.getProvincia())==ValidarMatricula.Resultado.VALIDADA;
    }
    public boolean disponible(AbogadoRegistrado a){
        if(!permisos.permitido(a.getIdAbogado()))return false;
        try{DatosOperativos.telefono(a.getNroCelular());return true;}catch(IllegalArgumentException e){return false;}
    }
    public String mascara(AbogadoRegistrado a){
        if(!disponible(a))return null;
        String n=DatosOperativos.telefono(a.getNroCelular());return "+54 9 ••••••"+n.substring(n.length()-4);
    }
}

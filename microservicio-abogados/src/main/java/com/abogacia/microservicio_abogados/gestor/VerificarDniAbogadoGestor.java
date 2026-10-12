package com.abogacia.microservicio_abogados.gestor;
import com.abogacia.microservicio_abogados.didit.VerificadorIdentidad;
import com.abogacia.microservicio_abogados.repository.AbogadoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
@Service
public class VerificarDniAbogadoGestor {
 private final AbogadoRepository abogados;private final RegistrarAbogadoGestor registro;
 private final TransactionTemplate tx;
 public VerificarDniAbogadoGestor(AbogadoRepository abogados,RegistrarAbogadoGestor registro,PlatformTransactionManager tm){this.abogados=abogados;this.registro=registro;tx=new TransactionTemplate(tm);}
 /** Trusted backend adapter only. HTTP executes before the short transaction that applies the decision. */
 public void actualizar(Long id,VerificadorIdentidad verificador){
  String sesion=tx.execute(s->abogados.findById(id).orElseThrow().getSesionDidit());
  if(sesion==null)throw new IllegalStateException("No existe una sesión de identidad vinculada.");
  var r=verificador.consultarResultadoVerificado(sesion);
  tx.executeWithoutResult(s->{
   var a=abogados.findByIdForUpdate(id).orElseThrow();
   if(sesion.equals(a.getSesionDidit()))aplicar(a,r);
  });
 }
 public void aplicar(com.abogacia.microservicio_abogados.entity.AbogadoRegistrado a,VerificadorIdentidad.Resultado r){
  if(r==null || !a.getSesionDidit().equals(r.sesion()) || r.evento()==null || r.evento().isBlank() || r.estado()==null)
   throw new IllegalArgumentException("Resultado de identidad inválido.");
  if("BAJA".equals(a.getEstado().getNombreEstado()))return;
  a.setResultadoDiditId(r.evento());
  String dni=com.abogacia.microservicio_abogados.didit.DiditVerificadorIdentidad.normalizarDni(r.dni());
  a.setVerificacionDni(r.estado()==VerificadorIdentidad.Estado.APROBADA && !a.getDni().equals(dni)?"RECHAZADA":r.estado().name());
  a.setDniVerificado("APROBADA".equals(a.getVerificacionDni()));
  // Personal data comes from the approved document, never from the browser; a created account keeps its data.
  if(a.getDniVerificado() && r.datos()!=null && a.esSolicitud()){
   var d=r.datos();
   a.setNombre(d.nombre());a.setApellido(d.apellido());a.setFechaNacimiento(d.fechaNacimiento());
   a.setGenero(d.genero());a.setDomicilio(d.domicilio());
  }
  registro.actualizarEstado(a);
 }
}

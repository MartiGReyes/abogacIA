package com.abogacia.microservicio_abogados.dto;
import com.abogacia.microservicio_abogados.entity.AbogadoRegistrado;
public record AbogadoResponse(String estado, boolean correoConfirmado, String verificacionDni, String validacionMatricula) {
 public static AbogadoResponse de(AbogadoRegistrado a) {
  return new AbogadoResponse(a.getEstado().getNombreEstado(), a.getCorreoConfirmado(), a.getVerificacionDni(), a.getValidacionMatricula());
 }
}

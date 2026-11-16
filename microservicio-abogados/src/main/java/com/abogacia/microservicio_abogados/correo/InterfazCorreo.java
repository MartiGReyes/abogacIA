package com.abogacia.microservicio_abogados.correo;
public interface InterfazCorreo { void enviarMailConfirmacion(String mail, String codigo);  default boolean recuperacionDisponible(){return false;}
 default void enviarRecuperacion(String mail,String token){throw new IllegalStateException("Canal de recuperación no configurado");}
}

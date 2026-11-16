package com.abogacia.microservicio_ciudadanos.correo;

public interface InterfazCorreo {

    void enviarMailConfirmacion(String destinatario, String codigo);
 default boolean recuperacionDisponible(){return false;}
 default void enviarRecuperacion(String mail,String token){throw new IllegalStateException("Canal de recuperación no configurado");}
}

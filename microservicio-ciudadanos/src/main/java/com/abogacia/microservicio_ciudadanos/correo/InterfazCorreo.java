package com.abogacia.microservicio_ciudadanos.correo;

public interface InterfazCorreo {

    void enviarMailConfirmacion(String destinatario, String codigo);
}
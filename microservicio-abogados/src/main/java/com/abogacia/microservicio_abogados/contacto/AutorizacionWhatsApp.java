package com.abogacia.microservicio_abogados.contacto;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Repository;

/** Explicit SQL model, never a Hibernate-generated change. Missing migration means disabled. */
@Repository
public class AutorizacionWhatsApp {
    private final JdbcTemplate jdbc;
    private volatile boolean instalada;
    public AutorizacionWhatsApp(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public boolean disponible(){
        if(instalada)return true;
        instalada=Boolean.TRUE.equals(jdbc.execute((ConnectionCallback<Boolean>) connection->{
            try(var tables=connection.getMetaData().getTables(null,null,null,new String[]{"TABLE"})){
                while(tables.next())if("whatsapp_autorizacion".equalsIgnoreCase(tables.getString("TABLE_NAME"))
                    && "public".equalsIgnoreCase(tables.getString("TABLE_SCHEM")))return true;
                return false;
            }
        }));return instalada;
    }
    public boolean permitido(long id){
        return disponible()&&Boolean.TRUE.equals(jdbc.query("select permitido from whatsapp_autorizacion where id_abogado=?",(r,n)->r.getBoolean(1),id).stream().findFirst().orElse(false));
    }
    public void guardar(long id,boolean permiso){
        if(!disponible())throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"La autorización de WhatsApp no está disponible en este entorno.");
        jdbc.update("insert into whatsapp_autorizacion(id_abogado,permitido,actualizado_en) values(?,?,CURRENT_TIMESTAMP) on conflict(id_abogado) do update set permitido=excluded.permitido,actualizado_en=CURRENT_TIMESTAMP",id,permiso);
    }
    public void revocar(long id){if(disponible())jdbc.update("update whatsapp_autorizacion set permitido=false,actualizado_en=CURRENT_TIMESTAMP where id_abogado=?",id);}
}

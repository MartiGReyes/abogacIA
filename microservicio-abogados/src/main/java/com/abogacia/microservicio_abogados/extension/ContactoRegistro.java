package com.abogacia.microservicio_abogados.extension;
import java.sql.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Repository
public class ContactoRegistro {
    private final JdbcTemplate jdbc;
    private static final String COLUMNAS="c.*,v.puntuacion,v.comentario,v.creado_en valorada_en,v.actualizado_en valoracion_actualizada";
    private static final String TABLAS="contacto_whatsapp c left join valoracion_contacto v on v.id_contacto=c.id";
    public ContactoRegistro(JdbcTemplate jdbc){this.jdbc=jdbc;}
    @Transactional
    public long guardar(long ciudadano,long abogado,String nombreAbogado,Collection<String> especialidades,String nombre,String telefono,String resumen,String mensaje){
        Long id=jdbc.queryForObject("insert into contacto_whatsapp(id_ciudadano,id_abogado,abogado,especialidades,nombre,telefono,resumen,mensaje) values(?,?,?,?,?,?,?,?) returning id",Long.class,
            ciudadano,abogado,recortar(nombreAbogado,220),recortar(String.join(" · ",especialidades),500),nombre,telefono,resumen,mensaje);
        jdbc.update("insert into contacto_estado_historial(id_contacto,estado_nuevo) values(?,'PENDIENTE')",id);
        return id;
    }
    public void clasificar(long id,String area){jdbc.update("update contacto_whatsapp set area_juridica=? where id=?",area,id);}
    private static String recortar(String s,int max){return s==null?"":s.length()>max?s.substring(0,max):s;}
    public static void validarEstado(String estado){
        if(estado!=null&&!estado.isBlank()&&!Set.of("PENDIENTE","EN_CURSO","FINALIZADA").contains(estado))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Estado no válido.");
    }
    public List<Map<String,Object>> listar(long titular,boolean ciudadano,String estado){
        validarEstado(estado);String filtro=estado==null||estado.isBlank()?"":" and c.estado=?";
        Object[] args=filtro.isEmpty()?new Object[]{titular}:new Object[]{titular,estado};
        return jdbc.query("select "+COLUMNAS+" from "+TABLAS+" where c."+(ciudadano?"id_ciudadano":"id_abogado")+"=?"+filtro+" order by c.creado_en desc,c.id desc",(r,n)->fila(r,ciudadano),args);
    }
    public Map<String,Object> detalle(long id,long titular,boolean ciudadano){
        Map<String,Object> row=jdbc.query("select "+COLUMNAS+" from "+TABLAS+" where c.id=? and c."+(ciudadano?"id_ciudadano":"id_abogado")+"=?",(r,n)->fila(r,ciudadano),id,titular)
            .stream().findFirst().orElseThrow(ContactoRegistro::noEncontrada);
        row.put("historialEstados",jdbc.query("select estado_anterior,estado_nuevo,cambiado_en from contacto_estado_historial where id_contacto=? order by cambiado_en,id",(r,n)->{
            Map<String,Object> m=new LinkedHashMap<>();m.put("anterior",r.getString(1));m.put("estado",r.getString(2));m.put("fecha",fecha(r.getTimestamp(3)));return m;},id));
        return row;
    }
    @Transactional
    public Map<String,Object> cambiar(long id,long abogado,String nuevo,String esperado){
        validarEstado(nuevo);validarEstado(esperado);
        if(nuevo==null||esperado==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Indicá el estado actual y el nuevo estado.");
        detalle(id,abogado,false);
        if(!("PENDIENTE".equals(esperado)&&"EN_CURSO".equals(nuevo))&&!("EN_CURSO".equals(esperado)&&"FINALIZADA".equals(nuevo)))throw new ResponseStatusException(HttpStatus.CONFLICT,"Solo podés iniciar una solicitud pendiente o finalizar una en curso.");
        if(jdbc.update("update contacto_whatsapp set estado=?,actualizado_en=CURRENT_TIMESTAMP where id=? and id_abogado=? and estado=?",nuevo,id,abogado,esperado)!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"El estado cambió. Actualizá la lista antes de continuar.");
        jdbc.update("insert into contacto_estado_historial(id_contacto,estado_anterior,estado_nuevo) values(?,?,?)",id,esperado,nuevo);
        return detalle(id,abogado,false);
    }
    static ResponseStatusException noEncontrada(){return new ResponseStatusException(HttpStatus.NOT_FOUND,"Solicitud no encontrada.");}
    private static String fecha(Timestamp t){return t==null?null:t.toInstant().toString();}
    private static Map<String,Object> fila(ResultSet r,boolean ciudadano)throws SQLException{
        Map<String,Object> m=new LinkedHashMap<>();m.put("id",r.getLong("id"));m.put("idAbogado",r.getLong("id_abogado"));m.put("abogado",r.getString("abogado"));m.put("especialidades",r.getString("especialidades"));
        for(String c:List.of("nombre","telefono","resumen","mensaje","estado"))m.put(c,r.getString(c));
        m.put("areaJuridica",r.getString("area_juridica"));
        m.put("creadoEn",fecha(r.getTimestamp("creado_en")));m.put("actualizadoEn",fecha(r.getTimestamp("actualizado_en")));
        if(ciudadano&&r.getObject("puntuacion")!=null){Map<String,Object> v=new LinkedHashMap<>();v.put("puntuacion",r.getInt("puntuacion"));v.put("comentario",r.getString("comentario"));v.put("creadoEn",fecha(r.getTimestamp("valorada_en")));v.put("actualizadoEn",fecha(r.getTimestamp("valoracion_actualizada")));m.put("valoracion",v);}
        return m;
    }
}

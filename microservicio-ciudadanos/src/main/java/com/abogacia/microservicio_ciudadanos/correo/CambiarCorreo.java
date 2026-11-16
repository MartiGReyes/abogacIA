package com.abogacia.microservicio_ciudadanos.correo;
@org.springframework.stereotype.Service
public class CambiarCorreo {
 @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager em;
 private final InterfazCorreo correo;private final com.abogacia.microservicio_ciudadanos.repository.EstadoRepository estados;private final org.springframework.jdbc.core.JdbcTemplate jdbc;private final org.springframework.security.crypto.password.PasswordEncoder passwords;
 public CambiarCorreo(InterfazCorreo c,com.abogacia.microservicio_ciudadanos.repository.EstadoRepository e,org.springframework.jdbc.core.JdbcTemplate j,org.springframework.security.crypto.password.PasswordEncoder p){correo=c;estados=e;jdbc=j;passwords=p;}
 // Caller holds the account lock; all changes and delivery roll back together on failure.
 public void cambiar(com.abogacia.microservicio_ciudadanos.entity.Ciudadano a,String mail){
  mail=CorreoNormalizado.normalizar(mail);if(java.util.Objects.equals(CorreoNormalizado.normalizar(a.getMail()),mail))return;
  jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>)con->{
   boolean table=false;try(var rs=con.getMetaData().getTables(con.getCatalog(),null,null,new String[]{"TABLE"})){while(rs.next())if("recuperacion_cuenta".equalsIgnoreCase(rs.getString("TABLE_NAME"))&&"public".equalsIgnoreCase(rs.getString("TABLE_SCHEM")))table=true;}
   if(table)try(var statement=con.prepareStatement("delete from recuperacion_cuenta where cuenta_id=?")){statement.setLong(1,a.getIdCiudadano());statement.executeUpdate();}return null;
  });
  a.setMail(mail);a.setCorreoConfirmado(false);a.setEstado(estados.findByNombreEstado("PENDIENTE").orElseThrow());
  String code=TokenCorreo.nuevo();a.setCodigoConfirmacion(TokenCorreo.guardar(code));
  em.flush();correo.enviarMailConfirmacion(mail,code);
 }
}

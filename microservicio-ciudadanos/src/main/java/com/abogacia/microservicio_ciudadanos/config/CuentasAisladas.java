package com.abogacia.microservicio_ciudadanos.config;

import java.nio.file.*;
import java.util.Arrays;
import org.springframework.boot.*;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration @Profile("cuentas-contacto-test")
public class CuentasAisladas {
    public static void validar(Environment e){
        if(!Arrays.equals(e.getActiveProfiles(),new String[]{"cuentas-contacto-test"})
            ||!"jdbc:postgresql://postgres-operativa:5432/contacto_operativo_test?currentSchema=ciudadanos_cuenta".equals(e.getProperty("spring.datasource.url"))
            ||!"ciudadanos_runtime".equals(e.getProperty("spring.datasource.username"))
            ||!"validate".equals(e.getProperty("spring.jpa.hibernate.ddl-auto"))
            ||!"never".equals(e.getProperty("spring.sql.init.mode"))
            ||!e.getProperty("DIDIT_API_KEY","").isBlank()||!e.getProperty("DIDIT_WORKFLOW_ID","").isBlank()
            ||e.getProperty("DIDIT_RECONCILIATION_ENABLED",Boolean.class,true)||e.getProperty("DIDIT_PRIVACY_READY",Boolean.class,false))
            throw new IllegalStateException("Las cuentas sintéticas de ciudadanos solo admiten su esquema y configuración aislados.");
    }
    @Bean static BeanFactoryPostProcessor cuentasGuard(Environment e){return f->validar(e);}
    @Bean ApplicationRunner sembrarCiudadano(JdbcTemplate jdbc,PasswordEncoder encoder,Environment env){return args->{
        var db=jdbc.queryForMap("select current_database() db,current_user usuario");
        if(!"contacto_operativo_test".equals(db.get("db"))||!"ciudadanos_runtime".equals(db.get("usuario")))throw new IllegalStateException("Base no autorizada.");
        String password=Files.readString(Path.of(env.getRequiredProperty("CUENTAS_TEST_PASSWORD_FILE"))).trim();
        if(password.length()<24)throw new IllegalStateException("Contraseña sintética insuficiente.");
        if(jdbc.queryForObject("select count(*) from ciudadano where id_ciudadano=971001",Long.class)==0)
            jdbc.update("insert into ciudadano(id_ciudadano,nombre,apellido,dni,fecha_nacimiento,direccion,mail,contrasena_hash,id_estado,correo_confirmado,verificacion_dni) values(971001,'Ciudadano','de prueba','T0971001','1990-01-01','Entorno aislado','ciudadano.prueba@abogacia.local',?,(select id_estado from estado where nombre_estado='REGISTRADO'),false,'DECLARADA_NO_VERIFICADA')",encoder.encode(password));
    };}
}

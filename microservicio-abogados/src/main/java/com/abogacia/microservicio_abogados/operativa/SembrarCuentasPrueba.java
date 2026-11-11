package com.abogacia.microservicio_abogados.operativa;

import java.nio.file.*;
import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name="abogados.cuentas-prueba.enabled",havingValue="true")
public class SembrarCuentasPrueba implements ApplicationRunner {
    private final JdbcTemplate jdbc;private final PasswordEncoder encoder;private final String archivo;
    public SembrarCuentasPrueba(JdbcTemplate j,PasswordEncoder p,@Value("${CUENTAS_TEST_PASSWORD_FILE}") String f){jdbc=j;encoder=p;archivo=f;}
    @Override @Transactional public void run(ApplicationArguments args)throws Exception{
        String password=Files.readString(Path.of(archivo)).trim();if(password.length()<24)throw new IllegalStateException("Contraseña local insuficiente.");
        for(int n=1;n<=2;n++){
            long id=961000+n;String matricula="PRUEBA-"+id;
            var rows=jdbc.queryForList("select nro_matricula from abogados_registrados where id_abogado=?",id);
            if(!rows.isEmpty()){
                if(!matricula.equals(rows.getFirst().get("nro_matricula"))||jdbc.queryForObject("select count(*) from operativa.cuenta_prueba where id_abogado=?",Long.class,id)!=1)throw new IllegalStateException("Colisión de cuentas locales; no se sobrescribió ningún dato.");
                continue;
            }
            jdbc.update("insert into abogados_registrados(id_abogado,version,nombre,apellido,dni,mail,nro_celular,nro_matricula,colegio_profesional,provincia,anios_experiencia,ubicacion,descripcion_profesional,contrasena_hash,dni_verificado,matricula_verificada,fecha_registro,id_estado,fecha_nacimiento,domicilio,honorarios,direccion_profesional,correo_confirmado,verificacion_dni,validacion_matricula) values(?,0,?,? ,?,?,null,?,'No verificado','Córdoba',0,'Entorno aislado','Cuenta de prueba; sin habilitación profesional',?,false,false,current_date,(select id_estado from estado where nombre_estado='REGISTRADO'),'1990-01-01','Entorno aislado',0,'Entorno aislado',false,'DECLARADA_NO_VERIFICADA','FICTICIA_NO_VERIFICADA')",
                id,"Abogado de prueba",String.valueOf(n),"T"+String.format("%07d",id),n==1?"abogado.prueba@abogacia.local":"abogado.otro@abogacia.local",matricula,encoder.encode(password));
            jdbc.update("insert into abogado_especialidades(id_abogado,especialidad) values(?,'Derecho Laboral')",id);
            jdbc.update("insert into operativa.cuenta_prueba(id_abogado,contexto) values(?,?)",id,UUID.randomUUID());
        }
    }
}

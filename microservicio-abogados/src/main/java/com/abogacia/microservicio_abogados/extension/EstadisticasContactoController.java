package com.abogacia.microservicio_abogados.extension;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/abogados/me")
public class EstadisticasContactoController {
    private final JdbcTemplate jdbc;
    static final ZoneId ZONA=ZoneId.of("America/Argentina/Buenos_Aires");
    public EstadisticasContactoController(JdbcTemplate jdbc){this.jdbc=jdbc;}

    public record Ingreso(BigDecimal importe,LocalDate fechaIngreso){}
    public static void validarIngreso(Ingreso i){
        if(i==null||i.importe()==null||i.importe().signum()<0||i.importe().compareTo(new BigDecimal("9999999999999.99"))>0||i.importe().stripTrailingZeros().scale()>2)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Ingresá un importe no negativo en pesos, con hasta dos decimales y un máximo de 9.999.999.999.999,99.");
        if(i.fechaIngreso()==null||i.fechaIngreso().getYear()<1900||i.fechaIngreso().getYear()>2200)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Ingresá una fecha de ingreso válida.");
    }
    public record Rango(LocalDate desde,LocalDate hasta,YearMonth mes){
        public static Rango parse(String desde,String hasta,String mes){
            try{
                LocalDate hoy=LocalDate.now(ZONA);
                LocalDate d=desde==null?hoy.withDayOfMonth(1):LocalDate.parse(desde),h=hasta==null?hoy:LocalDate.parse(hasta);
                YearMonth m=mes==null?YearMonth.from(hoy):YearMonth.parse(mes);
                if(d.isAfter(h)||d.getYear()<1900||h.getYear()>2200||m.getYear()<1900||m.getYear()>2200||ChronoUnit.DAYS.between(d,h)>3660)throw new IllegalArgumentException();
                return new Rango(d,h,m);
            }catch(RuntimeException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Seleccioná fechas válidas, con inicio anterior o igual al fin y un intervalo de hasta 10 años.");}
        }
    }
    @PostMapping("/contactos/{id}/ingreso") @Transactional
    public ResponseEntity<?> registrar(@AuthenticationPrincipal Jwt jwt,@PathVariable long id,@RequestBody Ingreso ingreso){
        long abogado=ContactosController.titular(jwt,"ABOGADO");validarIngreso(ingreso);finalizado(id,abogado);
        int n=jdbc.update("insert into ingreso_contacto(id_contacto,importe,fecha_ingreso) values(?,?,?) on conflict(id_contacto) do nothing",id,ingreso.importe(),ingreso.fechaIngreso());
        if(n==0)throw new ResponseStatusException(HttpStatus.CONFLICT,"Este asesoramiento ya tiene un ingreso. Usá la opción de editar.");
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore()).body(ingreso(id));
    }
    @PutMapping("/contactos/{id}/ingreso") @Transactional
    public ResponseEntity<?> modificar(@AuthenticationPrincipal Jwt jwt,@PathVariable long id,@RequestBody Ingreso ingreso){
        long abogado=ContactosController.titular(jwt,"ABOGADO");validarIngreso(ingreso);finalizado(id,abogado);
        if(jdbc.update("update ingreso_contacto set importe=?,fecha_ingreso=?,actualizado_en=CURRENT_TIMESTAMP where id_contacto=?",ingreso.importe(),ingreso.fechaIngreso(),id)!=1)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Todavía no registraste un ingreso para este asesoramiento.");
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ingreso(id));
    }
    @GetMapping("/contactos/{id}/ingreso")
    public ResponseEntity<?> consultarIngreso(@AuthenticationPrincipal Jwt jwt,@PathVariable long id){
        long abogado=ContactosController.titular(jwt,"ABOGADO");
        if(jdbc.queryForObject("select count(*) from contacto_whatsapp where id=? and id_abogado=?",Long.class,id,abogado)!=1)throw ContactoRegistro.noEncontrada();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ingreso(id));
    }
    private void finalizado(long id,long abogado){
        String estado=jdbc.query("select estado from contacto_whatsapp where id=? and id_abogado=? for update",(r,n)->r.getString(1),id,abogado).stream().findFirst().orElseThrow(ContactoRegistro::noEncontrada);
        if(!"FINALIZADA".equals(estado))throw new ResponseStatusException(HttpStatus.CONFLICT,"Solo podés registrar ingresos de asesoramientos finalizados.");
    }
    private Map<String,Object> ingreso(long id){
        return jdbc.query("select importe,fecha_ingreso,creado_en,actualizado_en from ingreso_contacto where id_contacto=?",(r,n)->Map.<String,Object>of("registrado",true,"importe",r.getBigDecimal(1).toPlainString(),"fechaIngreso",r.getDate(2).toString(),"creadoEn",r.getTimestamp(3).toInstant().toString(),"actualizadoEn",r.getTimestamp(4).toInstant().toString()),id)
            .stream().findFirst().orElseGet(()->Map.of("registrado",false));
    }

    @GetMapping("/estadisticas")
    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public ResponseEntity<?> estadisticas(@AuthenticationPrincipal Jwt jwt,@RequestParam(required=false) String desde,@RequestParam(required=false) String hasta,@RequestParam(required=false) String mes){
        long abogado=ContactosController.titular(jwt,"ABOGADO");Rango r=Rango.parse(desde,hasta,mes);
        Timestamp inicio=Timestamp.from(r.desde().atStartOfDay(ZONA).toInstant()),fin=Timestamp.from(r.hasta().plusDays(1).atStartOfDay(ZONA).toInstant());
        var estados=jdbc.queryForMap("select count(*) recibidas,count(*) filter(where estado='PENDIENTE') pendientes,count(*) filter(where estado='EN_CURSO') en_curso,count(*) filter(where estado='FINALIZADA') finalizadas from contacto_whatsapp where id_abogado=?",abogado);
        var areas=jdbc.query("select x.area,count(c.id) cantidad from (select especialidad area from abogado_especialidades where id_abogado=? union select area_juridica from contacto_whatsapp where id_abogado=?) x left join contacto_whatsapp c on c.id_abogado=? and c.area_juridica=x.area group by x.area order by cantidad desc,x.area",(rs,n)->Map.of("area",rs.getString(1),"cantidad",rs.getLong(2)),abogado,abogado,abogado);
        var valoraciones=jdbc.queryForMap("select count(*) cantidad,round(avg(v.puntuacion),2) promedio from valoracion_contacto v join contacto_whatsapp c on c.id=v.id_contacto where c.id_abogado=?",abogado);
        var acumulado=total("",new Object[]{abogado});
        var periodo=total(" and i.fecha_ingreso>=? and i.fecha_ingreso<=?",new Object[]{abogado,r.desde(),r.hasta()});
        var mensual=total(" and i.fecha_ingreso>=? and i.fecha_ingreso<?",new Object[]{abogado,r.mes().atDay(1),r.mes().plusMonths(1).atDay(1)});
        boolean meses=ChronoUnit.DAYS.between(r.desde(),r.hasta())>62;
        var consultas=serie(abogado,r,meses,false,inicio,fin);
        var ingresos=serie(abogado,r,meses,true,inicio,fin);
        var casos=jdbc.query("select c.id,c.nombre,c.resumen,c.area_juridica,c.actualizado_en,i.importe,i.fecha_ingreso from contacto_whatsapp c left join ingreso_contacto i on i.id_contacto=c.id where c.id_abogado=? and c.estado='FINALIZADA' order by c.actualizado_en desc,c.id desc",(rs,n)->{
            Map<String,Object> m=new LinkedHashMap<>();m.put("id",rs.getLong(1));m.put("ciudadano",rs.getString(2));m.put("motivo",rs.getString(3));m.put("areaJuridica",rs.getString(4));m.put("finalizadaEn",rs.getTimestamp(5).toInstant().toString());m.put("registrado",rs.getBigDecimal(6)!=null);m.put("importe",rs.getBigDecimal(6)==null?null:rs.getBigDecimal(6).toPlainString());m.put("fechaIngreso",rs.getDate(7)==null?null:rs.getDate(7).toString());return m;},abogado);
        Map<String,Object> resultado=new LinkedHashMap<>();resultado.put("indicadores",estados);resultado.put("areas",areas);resultado.put("valoraciones",valoraciones);resultado.put("acumulado",acumulado);resultado.put("mensual",mensual);resultado.put("periodo",periodo);resultado.put("consultas",consultas);resultado.put("ingresos",ingresos);resultado.put("asesoramientos",casos);resultado.put("desde",r.desde().toString());resultado.put("hasta",r.hasta().toString());resultado.put("mes",r.mes().toString());resultado.put("granularidad",meses?"mensual":"diaria");resultado.put("moneda","ARS");resultado.put("consultadoEn",Instant.now().toString());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(resultado);
    }
    private Map<String,Object> total(String filtro,Object[] args){
        return jdbc.queryForObject("select count(*),sum(i.importe) from ingreso_contacto i join contacto_whatsapp c on c.id=i.id_contacto where c.id_abogado=? and c.estado='FINALIZADA'"+filtro,(r,n)->{
            Map<String,Object> m=new LinkedHashMap<>();m.put("cantidad",r.getLong(1));m.put("total",r.getBigDecimal(2)==null?null:r.getBigDecimal(2).toPlainString());return m;},args);
    }
    private List<Map<String,Object>> serie(long abogado,Rango r,boolean meses,boolean ingresos,Timestamp inicio,Timestamp fin){
        String formato=meses?"YYYY-MM":"YYYY-MM-DD";
        String sql=ingresos?"select to_char(i.fecha_ingreso,'"+formato+"') periodo,sum(i.importe) valor,count(*) cantidad from ingreso_contacto i join contacto_whatsapp c on c.id=i.id_contacto where c.id_abogado=? and c.estado='FINALIZADA' and i.fecha_ingreso>=? and i.fecha_ingreso<=? group by 1":
            "select to_char(c.creado_en at time zone 'America/Argentina/Buenos_Aires','"+formato+"') periodo,count(*) valor,count(*) cantidad from contacto_whatsapp c where c.id_abogado=? and c.creado_en>=? and c.creado_en<? group by 1";
        Object[] args=ingresos?new Object[]{abogado,r.desde(),r.hasta()}:new Object[]{abogado,inicio,fin};
        Map<String,Map<String,Object>> encontrados=new HashMap<>();
        jdbc.query(sql,rs->{Map<String,Object> m=new LinkedHashMap<>();m.put("periodo",rs.getString(1));m.put("valor",ingresos?rs.getBigDecimal(2).toPlainString():rs.getLong(2));m.put("cantidad",rs.getLong(3));encontrados.put(rs.getString(1),m);},args);
        List<Map<String,Object>> rows=new ArrayList<>();
        for(LocalDate d=meses?r.desde().withDayOfMonth(1):r.desde();!d.isAfter(r.hasta());d=meses?d.plusMonths(1):d.plusDays(1)){
            String key=meses?YearMonth.from(d).toString():d.toString();rows.add(encontrados.getOrDefault(key,Map.of("periodo",key,"valor",ingresos?"0.00":0L,"cantidad",0L)));
        }
        return rows;
    }
}

package com.abogacia.microservicio_abogados.dashboard;

import java.math.*;
import java.sql.Timestamp;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.stereotype.Repository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true, isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
public class DashboardRepository {
    static final ZoneId ZONA = ZoneId.of("America/Argentina/Buenos_Aires");
    private final NamedParameterJdbcTemplate jdbc;
    public DashboardRepository(javax.sql.DataSource source) { jdbc = new NamedParameterJdbcTemplate(source); }

    public record Filtro(LocalDate desde, LocalDate hasta, YearMonth mes, String area, String moneda,
                         String estado, String fechaBase, String orden, String direccion, int pagina, int tamano) {
        public static Filtro parse(Map<String,String> p) {
            try {
                LocalDate hoy = LocalDate.now(ZONA);
                LocalDate desde = LocalDate.parse(p.getOrDefault("desde", hoy.minusDays(29).toString()));
                LocalDate hasta = LocalDate.parse(p.getOrDefault("hasta", hoy.toString()));
                var mes = YearMonth.parse(p.getOrDefault("mes", YearMonth.from(hoy).toString()));
                int pagina = Integer.parseInt(p.getOrDefault("pagina", "0"));
                int tamano = Integer.parseInt(p.getOrDefault("tamano", "20"));
                String orden = p.getOrDefault("orden", "fecha"), direccion = p.getOrDefault("direccion", "desc");
                String base = p.getOrDefault("fechaBase", "inicio"), estado = p.getOrDefault("estado", "");
                if (desde.isAfter(hasta) || ChronoUnit.DAYS.between(desde, hasta) > 1827 || pagina < 0 || pagina > 1000000
                    || tamano < 1 || tamano > 100 || !Set.of("fecha","importe","id").contains(orden)
                    || !Set.of("asc","desc").contains(direccion) || !Set.of("inicio","finalizacion").contains(base)
                    || !Set.of("","ACEPTADA","EN_CURSO","FINALIZADO","CANCELADO").contains(estado)
                    || !p.getOrDefault("moneda", "ARS").matches("[A-Z]{3}") || p.getOrDefault("area", "").length() > 100)
                    throw new IllegalArgumentException();
                return new Filtro(desde,hasta,mes,p.getOrDefault("area",""),p.getOrDefault("moneda","ARS"),estado,base,orden,direccion,pagina,tamano);
            } catch (RuntimeException ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Filtros inválidos."); }
        }
        MapSqlParameterSource params(long id) {
            return new MapSqlParameterSource("titular",id).addValue("desde", Timestamp.from(desde.atStartOfDay(ZONA).toInstant()))
                .addValue("hasta",Timestamp.from(hasta.plusDays(1).atStartOfDay(ZONA).toInstant()))
                .addValue("area",area).addValue("moneda",moneda).addValue("estado",estado)
                .addValue("limite",tamano).addValue("offset",(long)pagina*tamano);
        }
    }
    private static final String JOIN = " from asesoramiento a join solicitud_asesoramiento s on s.id=a.id_solicitud ";
    private static final String OWNER = " s.id_abogado=:titular ";
    private static final String AREA = " and (:area='' or s.area_juridica=:area) ";
    private static String rango(String columna) { return " and " + columna + ">=:desde and " + columna + "<:hasta "; }
    private List<Map<String,Object>> filas(String sql, MapSqlParameterSource p) {
        var rows = jdbc.queryForList(sql,p);
        // Stable JSON names and exact decimal strings; never sum money in the browser.
        List<Map<String,Object>> resultado = new ArrayList<>();
        for (var row : rows) {
            Map<String,Object> r = new LinkedHashMap<>();
            row.forEach((k,v) -> r.put(k.toLowerCase(Locale.ROOT), v instanceof BigDecimal b ? b.toPlainString() : v));
            resultado.add(r);
        }
        return resultado;
    }
    private Object escalar(String sql, MapSqlParameterSource p) { return jdbc.queryForObject(sql,p,Object.class); }
    private Object pagina(String select, String from, String order, Filtro f, MapSqlParameterSource p) {
        return Map.of("contenido",filas(select+from+" order by "+order+" limit :limite offset :offset",p),
            "total",escalar("select count(*) from (select 1 "+from+") q",p),"pagina",f.pagina(),"tamano",f.tamano());
    }
    public Object consultar(long id, String recurso, Filtro f) {
        var p = f.params(id);
        String casos = JOIN+" where "+OWNER+AREA;
        String cobros = " from pago_asesoramiento p join asesoramiento a on a.id=p.id_asesoramiento join solicitud_asesoramiento s on s.id=a.id_solicitud where "+OWNER+AREA+" and p.estado='COBRADO' ";
        String inicio = casos+rango("a.iniciado_en");
        return switch (recurso) {
            case "resumen" -> {
                Map<String,Object> r = new LinkedHashMap<>();
                r.put("aceptadas",escalar("select count(*) from solicitud_asesoramiento s where "+OWNER+AREA+" and s.estado='ACEPTADA'"+rango("s.aceptada_en"),p));
                r.put("finalizados",escalar("select count(*)"+casos+" and a.estado='FINALIZADO'"+rango("a.finalizado_en"),p));
                r.put("valoraciones",consultar(id,"valoraciones",f));
                r.put("historico",filas("select p.moneda, sum(p.importe) total"+cobros+" and p.cobrado_en<=CURRENT_TIMESTAMP group by p.moneda",p));
                r.put("periodo",filas("select p.moneda, sum(p.importe) total"+cobros+rango("p.cobrado_en")+" group by p.moneda",p));
                r.put("desde",f.desde()); r.put("hasta",f.hasta()); r.put("zona",ZONA.toString()); r.put("consultadoEn",Instant.now());
                yield r;
            }
            case "valoraciones" -> {
                String from = " from valoracion_asesoramiento v join asesoramiento a on a.id=v.id_asesoramiento join solicitud_asesoramiento s on s.id=a.id_solicitud where "+OWNER+AREA+" and v.puntuacion between 1 and 5"+rango("v.creada_en");
                var r = new LinkedHashMap<>(filas("select avg(v.puntuacion) promedio, count(*) cantidad"+from,p).getFirst());
                r.put("distribucion",filas("select v.puntuacion, count(*) cantidad"+from+" group by v.puntuacion order by v.puntuacion",p));
                yield r;
            }
            case "por-area" -> filas("select s.area_juridica area, count(*) cantidad, 100.0*count(*)/sum(count(*)) over () porcentaje"+inicio+" group by s.area_juridica order by cantidad desc, area",p);
            case "por-periodo" -> {
                String unidad = ChronoUnit.DAYS.between(f.desde(),f.hasta()) <= 31 ? "day" : "month";
                p.addValue("unidad",unidad);
                yield filas("with puntos as (select date_trunc(:unidad,a.iniciado_en at time zone 'America/Argentina/Buenos_Aires') fecha, count(*) inicios, 0::bigint finalizados"+inicio+" group by 1 union all select date_trunc(:unidad,a.finalizado_en at time zone 'America/Argentina/Buenos_Aires'),0::bigint,count(*)"+casos+" and a.estado='FINALIZADO'"+rango("a.finalizado_en")+" group by 1), calendario as (select generate_series(date_trunc(:unidad,cast(:desde as timestamptz) at time zone 'America/Argentina/Buenos_Aires'),date_trunc(:unidad,(cast(:hasta as timestamptz)-interval '1 second') at time zone 'America/Argentina/Buenos_Aires'),cast('1 '||:unidad as interval)) fecha) select c.fecha,coalesce(sum(p.inicios),0) inicios,coalesce(sum(p.finalizados),0) finalizados from calendario c left join puntos p on p.fecha=c.fecha group by c.fecha order by c.fecha",p);
            }
            case "solicitudes" -> pagina("select s.id, s.aceptada_en fecha, s.area_juridica area,s.estado,a.id asesoramiento", " from solicitud_asesoramiento s left join asesoramiento a on a.id_solicitud=s.id where "+OWNER+AREA+" and s.estado='ACEPTADA'"+rango("s.aceptada_en"), (f.orden().equals("id")?"s.id":"s.aceptada_en")+" "+f.direccion()+",s.id",f,p);
            case "asesoramientos" -> {
                String fecha=f.fechaBase().equals("inicio")?"a.iniciado_en":"a.finalizado_en";
                yield pagina("select a.id,s.id solicitud,a.iniciado_en,a.finalizado_en,"+fecha+" fecha,s.area_juridica area,a.estado",casos+rango(fecha)+" and (:estado='' or a.estado=:estado)",(f.orden().equals("id")?"a.id":fecha)+" "+f.direccion()+",a.id",f,p);
            }
            case "ingresos/por-asesoramiento" -> {
                String from=cobros+rango("p.cobrado_en")+" and p.moneda=:moneda group by a.id,s.area_juridica,p.moneda";
                yield pagina("select a.id,s.area_juridica area,p.moneda,sum(p.importe) total,max(p.cobrado_en) fecha",from,(f.orden().equals("importe")?"sum(p.importe)":f.orden().equals("id")?"a.id":"max(p.cobrado_en)")+" "+f.direccion()+",a.id",f,p);
            }
            case "ingresos/mensuales" -> {
                // Independent full-month comparison and a 12-month chart ending in the selected month.
                p.addValue("mesInicio",Timestamp.from(f.mes().minusMonths(11).atDay(1).atStartOfDay(ZONA).toInstant()))
                    .addValue("mesFin",Timestamp.from(f.mes().plusMonths(1).atDay(1).atStartOfDay(ZONA).toInstant()));
                var serie=filas("with cobros as (select date_trunc('month',p.cobrado_en at time zone 'America/Argentina/Buenos_Aires') mes,sum(p.importe) total"+cobros+" and p.moneda=:moneda and p.cobrado_en>=:mesInicio and p.cobrado_en<:mesFin group by 1), meses as (select generate_series(cast(:mesInicio as timestamptz) at time zone 'America/Argentina/Buenos_Aires',(cast(:mesFin as timestamptz) at time zone 'America/Argentina/Buenos_Aires')-interval '1 month',interval '1 month') mes) select to_char(m.mes,'YYYY-MM') mes,coalesce(c.total,0) total from meses m left join cobros c on c.mes=m.mes order by m.mes",p);
                BigDecimal actual=new BigDecimal(serie.getLast().get("total").toString()), anterior=new BigDecimal(serie.get(10).get("total").toString());
                Map<String,Object> r=new LinkedHashMap<>(); r.put("serie",serie);r.put("total",actual.toPlainString());r.put("anterior",anterior.toPlainString());r.put("moneda",f.moneda());r.put("mes",f.mes().toString());
                r.put("variacion",anterior.signum()==0?null:actual.subtract(anterior).multiply(BigDecimal.valueOf(100)).divide(anterior,2,RoundingMode.HALF_UP).toPlainString());yield r;
            }
            default -> throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        };
    }
    public Object detalle(long titular,long id,Filtro f,boolean pagos) {
        var p=f.params(titular).addValue("id",id);
        var casos=filas("select a.id,s.id solicitud,s.id_ciudadano referencia_ciudadano,s.descripcion,s.area_juridica area,a.estado,a.iniciado_en,a.finalizado_en"+JOIN+" where "+OWNER+" and a.id=:id",p);
        if(casos.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if(pagos) {
            @SuppressWarnings("unchecked")
            var r=new LinkedHashMap<>((Map<String,Object>)pagina("select p.id,p.cobrado_en fecha,p.importe,p.moneda,p.estado", " from pago_asesoramiento p where p.id_asesoramiento=:id"+rango("p.cobrado_en"), (f.orden().equals("importe")?"p.importe":"p.cobrado_en")+" "+f.direccion()+",p.id",f,p));
            r.put("totales",filas("select p.moneda,sum(p.importe) total from pago_asesoramiento p where p.id_asesoramiento=:id and p.estado='COBRADO'"+rango("p.cobrado_en")+" group by p.moneda",p));return r;
        }
        var caso=casos.getFirst();caso.put("ingresos",filas("select moneda,sum(importe) total from pago_asesoramiento where id_asesoramiento=:id and estado='COBRADO' group by moneda",p));return caso;
    }
}

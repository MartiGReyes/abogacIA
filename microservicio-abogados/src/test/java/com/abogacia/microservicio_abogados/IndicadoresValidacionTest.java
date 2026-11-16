package com.abogacia.microservicio_abogados;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import com.abogacia.microservicio_abogados.extension.EstadisticasContactoController;
import static org.junit.jupiter.api.Assertions.*;
class IndicadoresValidacionTest {
    @Test void importesExactosYCeroSonValidos(){for(String monto:new String[]{"0","0.00","10.50","10.500","9999999999999.99"})assertDoesNotThrow(()->EstadisticasContactoController.validarIngreso(new EstadisticasContactoController.Ingreso(new BigDecimal(monto),LocalDate.of(2026,11,11))));}
    @Test void rechazaNegativosFraccionesExcesivasYDesbordamientos(){for(String monto:new String[]{"-0.01","0.001","10000000000000","1E100"})assertThrows(ResponseStatusException.class,()->EstadisticasContactoController.validarIngreso(new EstadisticasContactoController.Ingreso(new BigDecimal(monto),LocalDate.of(2026,11,11))));assertThrows(ResponseStatusException.class,()->EstadisticasContactoController.validarIngreso(new EstadisticasContactoController.Ingreso(BigDecimal.ONE,null)));}
    @Test void validaFechasYRangos(){assertDoesNotThrow(()->EstadisticasContactoController.Rango.parse("2026-01-01","2026-01-01","2026-01"));for(String[] r:new String[][]{{"2026-02-30","2026-03-01","2026-03"},{"2026-11-12","2026-11-11","2026-11"},{"2026-01-01","2026-02-01","2026-13"},{"2000-01-01","2026-01-01","2026-01"}})assertThrows(ResponseStatusException.class,()->EstadisticasContactoController.Rango.parse(r[0],r[1],r[2]));}
}

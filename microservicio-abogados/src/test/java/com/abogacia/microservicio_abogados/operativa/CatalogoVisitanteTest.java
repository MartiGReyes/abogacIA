package com.abogacia.microservicio_abogados.operativa;

import com.abogacia.microservicio_abogados.controller.CatalogoAbogadosController;
import com.abogacia.microservicio_abogados.gestor.RecomendarAbogadosGestor;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;

class CatalogoVisitanteTest {
    @Test void catalogoLocalMuestraCuentasPersistidasSinJwtPeroSinCamposPersonales(){
        var gestor=mock(RecomendarAbogadosGestor.class);when(gestor.catalogo()).thenReturn(List.of());
        var local=mock(CuentaPruebaService.class);var tarjeta=Map.<String,Object>of("idAbogado",981102L,"nombre","AUTOTEST","cuentaPrueba",true,"matriculaVerificada",false,"contactoHabilitado",true);
        when(local.listar(null)).thenReturn(List.of(tarjeta));var controller=new CatalogoAbogadosController(gestor);ReflectionTestUtils.setField(controller,"local",local);
        var request=new MockHttpServletRequest();request.addHeader("Host","localhost:5182");
        assertEquals(List.of(tarjeta),controller.catalogo(request).getBody());assertFalse(tarjeta.containsKey("dni"));assertFalse(tarjeta.containsKey("nroCelular"));
    }
    @Test void sinExcepcionLocalNoSeConsultaNiExponeUnCatalogoDePrueba(){
        var gestor=mock(RecomendarAbogadosGestor.class);when(gestor.catalogo()).thenReturn(List.of());
        assertEquals(List.of(),new CatalogoAbogadosController(gestor).catalogo(new MockHttpServletRequest()).getBody());verify(gestor).catalogo();
    }
    @Test void recomendacionesLocalesTambienAdmitenVisitantesYConservanElFiltro(){
        var gestor=mock(RecomendarAbogadosGestor.class);when(gestor.recomendar("Derecho Laboral")).thenReturn(List.of());
        var local=mock(CuentaPruebaService.class);var tarjeta=Map.<String,Object>of("idAbogado",981102L,"cuentaPrueba",true,"matriculaVerificada",false);
        when(local.listar("Derecho Laboral")).thenReturn(List.of(tarjeta));
        var controller=new com.abogacia.microservicio_abogados.controller.RecomendacionesController(gestor);ReflectionTestUtils.setField(controller,"local",local);
        var request=new MockHttpServletRequest();request.addHeader("Host","localhost:5182");
        assertEquals(List.of(tarjeta),controller.recomendar("Derecho Laboral",request).getBody());verify(local).listar("Derecho Laboral");
    }
}

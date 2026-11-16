package com.abogacia.microservicio_abogados.correo;
import org.junit.jupiter.api.Test;import static org.junit.jupiter.api.Assertions.*;
class LimiteCorreoTest {
 @Test void bloqueaIntentosRepetidosSinConsultarDatos()throws Exception {var filter=new LimiteCorreo();for(int i=0;i<121;i++){var req=new org.springframework.mock.web.MockHttpServletRequest("POST","/api/abogados/confirmar");var res=new org.springframework.mock.web.MockHttpServletResponse();filter.doFilter(req,res,(a,b)->{});assertEquals(i==120?429:200,res.getStatus());}}
}

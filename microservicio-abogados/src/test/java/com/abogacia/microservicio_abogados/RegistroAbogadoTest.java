package com.abogacia.microservicio_abogados;
import com.abogacia.microservicio_abogados.repository.*;
import com.abogacia.microservicio_abogados.entity.*;
import com.abogacia.microservicio_abogados.gestor.*;
import com.abogacia.microservicio_abogados.didit.VerificadorIdentidad;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.http.MediaType;
import java.time.Instant;
import java.time.LocalDate;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest
class RegistroAbogadoTest {
 @Autowired WebApplicationContext context;
 @Autowired AbogadoRepository abogados; @Autowired PadronRepository padron;
 @Autowired PadronEvidenciaRepository evidencias; @Autowired VerificacionIdentidadRepository verificaciones;
 @Autowired PasswordEncoder passwords; @Autowired VerificarDniAbogadoGestor didit;
 MockMvc mvc;String token;
 static final String SOLICITUD="{\"dni\":\"12345678\",\"mail\":\"ana@example.com\",\"nroCelular\":\"3511234567\"}";
 static final String CUENTA="""
 {"especialidades":["Derecho Civil","Derecho de Familia"],"aniosExperiencia":3,"honorarios":1000,"ubicacion":"Río Tercero",
 "direccionProfesional":"Calle 2","descripcionProfesional":"Asesoramiento civil","nroMatricula":"10-999",
 "colegioProfesional":"Colegio de Abogados de Río Tercero","provincia":"Córdoba","contrasena":"clave-segura","confirmarContrasena":"clave-segura"}
 """;
 static final VerificadorIdentidad.DatosPersonales DATOS=new VerificadorIdentidad.DatosPersonales("Ana","Prueba",LocalDate.of(1990,1,1),"Femenino","Calle 1, Córdoba");
 @BeforeEach void setup()throws Exception{
  verificaciones.deleteAll();abogados.deleteAll();evidencias.deleteAll();padron.deleteAll();
  padron.save(new Padron("10-999","LOCAL"));
  evidencia("12345678","ACTIVO");
  mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
  token=solicitud(SOLICITUD);
 }
 void evidencia(String dni,String estado){evidencias.save(new PadronEvidencia("10-999",dni,"PRUEBA ANA",estado,"test",1,"test"));}
 static final java.util.concurrent.atomic.AtomicInteger IP=new java.util.concurrent.atomic.AtomicInteger();
 /** Each request comes from a different address so the per-IP limit does not leak between tests. */
 org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder nuevaSolicitud(String json){
  int n=IP.incrementAndGet();
  return post("/api/abogados/verificacion/solicitud").contentType(MediaType.APPLICATION_JSON).content(json)
   .with(r->{r.setRemoteAddr("10.1."+(n/250)+"."+(n%250));return r;});
 }
 String solicitud(String json)throws Exception{
  String body=mvc.perform(nuevaSolicitud(json)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
  return com.jayway.jsonpath.JsonPath.read(body,"$.token");
 }
 ResultActions completar(String json)throws Exception{
  return mvc.perform(post("/api/abogados/verificacion/cuenta").header("X-Registro-Token",token).contentType(MediaType.APPLICATION_JSON).content(json));
 }
 AbogadoRegistrado cuenta(){return abogados.findByMail("ana@example.com").orElseThrow();}
 void didit(String evento,String dni,VerificadorIdentidad.Estado estado){
  var a=cuenta();if(a.getSesionDidit()==null){a.setSesionDidit("sesion-backend");abogados.save(a);}
  didit.actualizar(a.getIdAbogado(),s->new VerificadorIdentidad.Resultado(s,evento,dni,estado,DATOS));
 }
 void aprobar(){didit("evento-ok","12345678",VerificadorIdentidad.Estado.APROBADA);}
 ResultActions confirmar(String codigo)throws Exception{return mvc.perform(post("/api/abogados/confirmar").contentType(MediaType.APPLICATION_JSON)
  .content("{\"mail\":\"ana@example.com\",\"codigo\":\""+codigo+"\"}"));}
 void codigoConocido(){var a=cuenta();a.setCodigoConfirmacion(passwords.encode("123456"));abogados.save(a);}
 ResultActions login(boolean interno)throws Exception{
  var request=post("/api/interno/abogados/validar-credenciales").contentType(MediaType.APPLICATION_JSON).content("{\"mail\":\"ana@example.com\",\"contrasena\":\"clave-segura\"}");
  if(interno)request.with(httpBasic("test-service","test-only-password"));
  return mvc.perform(request);
 }

 @Test void flujoCompletoUsaDatosDeDiditYRegistraTrasConfirmar()throws Exception{
  completar(CUENTA).andExpect(status().isConflict());
  aprobar();
  mvc.perform(get("/api/abogados/verificacion/estado").header("X-Registro-Token",token)).andExpect(status().isOk())
   .andExpect(jsonPath("$.datos.nombre").value("Ana")).andExpect(jsonPath("$.datos.dni").value("12345678"));
  completar(CUENTA).andExpect(status().isCreated()).andExpect(jsonPath("$.estado").value("PENDIENTE"))
   .andExpect(jsonPath("$.verificacionDni").value("APROBADA")).andExpect(jsonPath("$.validacionMatricula").value("VALIDADA"))
   .andExpect(jsonPath("$.codigoConfirmacion").doesNotExist()).andExpect(jsonPath("$.contrasenaHash").doesNotExist());
  var a=cuenta();
  assertEquals("Ana",a.getNombre());assertEquals("Prueba",a.getApellido());assertEquals("Femenino",a.getGenero());
  assertEquals(2,a.getEspecialidades().size());assertTrue(passwords.matches("clave-segura",a.getContrasenaHash()));
  assertNull(a.getAccesoRegistroHash());
  mvc.perform(get("/api/abogados/verificacion/estado").header("X-Registro-Token",token)).andExpect(status().isUnauthorized());
  login(true).andExpect(status().isUnauthorized());login(false).andExpect(status().isUnauthorized());
  codigoConocido();
  confirmar("123456").andExpect(status().isOk()).andExpect(jsonPath("$.correoConfirmado").value(true)).andExpect(jsonPath("$.estado").value("REGISTRADO"));
  login(true).andExpect(status().isOk()).andExpect(jsonPath("$.idAbogado").exists());
  evidencia("12345678","CANCELADA");login(true).andExpect(status().isUnauthorized());
 }
 @Test void solicitudPendienteSeReemplazaPeroUnaCuentaNo()throws Exception{
  String anterior=token;token=solicitud(SOLICITUD);
  mvc.perform(get("/api/abogados/verificacion/estado").header("X-Registro-Token",anterior)).andExpect(status().isUnauthorized());
  assertEquals(1,abogados.count());
  aprobar();completar(CUENTA).andExpect(status().isCreated());
  mvc.perform(nuevaSolicitud(SOLICITUD)).andExpect(status().isConflict());
  mvc.perform(nuevaSolicitud(SOLICITUD.replace("12345678","23456789"))).andExpect(status().isConflict());
 }
 @Test void contrasenasCamposYFalsificacion()throws Exception{
  aprobar();
  completar(CUENTA.replace("\"confirmarContrasena\":\"clave-segura\"","\"confirmarContrasena\":\"otra-clave\"")).andExpect(status().isBadRequest());
  completar(CUENTA.replace("[\"Derecho Civil\",\"Derecho de Familia\"]","[\"Astrología\"]")).andExpect(status().isBadRequest());
  completar(CUENTA.replace("[\"Derecho Civil\",\"Derecho de Familia\"]","[]")).andExpect(status().isBadRequest());
  completar(CUENTA.replace("10-999","matricula")).andExpect(status().isBadRequest());
  completar(CUENTA.replace("{","{\"nombre\":\"Otra\",")).andExpect(status().isBadRequest());
  completar(CUENTA.replace("{","{\"verificacionDni\":\"APROBADA\",")).andExpect(status().isBadRequest());
  mvc.perform(nuevaSolicitud(SOLICITUD.replace("12345678","12.345.678"))).andExpect(status().isBadRequest());
  assertTrue(cuenta().esSolicitud());
 }
 @Test void matriculaDuplicadaSeRechaza()throws Exception{
  var otro=new AbogadoRegistrado();otro.setDni("87654321");otro.setMail("otro@example.com");otro.setNroMatricula("10-999");
  otro.setContrasenaHash("x");otro.setEstado(cuenta().getEstado());abogados.save(otro);
  aprobar();completar(CUENTA).andExpect(status().isConflict());
 }
 @Test void confirmacionCodigoVencimientoYLimite()throws Exception{
  aprobar();completar(CUENTA);codigoConocido();
  confirmar("000000").andExpect(status().isBadRequest());assertEquals(1,cuenta().getIntentosConfirmacion());
  confirmar("123456").andExpect(status().isOk());
  confirmar("123456").andExpect(status().isBadRequest());
 }
 @Test void intentosAgotadosVencidoYCuentaAjena()throws Exception{
  aprobar();completar(CUENTA);codigoConocido();
  for(int i=0;i<5;i++)confirmar("000000").andExpect(status().isBadRequest());
  confirmar("123456").andExpect(status().isBadRequest());assertFalse(cuenta().getCorreoConfirmado());
  mvc.perform(post("/api/abogados/confirmar").contentType(MediaType.APPLICATION_JSON).content("{\"mail\":\"otra@example.com\",\"codigo\":\"123456\"}")).andExpect(status().isBadRequest());
  var a=cuenta();a.setIntentosConfirmacion(0);a.setConfirmacionVence(Instant.now().minusSeconds(1));abogados.save(a);
  confirmar("123456").andExpect(status().isBadRequest());
 }
 @Test void matriculaInexistenteInactivaOtroDniYAmbigua()throws Exception{
  aprobar();
  completar(CUENTA.replace("10-999","10-998")).andExpect(status().isBadRequest());
  evidencias.deleteAll();evidencia("12345678","CANCELADA");completar(CUENTA).andExpect(status().isBadRequest());
  evidencias.deleteAll();evidencia("23456789","ACTIVO");completar(CUENTA).andExpect(status().isBadRequest());
  evidencia("12345678","ACTIVO");completar(CUENTA).andExpect(status().isCreated()).andExpect(jsonPath("$.validacionMatricula").value("PENDIENTE_REVISION"));
 }
 @Test void otroColegioQuedaPendienteDeRevision()throws Exception{
  aprobar();
  completar(CUENTA.replace("Colegio de Abogados de Río Tercero","Colegio de Abogados de Córdoba").replace("10-999","12345"))
   .andExpect(status().isCreated()).andExpect(jsonPath("$.validacionMatricula").value("PENDIENTE_REVISION"));
 }
 @Test void diditRechazadoODniDistintoNoPermitenCrearCuenta()throws Exception{
  didit("evento-1","12345678",VerificadorIdentidad.Estado.RECHAZADA);
  assertEquals("RECHAZADA",cuenta().getVerificacionDni());completar(CUENTA).andExpect(status().isConflict());
  didit("evento-2","23456789",VerificadorIdentidad.Estado.APROBADA);
  assertEquals("RECHAZADA",cuenta().getVerificacionDni());assertNull(cuenta().getNombre());
  completar(CUENTA).andExpect(status().isConflict());
 }
 @Test void sesionDiditNoVinculadaOTamperNoHabilita()throws Exception{
  var a=cuenta();
  assertThrows(IllegalStateException.class,()->didit.actualizar(a.getIdAbogado(),s->null));
  a.setSesionDidit("original");abogados.save(a);
  assertThrows(IllegalArgumentException.class,()->didit.actualizar(a.getIdAbogado(),s->new VerificadorIdentidad.Resultado("otra","evento","12345678",VerificadorIdentidad.Estado.APROBADA,DATOS)));
  completar(CUENTA).andExpect(status().isConflict());
 }
 @Test void corsYPadronPrivado()throws Exception{
  mvc.perform(options("/api/abogados/verificacion/solicitud").header("Origin","http://localhost:5173").header("Access-Control-Request-Method","POST")).andExpect(status().isOk());
  mvc.perform(options("/api/abogados/verificacion/solicitud").header("Origin","https://otro.example").header("Access-Control-Request-Method","POST")).andExpect(status().isForbidden());
  mvc.perform(get("/api/padron")).andExpect(status().isForbidden());
  mvc.perform(post("/api/abogados").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
 }
}

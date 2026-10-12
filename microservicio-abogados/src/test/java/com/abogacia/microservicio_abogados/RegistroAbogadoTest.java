package com.abogacia.microservicio_abogados;
import com.abogacia.microservicio_abogados.repository.*;
import com.abogacia.microservicio_abogados.entity.*;
import com.abogacia.microservicio_abogados.gestor.*;
import com.abogacia.microservicio_abogados.padron.ValidarMatricula;
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
import java.util.Map;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest
class RegistroAbogadoTest {
 @Autowired WebApplicationContext context;
 @Autowired AbogadoRepository abogados; @Autowired PadronRepository padron;
 @Autowired PadronEvidenciaRepository evidencias; @Autowired EstadoRepository estados;
 @Autowired PasswordEncoder passwords; @Autowired VerificarDniAbogadoGestor didit;
 MockMvc mvc;
 static final String JSON="""
 {"nombre":"Ana","apellido":"Prueba","dni":"12345678","mail":"ana@example.com","nroCelular":"3511234567",
 "fechaNacimiento":"1990-01-01","genero":"Femenino","domicilio":"Calle 1","nroMatricula":"10-999",
 "colegioProfesional":"Colegio de Abogados de Río Tercero","provincia":"Córdoba","especialidad":"Civil",
 "aniosExperiencia":3,"honorarios":1000,"ubicacion":"Río Tercero","direccionProfesional":"Calle 2",
 "descripcionProfesional":"Asesoramiento civil","contrasena":"clave-segura","confirmarContrasena":"clave-segura"}
 """;
 @BeforeEach void setup(){
  abogados.deleteAll();evidencias.deleteAll();padron.deleteAll();
  padron.save(new Padron("10-999","LOCAL"));
  evidencia("12345678","ACTIVO");
  mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
 }
 void evidencia(String dni,String estado){evidencias.save(new PadronEvidencia("10-999",dni,"PRUEBA ANA",estado,"test",1,"test"));}
 ResultActions registrar(String json)throws Exception{return mvc.perform(post("/api/abogados").contentType(MediaType.APPLICATION_JSON).content(json));}
 AbogadoRegistrado cuenta(){return abogados.findByMail("ana@example.com").orElseThrow();}
 ResultActions confirmar(String codigo)throws Exception{return mvc.perform(post("/api/abogados/confirmar").contentType(MediaType.APPLICATION_JSON)
  .content("{\"mail\":\"ana@example.com\",\"codigo\":\""+codigo+"\"}"));}
 ResultActions login(boolean interno)throws Exception{
  var request=post("/api/interno/abogados/validar-credenciales").contentType(MediaType.APPLICATION_JSON).content("{\"mail\":\"ana@example.com\",\"contrasena\":\"clave-segura\"}");
  if(interno)request.with(httpBasic("test-service","test-only-password"));
  return mvc.perform(request);
 }
 @Test void registroValidoPermanecePendienteSinFiltrarSecretos()throws Exception{
  registrar(JSON).andExpect(status().isCreated()).andExpect(jsonPath("$.estado").value("PENDIENTE"))
   .andExpect(jsonPath("$.validacionMatricula").value("VALIDADA"))
   .andExpect(jsonPath("$.verificacionDni").value("PENDIENTE"))
   .andExpect(jsonPath("$.codigoConfirmacion").doesNotExist()).andExpect(jsonPath("$.contrasenaHash").doesNotExist());
  assertTrue(passwords.matches("clave-segura",cuenta().getContrasenaHash()));
  login(true).andExpect(status().isUnauthorized());login(false).andExpect(status().isUnauthorized());
 }
 @Test void duplicadosYContrasenas()throws Exception{
  registrar(JSON.replace("\"confirmarContrasena\":\"clave-segura\"","\"confirmarContrasena\":\"otra-clave\"")).andExpect(status().isBadRequest());
  registrar(JSON).andExpect(status().isCreated());
  registrar(JSON.replace("ana@example.com","otra@example.com")).andExpect(status().isBadRequest());
  registrar(JSON.replace("12345678","23456789")).andExpect(status().isBadRequest());
 }
 @Test void obligatoriosYFalsificacion()throws Exception{
  registrar(JSON.replace("\"nombre\":\"Ana\"","\"nombre\":\"\"")).andExpect(status().isBadRequest());
  registrar(JSON.replace("\"aniosExperiencia\":3","\"aniosExperiencia\":null")).andExpect(status().isBadRequest());
  registrar(JSON.replace("{","{\"dniVerificado\":true,")).andExpect(status().isBadRequest());
  registrar(JSON.replace("{","{\"validacionMatricula\":\"VALIDADA\",")).andExpect(status().isBadRequest());
 }
 @Test void confirmacionCodigoVencimientoYLimite()throws Exception{
  registrar(JSON).andExpect(status().isCreated());var a=cuenta();a.setCodigoConfirmacion(passwords.encode("codigo-de-test"));abogados.save(a);
  confirmar("incorrecto").andExpect(status().isBadRequest());assertEquals(1,cuenta().getIntentosConfirmacion());
  confirmar("codigo-de-test").andExpect(status().isOk()).andExpect(jsonPath("$.correoConfirmado").value(true)).andExpect(jsonPath("$.estado").value("PENDIENTE"));
  confirmar("codigo-de-test").andExpect(status().isBadRequest());
 }
 @Test void intentosAgotadosYCuentaAjena()throws Exception{
  registrar(JSON);var a=cuenta();a.setCodigoConfirmacion(passwords.encode("codigo-de-test"));abogados.save(a);
  for(int i=0;i<5;i++)confirmar("incorrecto").andExpect(status().isBadRequest());
  confirmar("codigo-de-test").andExpect(status().isBadRequest());assertFalse(cuenta().getCorreoConfirmado());
  mvc.perform(post("/api/abogados/confirmar").contentType(MediaType.APPLICATION_JSON).content("{\"mail\":\"otra@example.com\",\"codigo\":\"codigo-de-test\"}")).andExpect(status().isBadRequest());
 }
 @Test void codigoVencido()throws Exception{
  registrar(JSON);var a=cuenta();a.setCodigoConfirmacion(passwords.encode("codigo-de-test"));a.setConfirmacionVence(Instant.now().minusSeconds(1));abogados.save(a);
  confirmar("codigo-de-test").andExpect(status().isBadRequest());
 }
 @Test void matriculaInexistenteInactivaOtroDniYAmbigua()throws Exception{
  registrar(JSON.replace("10-999","10-998")).andExpect(status().isBadRequest());
  evidencias.deleteAll();evidencia("12345678","CANCELADA");registrar(JSON).andExpect(status().isBadRequest());
  evidencias.deleteAll();evidencia("23456789","ACTIVO");registrar(JSON).andExpect(status().isBadRequest());
  evidencia("12345678","ACTIVO");registrar(JSON).andExpect(status().isCreated()).andExpect(jsonPath("$.validacionMatricula").value("PENDIENTE_REVISION"));
 }
 @Test void diditRechazadoDniDistintoYAprobadoConLogin()throws Exception{
  registrar(JSON);var a=cuenta();a.setCorreoConfirmado(true);a.setSesionDidit("sesion-backend");abogados.save(a);
  didit.actualizar(a.getIdAbogado(),s->new VerificadorIdentidad.Resultado(s,"evento-1","12345678",VerificadorIdentidad.Estado.RECHAZADA));
  login(true).andExpect(status().isUnauthorized());assertEquals("RECHAZADA",cuenta().getVerificacionDni());
  didit.actualizar(a.getIdAbogado(),s->new VerificadorIdentidad.Resultado(s,"evento-2","23456789",VerificadorIdentidad.Estado.APROBADA));
  login(true).andExpect(status().isUnauthorized());
  didit.actualizar(a.getIdAbogado(),s->new VerificadorIdentidad.Resultado(s,"evento-3","12345678",VerificadorIdentidad.Estado.APROBADA));
  login(true).andExpect(status().isOk()).andExpect(jsonPath("$.idAbogado").exists());
  assertEquals("REGISTRADO",cuenta().getEstado().getNombreEstado());
  evidencia("12345678","CANCELADA");login(true).andExpect(status().isUnauthorized());
 }
 @Test void sesionDiditNoVinculadaOTamperNoHabilita()throws Exception{
  registrar(JSON);var a=cuenta();
  assertThrows(IllegalStateException.class,()->didit.actualizar(a.getIdAbogado(),s->null));
  a.setSesionDidit("original");abogados.save(a);
  assertThrows(IllegalArgumentException.class,()->didit.actualizar(a.getIdAbogado(),s->new VerificadorIdentidad.Resultado("otra","evento","12345678",VerificadorIdentidad.Estado.APROBADA)));
  login(true).andExpect(status().isUnauthorized());
 }
 @Test void corsYPadronPrivado()throws Exception{
  mvc.perform(options("/api/abogados").header("Origin","http://localhost:5173").header("Access-Control-Request-Method","POST")).andExpect(status().isOk());
  mvc.perform(options("/api/abogados").header("Origin","https://otro.example").header("Access-Control-Request-Method","POST")).andExpect(status().isForbidden());
  mvc.perform(get("/api/padron")).andExpect(status().isForbidden());
 }
}

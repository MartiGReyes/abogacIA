package com.abogacia.microservicio_abogados;

import com.abogacia.microservicio_abogados.foto.*;
import com.abogacia.microservicio_abogados.entity.*;
import com.abogacia.microservicio_abogados.repository.AbogadoRepository;
import com.abogacia.microservicio_abogados.contacto.ProfesionalContactable;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties={"abogacia.bootstrap.development-enabled=false","abogacia.bootstrap.states-enabled=false"})
class FotoPerfilTest {
    static final Path ROOT;
    static {try {ROOT=Files.createTempDirectory("abogacia-fotos-test-");}catch(IOException e){throw new ExceptionInInitializerError(e);}}
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r){r.add("abogacia.fotos.enabled",()->true);r.add("abogacia.fotos.directorio",ROOT::toString);}
    @Autowired WebApplicationContext context;
    @Autowired FotoPerfilStore store;
    @MockitoBean AbogadoRepository abogados;
    @MockitoBean ProfesionalContactable publicos;
    MockMvc mvc;
    @BeforeEach void setup() throws Exception {
        for(long id:List.of(1L,2L)){store.eliminar(id);var a=new AbogadoRegistrado();a.setIdAbogado(id);a.setContrasenaHash("synthetic");var state=new Estado();state.setNombreEstado("REGISTRADO");a.setEstado(state);when(abogados.findById(id)).thenReturn(Optional.of(a));when(publicos.habilitado(a)).thenReturn(true);}
        mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }
    static byte[] image(String format,int width,int height)throws Exception{var b=new ByteArrayOutputStream();assertTrue(ImageIO.write(new BufferedImage(width,height,BufferedImage.TYPE_INT_RGB),format,b));return b.toByteArray();}
    static MockMultipartFile upload(byte[] b){return new MockMultipartFile("foto","../../danger.exe","application/octet-stream",b);}
    org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor owner(long id,String role){return jwt().jwt(j->j.subject(Long.toString(id)).claim("rol",role));}
    @Test void noPhotoReturns404()throws Exception{mvc.perform(get("/api/abogados/me/foto").with(owner(1,"ABOGADO"))).andExpect(status().isNotFound());}
    @Test void uploadReplaceReadDeleteAndPublicRead()throws Exception{
        mvc.perform(multipart("/api/abogados/me/foto").file(upload(image("png",1000,600))).with(r->{r.setMethod("PUT");return r;}).with(owner(1,"ABOGADO"))).andExpect(status().isNoContent());
        var first=store.leer(1);var decoded=ImageIO.read(new ByteArrayInputStream(first));assertEquals(512,decoded.getWidth());
        mvc.perform(get("/api/abogados/catalogo/1/foto")).andExpect(status().isOk()).andExpect(content().contentType("image/jpeg")).andExpect(header().string("Cache-Control","no-store")).andExpect(content().bytes(first));
        store.guardar(1,upload(image("jpeg",24,16)));assertNotEquals(first.length,store.leer(1).length);
        mvc.perform(delete("/api/abogados/me/foto").with(owner(1,"ABOGADO"))).andExpect(status().isNoContent());
        mvc.perform(get("/api/abogados/catalogo/1/foto")).andExpect(status().isNotFound());
    }
    @Test void citizenAndAnonymousCannotWrite()throws Exception{
        mvc.perform(delete("/api/abogados/me/foto")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/abogados/me/foto").header("Authorization","Bearer invalid")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/abogados/me/foto").with(owner(1,"CIUDADANO"))).andExpect(status().isForbidden());
        mvc.perform(multipart("/api/abogados/me/foto").file(upload(image("png",10,10))).with(r->{r.setMethod("PUT");return r;}).with(owner(1,"CIUDADANO"))).andExpect(status().isForbidden());
    }
    @Test void otherAccountCannotAddressOwnersPhoto()throws Exception{
        store.guardar(1,upload(image("png",10,10)));var first=store.leer(1);
        mvc.perform(delete("/api/abogados/me/foto").with(owner(2,"ABOGADO"))).andExpect(status().isNoContent());assertArrayEquals(first,store.leer(1));
        mvc.perform(delete("/api/abogados/catalogo/1/foto").with(owner(2,"ABOGADO"))).andExpect(status().isForbidden());
        mvc.perform(put("/api/abogados/me/foto/1").with(owner(2,"ABOGADO"))).andExpect(status().isNotFound());assertArrayEquals(first,store.leer(1));
    }
    @Test void unpublishedOrDisabledAccountIsNotPublic()throws Exception{store.guardar(1,upload(image("png",10,10)));when(publicos.habilitado(any())).thenReturn(false);mvc.perform(get("/api/abogados/catalogo/1/foto")).andExpect(status().isNotFound());}
    @Test void invalidFilesAndOversizeRejectedWithoutReplacingExisting()throws Exception{
        store.guardar(1,upload(image("png",10,10)));byte[] before=store.leer(1);
        for(byte[] invalid:List.of("<svg onload='alert(1)'/>".getBytes(),"MZ executable".getBytes(),image("gif",10,10),new byte[0])){
            mvc.perform(multipart("/api/abogados/me/foto").file(upload(invalid)).with(r->{r.setMethod("PUT");return r;}).with(owner(1,"ABOGADO"))).andExpect(status().isBadRequest());
        }
        mvc.perform(multipart("/api/abogados/me/foto").file(upload(new byte[FotoPerfilStore.MAX_BYTES+1])).with(r->{r.setMethod("PUT");return r;}).with(owner(1,"ABOGADO"))).andExpect(status().isPayloadTooLarge());assertArrayEquals(before,store.leer(1));
    }
    @Test void excessivePixelCountRejected()throws Exception{assertThrows(org.springframework.web.server.ResponseStatusException.class,()->store.guardar(1,upload(image("png",5000,4000))));}
    @Test void metadataAndTrailingPayloadAreNotRetained()throws Exception{var bytes=new ByteArrayOutputStream();bytes.write(image("png",30,30));bytes.write("PRIVATE_METADATA_EXECUTABLE".getBytes());store.guardar(1,upload(bytes.toByteArray()));assertFalse(new String(store.leer(1),java.nio.charset.StandardCharsets.ISO_8859_1).contains("PRIVATE_METADATA"));try(var files=Files.list(ROOT)){assertTrue(files.allMatch(f->f.getFileName().toString().matches("[12]\\.jpg")));}}
    @Test void persistenceAcrossStoreRecreation()throws Exception{store.guardar(1,upload(image("png",30,20)));assertArrayEquals(store.leer(1),new FotoPerfilStore(true,ROOT.toString()).leer(1));}
    @Test void webpIsDecodedAndReencoded()throws Exception{try(var in=getClass().getResourceAsStream("/foto-sintetica.webp")){assertNotNull(in);store.guardar(1,upload(in.readAllBytes()));assertNotNull(ImageIO.read(new ByteArrayInputStream(store.leer(1))));}}
    @AfterAll static void cleanup()throws Exception{try(var files=Files.list(ROOT)){for(var f:files.toList())Files.delete(f);}Files.delete(ROOT);}
}

package com.abogacia.microservicio_ciudadanos.gestor;

import com.abogacia.microservicio_ciudadanos.correo.InterfazCorreo;
import com.abogacia.microservicio_ciudadanos.dto.CiudadanoResponse;
import com.abogacia.microservicio_ciudadanos.dto.ConfirmarRegistroRequest;
import com.abogacia.microservicio_ciudadanos.dto.RegistrarCiudadanoRequest;
import com.abogacia.microservicio_ciudadanos.entity.Ciudadano;
import com.abogacia.microservicio_ciudadanos.entity.Estado;
import com.abogacia.microservicio_ciudadanos.repository.CiudadanoRepository;
import com.abogacia.microservicio_ciudadanos.repository.EstadoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RegistroYConfirmacionGestorTest {

    private CiudadanoRepository ciudadanoRepository;
    private EstadoRepository estadoRepository;
    private PasswordEncoder passwordEncoder;
    private InterfazCorreo interfazCorreo;
    private RegistrarCiudadanoGestor registrarGestor;
    private ConfirmarRegistroGestor confirmarGestor;

    @BeforeEach
    void setUp() {
        ciudadanoRepository = mock(CiudadanoRepository.class);
        estadoRepository = mock(EstadoRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        interfazCorreo = mock(InterfazCorreo.class);
        registrarGestor = new RegistrarCiudadanoGestor(
                ciudadanoRepository,
                estadoRepository,
                passwordEncoder,
                interfazCorreo
        );
        confirmarGestor = new ConfirmarRegistroGestor(
                ciudadanoRepository,
                estadoRepository
        );

        when(ciudadanoRepository.save(any(Ciudadano.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(passwordEncoder.encode("clave-segura"))
                .thenReturn("hash-seguro");
    }

    @Test
    void registroCorrectoCreaCiudadanoPendienteYEnviaCodigo() {
        RegistrarCiudadanoRequest request = solicitudValida();
        when(ciudadanoRepository.existsByCuil(request.getCuil()))
                .thenReturn(false);
        when(ciudadanoRepository.existsByMail(request.getMail()))
                .thenReturn(false);
        when(estadoRepository.findByNombreEstado("PENDIENTE"))
                .thenReturn(Optional.of(new Estado("PENDIENTE")));

        CiudadanoResponse response = registrarGestor.registrar(request);

        assertEquals("PENDIENTE", response.getEstado());
        assertEquals(request.getCuil(), response.getCuil());
        verify(passwordEncoder).encode("clave-segura");
        verify(interfazCorreo).enviarMailConfirmacion(
                eq(request.getMail()),
                anyString()
        );
    }

    @Test
    void registroRechazaCuilDuplicado() {
        RegistrarCiudadanoRequest request = solicitudValida();
        when(ciudadanoRepository.existsByCuil(request.getCuil()))
                .thenReturn(true);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> registrarGestor.registrar(request)
        );

        assertEquals(
                "Ya existe un ciudadano registrado con ese CUIL.",
                exception.getMessage()
        );
        verify(ciudadanoRepository, never()).save(any(Ciudadano.class));
        verify(interfazCorreo, never())
                .enviarMailConfirmacion(anyString(), anyString());
    }

    @Test
    void registroRechazaMailDuplicado() {
        RegistrarCiudadanoRequest request = solicitudValida();
        when(ciudadanoRepository.existsByCuil(request.getCuil()))
                .thenReturn(false);
        when(ciudadanoRepository.existsByMail(request.getMail()))
                .thenReturn(true);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> registrarGestor.registrar(request)
        );

        assertEquals(
                "Ya existe un ciudadano registrado con ese correo.",
                exception.getMessage()
        );
        verify(ciudadanoRepository, never()).save(any(Ciudadano.class));
        verify(interfazCorreo, never())
                .enviarMailConfirmacion(anyString(), anyString());
    }

    @Test
    void registroRechazaMenorDeEdad() {
        RegistrarCiudadanoRequest request = solicitudValida();
        request.setFechaNacimiento(LocalDate.now().minusYears(17));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> registrarGestor.registrar(request)
        );

        assertEquals(
                "El ciudadano debe ser mayor de edad.",
                exception.getMessage()
        );
        verify(ciudadanoRepository, never()).save(any(Ciudadano.class));
        verify(interfazCorreo, never())
                .enviarMailConfirmacion(anyString(), anyString());
    }

    @Test
    void confirmacionCorrectaRegistraCiudadanoYLimpiaCodigo() {
        Ciudadano ciudadano = ciudadanoPendiente("123456");
        Estado estadoRegistrado = new Estado("REGISTRADO");
        ConfirmarRegistroRequest request = solicitudConfirmacion("123456");
        when(ciudadanoRepository.findByMail(request.getMail()))
                .thenReturn(Optional.of(ciudadano));
        when(estadoRepository.findByNombreEstado("REGISTRADO"))
                .thenReturn(Optional.of(estadoRegistrado));

        CiudadanoResponse response = confirmarGestor.confirmar(request);

        assertEquals("REGISTRADO", response.getEstado());
        assertNull(ciudadano.getCodigoConfirmacion());
        verify(ciudadanoRepository).save(ciudadano);
    }

    @Test
    void confirmacionRechazaCodigoIncorrecto() {
        Ciudadano ciudadano = ciudadanoPendiente("123456");
        ConfirmarRegistroRequest request = solicitudConfirmacion("000000");
        when(ciudadanoRepository.findByMail(request.getMail()))
                .thenReturn(Optional.of(ciudadano));

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> confirmarGestor.confirmar(request)
        );

        assertEquals(
                "El código de confirmación es incorrecto.",
                exception.getMessage()
        );
        verify(estadoRepository, never())
                .findByNombreEstado("REGISTRADO");
        verify(ciudadanoRepository, never()).save(any(Ciudadano.class));
    }

    private RegistrarCiudadanoRequest solicitudValida() {
        RegistrarCiudadanoRequest request = new RegistrarCiudadanoRequest();
        request.setNombre("Ana");
        request.setApellido("Gomez");
        request.setCuil("20123456789");
        request.setFechaNacimiento(LocalDate.now().minusYears(30));
        request.setMail("ana@example.com");
        request.setContrasena("clave-segura");
        return request;
    }

    private Ciudadano ciudadanoPendiente(String codigo) {
        Ciudadano ciudadano = new Ciudadano();
        ciudadano.setNombre("Ana");
        ciudadano.setApellido("Gomez");
        ciudadano.setCuil("20123456789");
        ciudadano.setFechaNacimiento(LocalDate.now().minusYears(30));
        ciudadano.setMail("ana@example.com");
        ciudadano.setEstado(new Estado("PENDIENTE"));
        ciudadano.setCodigoConfirmacion(codigo);
        return ciudadano;
    }

    private ConfirmarRegistroRequest solicitudConfirmacion(String codigo) {
        ConfirmarRegistroRequest request = new ConfirmarRegistroRequest();
        request.setMail("ana@example.com");
        request.setCodigo(codigo);
        return request;
    }
}
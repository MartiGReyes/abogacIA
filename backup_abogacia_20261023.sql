--
-- PostgreSQL database cluster dump
--

\restrict DQNtbgMGJhGxVVJUBgH7CxmDESWwuvO31iAXXGQAhgDS0aRm9L1FwSjagTDn6ZB

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE postgres;
ALTER ROLE postgres WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:6PHkTtrC7l7RUhBIrr5/vg==$Z+UD17waerx7v2tNGWDGyIgDfNWpzd3+OBTnh8XsD9s=:7g+BqbVw6SZdbcU/UVBn3/48MCxSsH2xQkcveuG1A0g=';

--
-- User Configurations
--








\unrestrict DQNtbgMGJhGxVVJUBgH7CxmDESWwuvO31iAXXGQAhgDS0aRm9L1FwSjagTDn6ZB

--
-- Databases
--

--
-- Database "template1" dump
--

\connect template1

--
-- PostgreSQL database dump
--

\restrict oIfPS0TW9anlRLEpU2IdEhEGfMQrwElmqnc8iq7FlcwXL6jhnLCMZBMZIyUo0bB

-- Dumped from database version 17.11 (Debian 17.11-1.pgdg13+2)
-- Dumped by pg_dump version 17.11 (Debian 17.11-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict oIfPS0TW9anlRLEpU2IdEhEGfMQrwElmqnc8iq7FlcwXL6jhnLCMZBMZIyUo0bB

--
-- Database "abogacia_abogados" dump
--

--
-- PostgreSQL database dump
--

\restrict AXJWMWNHVjiG5N4EbV7amnp9kdZ4i1MfndrMlNIsanICdqkMHLfCx9aRSReoeVX

-- Dumped from database version 17.11 (Debian 17.11-1.pgdg13+2)
-- Dumped by pg_dump version 17.11 (Debian 17.11-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: abogacia_abogados; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE abogacia_abogados WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE abogacia_abogados OWNER TO postgres;

\unrestrict AXJWMWNHVjiG5N4EbV7amnp9kdZ4i1MfndrMlNIsanICdqkMHLfCx9aRSReoeVX
\connect abogacia_abogados
\restrict AXJWMWNHVjiG5N4EbV7amnp9kdZ4i1MfndrMlNIsanICdqkMHLfCx9aRSReoeVX

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: abogado_especialidades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.abogado_especialidades (
    id_abogado bigint NOT NULL,
    especialidad character varying(255)
);


ALTER TABLE public.abogado_especialidades OWNER TO postgres;

--
-- Name: abogados_registrados; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.abogados_registrados (
    id_abogado bigint NOT NULL,
    acceso_registro_hash character varying(255),
    acceso_registro_vence timestamp(6) with time zone,
    anios_experiencia integer,
    apellido character varying(255),
    codigo_confirmacion character varying(255),
    colegio_profesional character varying(255),
    confirmacion_vence timestamp(6) with time zone,
    contrasena_hash character varying(255),
    correo_confirmado boolean DEFAULT false,
    descripcion_profesional character varying(2000),
    direccion_profesional character varying(255),
    dni character varying(8) NOT NULL,
    dni_verificado boolean,
    domicilio character varying(255),
    fecha_nacimiento date,
    fecha_registro date,
    genero character varying(255),
    honorarios numeric(38,2),
    intentos_confirmacion integer DEFAULT 0,
    mail character varying(255) NOT NULL,
    matricula_verificada boolean,
    nombre character varying(255),
    nro_celular character varying(255),
    nro_matricula character varying(255),
    provincia character varying(255),
    resultado_didit_id character varying(255),
    sesion_didit character varying(255),
    ubicacion character varying(255),
    validacion_matricula character varying(255),
    verificacion_dni character varying(255),
    version bigint DEFAULT 0 NOT NULL,
    id_estado bigint,
    padron_matricula character varying(255)
);


ALTER TABLE public.abogados_registrados OWNER TO postgres;

--
-- Name: abogados_registrados_id_abogado_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.abogados_registrados ALTER COLUMN id_abogado ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.abogados_registrados_id_abogado_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: estado; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.estado (
    id_estado bigint NOT NULL,
    nombre_estado character varying(255)
);


ALTER TABLE public.estado OWNER TO postgres;

--
-- Name: estado_id_estado_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.estado ALTER COLUMN id_estado ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.estado_id_estado_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: padron; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.padron (
    nro_matricula character varying(255) NOT NULL,
    estado character varying(16)
);


ALTER TABLE public.padron OWNER TO postgres;

--
-- Name: padron_evidencia; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.padron_evidencia (
    id bigint NOT NULL,
    dni character varying(255),
    estado character varying(255),
    fila integer NOT NULL,
    hoja character varying(255),
    matricula character varying(255),
    nombre_completo character varying(255),
    version_archivo character varying(255)
);


ALTER TABLE public.padron_evidencia OWNER TO postgres;

--
-- Name: padron_evidencia_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.padron_evidencia ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.padron_evidencia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: verificacion_identidad; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verificacion_identidad (
    id_abogado bigint NOT NULL,
    aviso_hash character varying(255),
    aviso_version character varying(255),
    consentimiento boolean NOT NULL,
    consentimiento_fecha timestamp(6) with time zone,
    consultas integer NOT NULL,
    error_codigo character varying(255),
    errores integer NOT NULL,
    estado character varying(255),
    inicio timestamp(6) with time zone,
    intentos integer NOT NULL,
    lease_hasta timestamp(6) with time zone,
    operacion character varying(255),
    proxima_consulta timestamp(6) with time zone,
    referencia character varying(255),
    sesion character varying(255),
    ultima_consulta timestamp(6) with time zone,
    url character varying(2048),
    version bigint NOT NULL,
    workflow character varying(255),
    workflow_version integer
);


ALTER TABLE public.verificacion_identidad OWNER TO postgres;

--
-- Data for Name: abogado_especialidades; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.abogado_especialidades (id_abogado, especialidad) FROM stdin;
1	Derecho Civil
\.


--
-- Data for Name: abogados_registrados; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.abogados_registrados (id_abogado, acceso_registro_hash, acceso_registro_vence, anios_experiencia, apellido, codigo_confirmacion, colegio_profesional, confirmacion_vence, contrasena_hash, correo_confirmado, descripcion_profesional, direccion_profesional, dni, dni_verificado, domicilio, fecha_nacimiento, fecha_registro, genero, honorarios, intentos_confirmacion, mail, matricula_verificada, nombre, nro_celular, nro_matricula, provincia, resultado_didit_id, sesion_didit, ubicacion, validacion_matricula, verificacion_dni, version, id_estado, padron_matricula) FROM stdin;
1	\N	\N	2	Prueba	\N	Colegio de Abogados de Rio Tercero	\N	$2a$10$Ien8nARb2KoqhUD9NQ61Nu7mVqVxCuPX3wHcokqspj/AkHC8AGOtu	t	Cuenta ficticia local para probar US07	Oficina de prueba 456	99000001	t	Domicilio de prueba 123	1990-01-01	2026-10-13	Otro	15000.00	0	prueba@abogado.com	t	Abogado	3515550101	999-999999	Cordoba	\N	\N	Rio Tercero	VALIDADA	APROBADA	1	2	999-999999
\.


--
-- Data for Name: estado; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.estado (id_estado, nombre_estado) FROM stdin;
1	PENDIENTE
2	REGISTRADO
3	BAJA
\.


--
-- Data for Name: padron; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.padron (nro_matricula, estado) FROM stdin;
999-999999	LOCAL
\.


--
-- Data for Name: padron_evidencia; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.padron_evidencia (id, dni, estado, fila, hoja, matricula, nombre_completo, version_archivo) FROM stdin;
1	99000001	ACTIVO	1	FIXTURE LOCAL US07	999-999999	ABOGADO PRUEBA	prueba-local-us07
\.


--
-- Data for Name: verificacion_identidad; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.verificacion_identidad (id_abogado, aviso_hash, aviso_version, consentimiento, consentimiento_fecha, consultas, error_codigo, errores, estado, inicio, intentos, lease_hasta, operacion, proxima_consulta, referencia, sesion, ultima_consulta, url, version, workflow, workflow_version) FROM stdin;
\.


--
-- Name: abogados_registrados_id_abogado_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.abogados_registrados_id_abogado_seq', 1, true);


--
-- Name: estado_id_estado_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.estado_id_estado_seq', 3, true);


--
-- Name: padron_evidencia_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.padron_evidencia_id_seq', 1, true);


--
-- Name: abogados_registrados abogados_registrados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abogados_registrados
    ADD CONSTRAINT abogados_registrados_pkey PRIMARY KEY (id_abogado);


--
-- Name: estado estado_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estado
    ADD CONSTRAINT estado_pkey PRIMARY KEY (id_estado);


--
-- Name: padron_evidencia padron_evidencia_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.padron_evidencia
    ADD CONSTRAINT padron_evidencia_pkey PRIMARY KEY (id);


--
-- Name: padron padron_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.padron
    ADD CONSTRAINT padron_pkey PRIMARY KEY (nro_matricula);


--
-- Name: abogados_registrados uk6d4qfjxi3udoserihbn88sxvy; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abogados_registrados
    ADD CONSTRAINT uk6d4qfjxi3udoserihbn88sxvy UNIQUE (mail);


--
-- Name: abogado_especialidades uk985xcfvlc35v1r00s5b44imk5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abogado_especialidades
    ADD CONSTRAINT uk985xcfvlc35v1r00s5b44imk5 UNIQUE (id_abogado, especialidad);


--
-- Name: abogados_registrados ukgonsp0p96qp8d14x6tdlesf4i; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abogados_registrados
    ADD CONSTRAINT ukgonsp0p96qp8d14x6tdlesf4i UNIQUE (acceso_registro_hash);


--
-- Name: verificacion_identidad ukkpgc0hq75lswpbvej35ai3tft; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verificacion_identidad
    ADD CONSTRAINT ukkpgc0hq75lswpbvej35ai3tft UNIQUE (sesion);


--
-- Name: abogados_registrados uktj4qqmyyk5knq5grokkvh9ojg; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abogados_registrados
    ADD CONSTRAINT uktj4qqmyyk5knq5grokkvh9ojg UNIQUE (dni);


--
-- Name: verificacion_identidad verificacion_identidad_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verificacion_identidad
    ADD CONSTRAINT verificacion_identidad_pkey PRIMARY KEY (id_abogado);


--
-- Name: abogados_registrados fkh53lx2vu4ldnm7qjk03a9pnoe; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abogados_registrados
    ADD CONSTRAINT fkh53lx2vu4ldnm7qjk03a9pnoe FOREIGN KEY (padron_matricula) REFERENCES public.padron(nro_matricula);


--
-- Name: abogados_registrados fkip09fb1kom6pm793r01ldlxn2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abogados_registrados
    ADD CONSTRAINT fkip09fb1kom6pm793r01ldlxn2 FOREIGN KEY (id_estado) REFERENCES public.estado(id_estado);


--
-- Name: abogado_especialidades fkiuljjw87cpuiw41ivixwb4ldh; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abogado_especialidades
    ADD CONSTRAINT fkiuljjw87cpuiw41ivixwb4ldh FOREIGN KEY (id_abogado) REFERENCES public.abogados_registrados(id_abogado);


--
-- PostgreSQL database dump complete
--

\unrestrict AXJWMWNHVjiG5N4EbV7amnp9kdZ4i1MfndrMlNIsanICdqkMHLfCx9aRSReoeVX

--
-- Database "abogacia_ciudadanos" dump
--

--
-- PostgreSQL database dump
--

\restrict t5gMsgrJLng5fEQN08xtnPZfjFoenSNjGXI10pnBJitP6lMJDue74rCws3zU9Nb

-- Dumped from database version 17.11 (Debian 17.11-1.pgdg13+2)
-- Dumped by pg_dump version 17.11 (Debian 17.11-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: abogacia_ciudadanos; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE abogacia_ciudadanos WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.utf8';


ALTER DATABASE abogacia_ciudadanos OWNER TO postgres;

\unrestrict t5gMsgrJLng5fEQN08xtnPZfjFoenSNjGXI10pnBJitP6lMJDue74rCws3zU9Nb
\connect abogacia_ciudadanos
\restrict t5gMsgrJLng5fEQN08xtnPZfjFoenSNjGXI10pnBJitP6lMJDue74rCws3zU9Nb

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ciudadano; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ciudadano (
    id_ciudadano bigint NOT NULL,
    acceso_registro_hash character varying(255),
    acceso_registro_vence timestamp(6) with time zone,
    apellido character varying(255) NOT NULL,
    codigo_confirmacion character varying(255),
    contrasena_hash character varying(255) NOT NULL,
    correo_confirmado boolean DEFAULT false,
    direccion character varying(255),
    dni character varying(8) NOT NULL,
    fecha_nacimiento date NOT NULL,
    mail character varying(255) NOT NULL,
    nombre character varying(255) NOT NULL,
    nro_celular character varying(255),
    resultado_didit_id character varying(255),
    sesion_didit character varying(255),
    verificacion_dni character varying(255),
    id_estado bigint NOT NULL
);


ALTER TABLE public.ciudadano OWNER TO postgres;

--
-- Name: ciudadano_id_ciudadano_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.ciudadano ALTER COLUMN id_ciudadano ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.ciudadano_id_ciudadano_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: estado; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.estado (
    id_estado bigint NOT NULL,
    nombre_estado character varying(255) NOT NULL
);


ALTER TABLE public.estado OWNER TO postgres;

--
-- Name: estado_id_estado_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.estado ALTER COLUMN id_estado ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.estado_id_estado_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: verificacion_identidad; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verificacion_identidad (
    id_ciudadano bigint NOT NULL,
    aviso_hash character varying(255),
    aviso_version character varying(255),
    consentimiento boolean NOT NULL,
    consentimiento_fecha timestamp(6) with time zone,
    consultas integer NOT NULL,
    error_codigo character varying(255),
    errores integer NOT NULL,
    estado character varying(255),
    inicio timestamp(6) with time zone,
    intentos integer NOT NULL,
    lease_hasta timestamp(6) with time zone,
    operacion character varying(255),
    proxima_consulta timestamp(6) with time zone,
    referencia character varying(255),
    sesion character varying(255),
    ultima_consulta timestamp(6) with time zone,
    url character varying(2048),
    version bigint NOT NULL,
    workflow character varying(255),
    workflow_version integer
);


ALTER TABLE public.verificacion_identidad OWNER TO postgres;

--
-- Data for Name: ciudadano; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ciudadano (id_ciudadano, acceso_registro_hash, acceso_registro_vence, apellido, codigo_confirmacion, contrasena_hash, correo_confirmado, direccion, dni, fecha_nacimiento, mail, nombre, nro_celular, resultado_didit_id, sesion_didit, verificacion_dni, id_estado) FROM stdin;
1	\N	\N	reyes	\N	$2a$10$QE8SMU5ca02NaozACz5pIeYuRZPkBlfAO6difKPu9rzvpHroKIoHe	t	\N	45085078	2003-12-14	marrinaguadalupereyes@gmail.com	marti	+5493513687848	042d2b088c2a0cffde58c1d968cb7b36a07bc4525b241d01884c8eedd35f17d9	a91da395-4ce5-46f7-bcdb-b074bfc860f0	APROBADA	2
\.


--
-- Data for Name: estado; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.estado (id_estado, nombre_estado) FROM stdin;
1	PENDIENTE
2	REGISTRADO
3	BAJA
\.


--
-- Data for Name: verificacion_identidad; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.verificacion_identidad (id_ciudadano, aviso_hash, aviso_version, consentimiento, consentimiento_fecha, consultas, error_codigo, errores, estado, inicio, intentos, lease_hasta, operacion, proxima_consulta, referencia, sesion, ultima_consulta, url, version, workflow, workflow_version) FROM stdin;
1	dee791a36b4e0f7be95c5cd9832cda2fc238294b57654293d3434f717a3c478e	1.0	t	2026-10-13 01:17:35.242187+00	2	\N	0	Approved	2026-10-13 01:16:52.899392+00	1	\N	81d26653-36cd-462e-962d-4990330c3103	\N	e2a82d3a-a351-44d1-8570-0c335621189b	a91da395-4ce5-46f7-bcdb-b074bfc860f0	2026-10-13 01:20:00.118236+00	https://verify.didit.me/es/session/maNriL4C1CnO	7	cf23be90-8ae5-4f2f-ac62-f2059ed159b2	1
\.


--
-- Name: ciudadano_id_ciudadano_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ciudadano_id_ciudadano_seq', 1, true);


--
-- Name: estado_id_estado_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.estado_id_estado_seq', 3, true);


--
-- Name: ciudadano ciudadano_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciudadano
    ADD CONSTRAINT ciudadano_pkey PRIMARY KEY (id_ciudadano);


--
-- Name: estado estado_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estado
    ADD CONSTRAINT estado_pkey PRIMARY KEY (id_estado);


--
-- Name: ciudadano uk23toukpwy2kj4dwn3694letsv; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciudadano
    ADD CONSTRAINT uk23toukpwy2kj4dwn3694letsv UNIQUE (acceso_registro_hash);


--
-- Name: estado uk5fswyf2sg51p2v7pjthvmfa86; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.estado
    ADD CONSTRAINT uk5fswyf2sg51p2v7pjthvmfa86 UNIQUE (nombre_estado);


--
-- Name: ciudadano uk8ime37vj74a3whtxaw8yitjaf; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciudadano
    ADD CONSTRAINT uk8ime37vj74a3whtxaw8yitjaf UNIQUE (dni);


--
-- Name: ciudadano ukf5x277t0bm2kwrems52m2bia6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciudadano
    ADD CONSTRAINT ukf5x277t0bm2kwrems52m2bia6 UNIQUE (mail);


--
-- Name: verificacion_identidad ukkpgc0hq75lswpbvej35ai3tft; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verificacion_identidad
    ADD CONSTRAINT ukkpgc0hq75lswpbvej35ai3tft UNIQUE (sesion);


--
-- Name: verificacion_identidad verificacion_identidad_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.verificacion_identidad
    ADD CONSTRAINT verificacion_identidad_pkey PRIMARY KEY (id_ciudadano);


--
-- Name: ciudadano fkh3a17ea8bvflqkr6px15qkk53; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ciudadano
    ADD CONSTRAINT fkh3a17ea8bvflqkr6px15qkk53 FOREIGN KEY (id_estado) REFERENCES public.estado(id_estado);


--
-- PostgreSQL database dump complete
--

\unrestrict t5gMsgrJLng5fEQN08xtnPZfjFoenSNjGXI10pnBJitP6lMJDue74rCws3zU9Nb

--
-- Database "postgres" dump
--

\connect postgres

--
-- PostgreSQL database dump
--

\restrict 3DvjghhqSCqo7ztPITEJZl0X5jfchlGhdNhPl2cGpJi4DH8OCU1dWosNAbLSkHK

-- Dumped from database version 17.11 (Debian 17.11-1.pgdg13+2)
-- Dumped by pg_dump version 17.11 (Debian 17.11-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- PostgreSQL database dump complete
--

\unrestrict 3DvjghhqSCqo7ztPITEJZl0X5jfchlGhdNhPl2cGpJi4DH8OCU1dWosNAbLSkHK

--
-- PostgreSQL database cluster dump complete
--


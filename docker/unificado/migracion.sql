BEGIN;
CREATE TABLE IF NOT EXISTS whatsapp_autorizacion (
            id_abogado bigint PRIMARY KEY REFERENCES abogados_registrados(id_abogado),
            permitido boolean NOT NULL DEFAULT false,
            actualizado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS contacto_whatsapp (
            id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            id_ciudadano bigint NOT NULL,
            id_abogado bigint NOT NULL,
            abogado varchar(220) NOT NULL,
            especialidades varchar(500) NOT NULL DEFAULT '',
            nombre varchar(100) NOT NULL,
            telefono varchar(35) NOT NULL,
            resumen varchar(800) NOT NULL,
            creado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS caso_profesional (
            id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            id_abogado bigint NOT NULL REFERENCES abogados_registrados(id_abogado),
            titulo varchar(120) NOT NULL,
            area varchar(100) NOT NULL,
            descripcion varchar(4000) NOT NULL DEFAULT '',
            situacion varchar(4000) NOT NULL DEFAULT '',
            intervencion varchar(4000) NOT NULL DEFAULT '',
            resultado varchar(4000) NOT NULL DEFAULT '',
            periodo varchar(100) NOT NULL DEFAULT '',
            imagenes text NOT NULL DEFAULT '',
            publicado boolean NOT NULL DEFAULT false,
            consentimiento boolean NOT NULL DEFAULT false,
            actualizado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
GRANT SELECT, INSERT, UPDATE, DELETE ON contacto_whatsapp, caso_profesional TO operativa_runtime;
GRANT USAGE, SELECT ON SEQUENCE contacto_whatsapp_id_seq, caso_profesional_id_seq TO operativa_runtime;
SET search_path TO ciudadanos_cuenta;
CREATE TABLE IF NOT EXISTS consulta_lexi (
                    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    id_ciudadano bigint NOT NULL,
                    consulta varchar(2000) NOT NULL,
                    respuesta text NOT NULL,
                    especialidad varchar(100),
                    creada_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP);
GRANT SELECT, INSERT, DELETE ON consulta_lexi TO ciudadanos_runtime;
GRANT USAGE, SELECT ON SEQUENCE consulta_lexi_id_seq TO ciudadanos_runtime;
COMMIT;

package com.abogacia.microservicio_abogados.extension;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Tablas del frontend integrado (contactos guardados, casos profesionales y autorización de WhatsApp).
 * Solo se crean en el entorno principal (ddl-auto=update). Los entornos aislados usan "validate"
 * y sus propias migraciones explícitas, así que acá no se tocan.
 */
@Component
public class EsquemaExtendido implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(EsquemaExtendido.class);
    private static final String[] SENTENCIAS = {
        """
        CREATE TABLE IF NOT EXISTS whatsapp_autorizacion (
            id_abogado bigint PRIMARY KEY REFERENCES abogados_registrados(id_abogado),
            permitido boolean NOT NULL DEFAULT false,
            actualizado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
        """
        CREATE TABLE IF NOT EXISTS contacto_whatsapp (
            id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            id_ciudadano bigint NOT NULL,
            id_abogado bigint NOT NULL,
            abogado varchar(220) NOT NULL,
            especialidades varchar(500) NOT NULL DEFAULT '',
            nombre varchar(100) NOT NULL,
            telefono varchar(35) NOT NULL,
            resumen varchar(800) NOT NULL,
            creado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
        "CREATE INDEX IF NOT EXISTS ix_contacto_ciudadano ON contacto_whatsapp(id_ciudadano, creado_en)",
        "CREATE INDEX IF NOT EXISTS ix_contacto_abogado ON contacto_whatsapp(id_abogado, creado_en)",
        """
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
            actualizado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP)""",
        "CREATE INDEX IF NOT EXISTS ix_caso_abogado ON caso_profesional(id_abogado, publicado)",
    };

    private final JdbcTemplate jdbc;
    private final String ddl;

    public EsquemaExtendido(JdbcTemplate jdbc, @Value("${spring.jpa.hibernate.ddl-auto:none}") String ddl) {
        this.jdbc = jdbc;
        this.ddl = ddl;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!"update".equalsIgnoreCase(ddl)) return;
        for (String sql : SENTENCIAS) {
            try { jdbc.execute(sql); }
            catch (RuntimeException e) { log.warn("No se pudo preparar el esquema extendido: {}", e.getMessage()); }
        }
    }
}

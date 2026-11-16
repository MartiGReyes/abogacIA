ALTER TABLE contacto_whatsapp ADD COLUMN IF NOT EXISTS estado varchar(16) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','EN_CURSO','FINALIZADA'));
ALTER TABLE contacto_whatsapp ADD COLUMN IF NOT EXISTS mensaje varchar(2000) NOT NULL DEFAULT '';
ALTER TABLE contacto_whatsapp ADD COLUMN IF NOT EXISTS actualizado_en timestamptz;
UPDATE contacto_whatsapp SET actualizado_en=creado_en WHERE actualizado_en IS NULL;
ALTER TABLE contacto_whatsapp ALTER COLUMN actualizado_en SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE contacto_whatsapp ALTER COLUMN actualizado_en SET NOT NULL;
CREATE TABLE IF NOT EXISTS contacto_estado_historial (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_contacto bigint NOT NULL REFERENCES contacto_whatsapp(id) ON DELETE CASCADE,
    estado_anterior varchar(16),
    estado_nuevo varchar(16) NOT NULL CHECK (estado_nuevo IN ('PENDIENTE','EN_CURSO','FINALIZADA')),
    cambiado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS valoracion_contacto (
    id_contacto bigint PRIMARY KEY REFERENCES contacto_whatsapp(id) ON DELETE CASCADE,
    puntuacion integer NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
    comentario varchar(1000) NOT NULL DEFAULT '',
    creado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_contacto_titular_estado ON contacto_whatsapp(id_ciudadano,estado,creado_en);
CREATE INDEX IF NOT EXISTS ix_contacto_profesional_estado ON contacto_whatsapp(id_abogado,estado,creado_en);
CREATE INDEX IF NOT EXISTS ix_contacto_historial ON contacto_estado_historial(id_contacto,cambiado_en);

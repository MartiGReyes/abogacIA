ALTER TABLE contacto_whatsapp ADD COLUMN IF NOT EXISTS area_juridica varchar(100) NOT NULL DEFAULT 'Sin clasificar';
UPDATE contacto_whatsapp SET area_juridica=trim(especialidades)
WHERE area_juridica='Sin clasificar' AND trim(especialidades)<>'' AND position(chr(183) in especialidades)=0 AND length(trim(especialidades))<=100;
CREATE TABLE IF NOT EXISTS ingreso_contacto (
    id_contacto bigint PRIMARY KEY REFERENCES contacto_whatsapp(id) ON DELETE CASCADE,
    importe numeric(15,2) NOT NULL CHECK (importe>=0),
    fecha_ingreso date NOT NULL,
    creado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_ingreso_contacto_fecha ON ingreso_contacto(fecha_ingreso,id_contacto);
CREATE INDEX IF NOT EXISTS ix_contacto_area ON contacto_whatsapp(id_abogado,area_juridica,creado_en);

CREATE TABLE solicitud_asesoramiento (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_abogado bigint NOT NULL REFERENCES abogados_registrados(id_abogado),
  id_ciudadano bigint NOT NULL CHECK (id_ciudadano > 0), -- referencia lógica externa
  area_juridica varchar(100) NOT NULL CHECK (length(trim(area_juridica)) > 0),
  descripcion varchar(4000) NOT NULL,
  estado varchar(12) NOT NULL CHECK (estado IN ('PENDIENTE','ACEPTADA','RECHAZADA','CANCELADA')),
  creada_en timestamptz NOT NULL,
  aceptada_en timestamptz,
  version bigint NOT NULL DEFAULT 0,
  CHECK ((estado = 'ACEPTADA') = (aceptada_en IS NOT NULL)),
  CHECK (aceptada_en IS NULL OR aceptada_en >= creada_en)
);
CREATE TABLE asesoramiento (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_solicitud bigint NOT NULL UNIQUE REFERENCES solicitud_asesoramiento(id),
  estado varchar(12) NOT NULL CHECK (estado IN ('EN_CURSO','FINALIZADO','CANCELADO')),
  iniciado_en timestamptz NOT NULL,
  finalizado_en timestamptz,
  version bigint NOT NULL DEFAULT 0,
  CHECK ((estado = 'FINALIZADO') = (finalizado_en IS NOT NULL)),
  CHECK (finalizado_en IS NULL OR finalizado_en >= iniciado_en)
);
CREATE TABLE valoracion_asesoramiento (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_asesoramiento bigint NOT NULL UNIQUE REFERENCES asesoramiento(id),
  puntuacion smallint NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  creada_en timestamptz NOT NULL
);
CREATE TABLE pago_asesoramiento (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_asesoramiento bigint NOT NULL REFERENCES asesoramiento(id),
  clave_operacion varchar(160) NOT NULL UNIQUE,
  importe numeric(19,2) NOT NULL CHECK (importe > 0),
  moneda char(3) NOT NULL CHECK (moneda ~ '^[A-Z]{3}$'),
  estado varchar(12) NOT NULL CHECK (estado IN ('PENDIENTE','COBRADO','CANCELADO','RECHAZADO')),
  registrado_en timestamptz NOT NULL,
  cobrado_en timestamptz,
  version bigint NOT NULL DEFAULT 0,
  CHECK ((estado = 'COBRADO') = (cobrado_en IS NOT NULL)),
  CHECK (cobrado_en IS NULL OR cobrado_en >= registrado_en)
);
CREATE INDEX ix_solicitud_titular_aceptada ON solicitud_asesoramiento
  (id_abogado, aceptada_en, id) WHERE aceptada_en IS NOT NULL;
CREATE INDEX ix_solicitud_titular_creada ON solicitud_asesoramiento(id_abogado, creada_en, id);
CREATE INDEX ix_asesoramiento_inicio ON asesoramiento(iniciado_en, id);
CREATE INDEX ix_asesoramiento_fin ON asesoramiento(finalizado_en, id)
  WHERE estado = 'FINALIZADO';
CREATE INDEX ix_valoracion_fecha ON valoracion_asesoramiento(creada_en, id_asesoramiento);
CREATE INDEX ix_pago_asesoramiento_fecha ON pago_asesoramiento(id_asesoramiento, cobrado_en, id);
CREATE INDEX ix_pago_cobrado ON pago_asesoramiento(moneda, cobrado_en, id_asesoramiento)
  WHERE estado = 'COBRADO';

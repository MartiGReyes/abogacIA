CREATE SCHEMA operativa;
CREATE TABLE operativa.campania (
    id uuid PRIMARY KEY,
    creada_en timestamptz NOT NULL,
    vence_en timestamptz NOT NULL CHECK (vence_en > creada_en),
    activa boolean NOT NULL
);
CREATE TABLE operativa.sesion (
    hash char(64) PRIMARY KEY,
    campania_id uuid NOT NULL REFERENCES operativa.campania(id),
    rol varchar(16) NOT NULL CHECK (rol IN ('OPERADOR','PARTICIPANTE')),
    vence_en timestamptz NOT NULL,
    revocada boolean NOT NULL DEFAULT false
);
CREATE TABLE operativa.invitacion (
    hash char(64) PRIMARY KEY,
    campania_id uuid NOT NULL REFERENCES operativa.campania(id),
    vence_en timestamptz NOT NULL,
    consumida boolean NOT NULL DEFAULT false
);
CREATE TABLE operativa.perfil (
    id uuid PRIMARY KEY,
    campania_id uuid NOT NULL UNIQUE REFERENCES operativa.campania(id),
    nombre_visible varchar(100) NOT NULL,
    dni_cifrado bytea NOT NULL CHECK (octet_length(dni_cifrado) >= 35),
    telefono_cifrado bytea NOT NULL CHECK (octet_length(telefono_cifrado) = 41),
    version_clave varchar(32) NOT NULL CHECK (version_clave = 'v1'),
    especialidad varchar(100) NOT NULL,
    matricula_prueba varchar(64) NOT NULL UNIQUE CHECK (matricula_prueba LIKE 'PRUEBA-%'),
    tipo_perfil varchar(32) NOT NULL CHECK (tipo_perfil = 'PRUEBA_OPERATIVA'),
    identidad_estado varchar(32) NOT NULL CHECK (identidad_estado = 'DECLARADA_NO_VERIFICADA'),
    matricula_estado varchar(32) NOT NULL CHECK (matricula_estado = 'FICTICIA_NO_VERIFICADA'),
    activo boolean NOT NULL DEFAULT false,
    creado_en timestamptz NOT NULL,
    vence_en timestamptz NOT NULL CHECK (vence_en > creado_en),
    consentimiento_contacto_en timestamptz NOT NULL,
    aviso_version varchar(32) NOT NULL
);
CREATE INDEX ix_op_sesion_campania ON operativa.sesion(campania_id);
CREATE INDEX ix_op_invitacion_campania ON operativa.invitacion(campania_id);

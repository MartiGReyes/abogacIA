-- PREPARADA, NO ejecutar sobre la base habitual sin autorización. Base: abogacia_abogados
BEGIN;
CREATE TABLE recuperacion_cuenta (
 cuenta_id bigint PRIMARY KEY REFERENCES abogados_registrados(id_abogado),
 token_hash varchar(64) UNIQUE NOT NULL,
 vence timestamptz NOT NULL,
 solicitada_en timestamptz NOT NULL
);
COMMIT;
-- Rollback posterior, únicamente con autorización y revisión de tokens pendientes:
-- DROP TABLE recuperacion_cuenta;

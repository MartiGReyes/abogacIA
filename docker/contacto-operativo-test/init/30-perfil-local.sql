BEGIN;
DO $$ BEGIN
 IF current_database() <> 'contacto_operativo_test' OR current_user <> 'operativa_owner' THEN
  RAISE EXCEPTION 'Migración exclusiva de la base aislada de contacto';
 END IF;
END $$;
CREATE TABLE IF NOT EXISTS operativa.perfil_local (
 id uuid PRIMARY KEY,
 singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton),
 nombre_visible varchar(100) NOT NULL,
 dni_cifrado bytea NOT NULL CHECK (octet_length(dni_cifrado) BETWEEN 35 AND 36),
 telefono_cifrado bytea NOT NULL CHECK (octet_length(telefono_cifrado)=41),
 especialidad varchar(100) NOT NULL,
 matricula_prueba varchar(64) NOT NULL CHECK (matricula_prueba LIKE 'PRUEBA-%'),
 permitido boolean NOT NULL DEFAULT false,
 creado_en timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON operativa.perfil_local TO operativa_runtime;
-- Historical campaign tables and encrypted personal data are deliberately preserved.
COMMIT;

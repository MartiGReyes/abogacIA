\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
    IF current_database() <> 'abogacia_abogados_dev' OR current_user <> 'abogados_dev_owner' THEN
        RAISE EXCEPTION 'Carga permitida solo en la base y propietario de desarrollo';
    END IF;
END $$;
SELECT pg_advisory_xact_lock(7319261026);

CREATE TEMP TABLE expected_fixtures ON COMMIT DROP AS
SELECT * FROM (VALUES
    ('abogacia-dev-valentina-torres', 'Valentina', 'Torres', ARRAY['Derecho Laboral']::text[], 'Río Tercero', 'Córdoba', 'Perfil ficticio para pruebas de abogacIA.'),
    ('abogacia-dev-martin-ferreyra', 'Martín', 'Ferreyra', ARRAY['Derecho Laboral', 'Derecho Civil']::text[], 'Río Tercero', 'Córdoba', 'Perfil ficticio para pruebas de abogacIA.'),
    ('abogacia-dev-lucia-benitez', 'Lucía', 'Benítez', ARRAY['Defensa del Consumidor']::text[], 'Almafuerte', 'Córdoba', 'Perfil ficticio para pruebas de abogacIA.')
) AS data(fixture_id, nombre, apellido, especialidades, ubicacion, provincia, descripcion_profesional);

INSERT INTO abogacia_dev.perfiles_prueba
    (fixture_id, nombre, apellido, especialidades, ubicacion, provincia, descripcion_profesional)
SELECT fixture_id, nombre, apellido, especialidades, ubicacion, provincia, descripcion_profesional
FROM expected_fixtures
ON CONFLICT (fixture_id) DO NOTHING;

-- Refuse collisions or changed fixture contents; never overwrite an existing row.
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM expected_fixtures e
        LEFT JOIN abogacia_dev.perfiles_prueba p USING (fixture_id)
        WHERE p.id IS NULL OR NOT p.perfil_prueba OR p.estado <> 'FICTICIO_NO_HABILITADO'
           OR ROW(p.nombre, p.apellido, p.especialidades, p.ubicacion, p.provincia, p.descripcion_profesional)
              IS DISTINCT FROM ROW(e.nombre, e.apellido, e.especialidades, e.ubicacion, e.provincia, e.descripcion_profesional)
    ) THEN
        RAISE EXCEPTION 'Colisión de fixtures: no se sobrescribieron los perfiles existentes';
    END IF;
END $$;
COMMIT;

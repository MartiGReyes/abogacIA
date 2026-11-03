\set ON_ERROR_STOP on
-- Only EP06 synthetic databases. Idempotent; no rows, schema or credentials are replaced.
DO $$ BEGIN
    IF current_database() <> 'ep06_test_control' OR current_user <> 'ep06_test_owner' THEN
        RAISE EXCEPTION 'Management permissions require the isolated EP06 owner/control database';
    END IF;
END $$;

\connect ep06_ciudadanos_test ep06_test_owner
BEGIN;
DO $$ BEGIN
    IF current_database() <> 'ep06_ciudadanos_test' OR current_user <> 'ep06_test_owner' THEN
        RAISE EXCEPTION 'Wrong database/owner for EP06 citizens';
    END IF;
    IF EXISTS (SELECT 1 FROM public.ciudadano WHERE mail NOT LIKE '%@ep06.example.com') THEN
        RAISE EXCEPTION 'Non-synthetic accounts found; permissions not changed';
    END IF;
END $$;
GRANT SELECT, INSERT, UPDATE ON public.estado TO ep06_ciudadanos_reader;
GRANT UPDATE ON public.ciudadano TO ep06_ciudadanos_reader;
GRANT USAGE, SELECT ON SEQUENCE public.estado_id_estado_seq TO ep06_ciudadanos_reader;
ALTER ROLE ep06_ciudadanos_reader IN DATABASE ep06_ciudadanos_test SET default_transaction_read_only = off;
COMMIT;

\connect ep06_abogados_test ep06_test_owner
BEGIN;
DO $$ BEGIN
    IF current_database() <> 'ep06_abogados_test' OR current_user <> 'ep06_test_owner' THEN
        RAISE EXCEPTION 'Wrong database/owner for EP06 lawyers';
    END IF;
    IF EXISTS (SELECT 1 FROM public.abogados_registrados WHERE mail NOT LIKE '%@ep06.example.com') THEN
        RAISE EXCEPTION 'Non-synthetic accounts found; permissions not changed';
    END IF;
END $$;
GRANT SELECT, INSERT, UPDATE ON public.estado TO ep06_abogados_reader;
GRANT UPDATE ON public.abogados_registrados TO ep06_abogados_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.padron, public.padron_evidencia TO ep06_abogados_reader;
GRANT USAGE, SELECT ON SEQUENCE public.estado_id_estado_seq, public.padron_evidencia_id_seq TO ep06_abogados_reader;
ALTER ROLE ep06_abogados_reader IN DATABASE ep06_abogados_test SET default_transaction_read_only = off;
COMMIT;

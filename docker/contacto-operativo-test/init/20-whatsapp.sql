-- Explicit migration. Apply only to the isolated PostgreSQL authorized for testing.
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'contacto_operativo_test' OR current_user <> 'operativa_owner' THEN
    RAISE EXCEPTION 'Esta migracion solo admite la base aislada de contacto';
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.whatsapp_autorizacion (
    id_abogado bigint PRIMARY KEY REFERENCES public.abogados_registrados(id_abogado),
    permitido boolean NOT NULL DEFAULT false,
    actualizado_en timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
GRANT SELECT,INSERT,UPDATE ON public.whatsapp_autorizacion TO operativa_runtime;
COMMIT;

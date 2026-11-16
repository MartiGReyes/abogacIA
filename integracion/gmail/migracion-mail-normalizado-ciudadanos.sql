-- PREPARADA: solo aplicar con autorización a abogacia_ciudadanos.
-- Comprobar primero: SELECT lower(btrim(mail)),count(*) FROM ciudadano GROUP BY 1 HAVING count(*)>1;
-- Aborta ante duplicados, no fusiona ni actualiza cuentas. No usar IF NOT EXISTS.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE UNIQUE INDEX uq_ciudadano_mail_normalizado ON public.ciudadano (lower(btrim(mail)));
COMMIT;
-- Reversión autorizada y con escrituras detenidas: DROP INDEX public.uq_ciudadano_mail_normalizado;

-- Amplía el resumen del contacto por WhatsApp de 800 a 2000 caracteres para que entre la orientación de Lexi.
-- Idempotente: se puede volver a correr. Base: abogacia_abogados.
ALTER TABLE contacto_whatsapp ALTER COLUMN resumen TYPE varchar(2000);

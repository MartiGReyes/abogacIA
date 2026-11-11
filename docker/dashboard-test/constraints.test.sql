\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF current_database()<>'dashboard_abogados_test' OR current_user<>'dashboard_owner' THEN
    RAISE EXCEPTION 'Solo se permite ejecutar en dashboard aislado';
  END IF;
  BEGIN
    INSERT INTO pago_asesoramiento(id_asesoramiento,clave_operacion,importe,moneda,estado,registrado_en,cobrado_en)
      VALUES(1,'synthetic:cuota1',10000,'ARS','COBRADO',now(),now());
    RAISE EXCEPTION 'Falta restricción de operación única';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO valoracion_asesoramiento(id_asesoramiento,puntuacion,creada_en) VALUES(2,6,now());
    RAISE EXCEPTION 'Falta restricción de puntuación';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO asesoramiento(id_solicitud,estado,iniciado_en) VALUES(1,'FINALIZADO',now());
    RAISE EXCEPTION 'Falta fecha de finalización';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO pago_asesoramiento(id_asesoramiento,clave_operacion,importe,moneda,estado,registrado_en)
      VALUES(1,'synthetic:invalido',100,'ARS','COBRADO',now());
    RAISE EXCEPTION 'Falta fecha de cobro';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF has_table_privilege('dashboard_reader','pago_asesoramiento','INSERT')
     OR has_table_privilege('dashboard_reader','solicitud_asesoramiento','UPDATE')
     OR has_schema_privilege('dashboard_reader','public','CREATE') THEN
    RAISE EXCEPTION 'El runtime no debe poder escribir';
  END IF;
END $$;
ROLLBACK;

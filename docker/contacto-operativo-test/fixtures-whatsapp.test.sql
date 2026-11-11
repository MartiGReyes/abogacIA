\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
 IF current_database()<>'contacto_operativo_test' OR current_user<>'operativa_owner' THEN RAISE EXCEPTION 'Solo base aislada'; END IF;
 IF EXISTS(SELECT 1 FROM abogados_registrados WHERE id_abogado BETWEEN 951001 AND 951004 AND mail NOT LIKE 'wa%@fixture-operativa.local') THEN RAISE EXCEPTION 'Colision con datos ajenos'; END IF;
END $$;
INSERT INTO abogados_registrados(id_abogado,nombre,apellido,dni,mail,contrasena_hash,nro_celular,nro_matricula,colegio_profesional,provincia,id_estado,correo_confirmado,verificacion_dni,validacion_matricula,matricula_verificada,fecha_registro,honorarios)
SELECT 951000+n,'AUTOTEST Profesional '||n,'Prueba','9909510'||n,'wa'||n||'@fixture-operativa.local','SYNTHETIC-NO-LOGIN',CASE WHEN n=3 THEN 'invalido' ELSE '+549351000000'||n END,'10-95100'||n,'Colegio de Abogados de Río Tercero','Córdoba',e.id_estado,true,'APROBADA','VALIDADA',n<>4,current_date,10000*n
FROM estado e CROSS JOIN generate_series(1,4) n WHERE e.nombre_estado='REGISTRADO'
ON CONFLICT(id_abogado) DO NOTHING;
UPDATE abogados_registrados SET id_estado=(SELECT id_estado FROM estado WHERE nombre_estado='REGISTRADO'),nro_celular=CASE WHEN id_abogado=951003 THEN 'invalido' ELSE '+549351000000'||(id_abogado-951000) END
WHERE id_abogado BETWEEN 951001 AND 951004 AND mail LIKE 'wa%@fixture-operativa.local';
INSERT INTO padron_evidencia(matricula,dni,nombre_completo,estado,hoja,fila,version_archivo)
SELECT '10-95100'||n,'9909510'||n,'AUTOTEST PROFESIONAL '||n,'ACTIVO','AUTOTEST',n,'whatsapp-integrado-test' FROM generate_series(1,4) n
WHERE NOT EXISTS(SELECT 1 FROM padron_evidencia WHERE matricula='10-95100'||n);
INSERT INTO abogado_especialidades(id_abogado,especialidad) SELECT 951000+n,'Derecho Laboral' FROM generate_series(1,4) n ON CONFLICT DO NOTHING;
INSERT INTO whatsapp_autorizacion(id_abogado,permitido) SELECT 951000+n,false FROM generate_series(1,4) n ON CONFLICT(id_abogado) DO UPDATE SET permitido=false;
COMMIT;

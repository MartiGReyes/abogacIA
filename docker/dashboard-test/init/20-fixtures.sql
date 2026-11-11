\set ON_ERROR_STOP on
\getenv fixture_hash DASHBOARD_FIXTURE_HASH
BEGIN;
DO $$ BEGIN IF current_database()<>'dashboard_abogados_test' OR current_user<>'dashboard_owner' THEN RAISE EXCEPTION 'Solo dashboard aislado'; END IF; END $$;
SELECT pg_advisory_xact_lock(99009001);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM abogados_registrados) THEN RAISE EXCEPTION 'Fixtures ya cargados: no sobrescribir datos'; END IF; END $$;
INSERT INTO abogados_registrados(id_abogado,nombre,apellido,dni,mail,contrasena_hash,nro_matricula,colegio_profesional,provincia,id_estado,correo_confirmado,verificacion_dni,validacion_matricula,matricula_verificada,fecha_registro)
SELECT n,'Prueba', 'Dashboard '||n, '9900900'||n, 'abogado'||n||'.dashboard@example.com', :'fixture_hash', '10-990'||n, 'Colegio de Abogados de Río Tercero','Córdoba',id_estado,true,'APROBADA','VALIDADA',true,current_date FROM estado CROSS JOIN generate_series(1,3) n WHERE nombre_estado='REGISTRADO';
INSERT INTO padron_evidencia(matricula,dni,nombre_completo,estado,hoja,fila,version_archivo)
SELECT '10-990'||n,'9900900'||n,'PRUEBA DASHBOARD '||n,'ACTIVO','SINTETICO DASHBOARD',n,'dashboard-test' FROM generate_series(1,3) n;
INSERT INTO abogado_especialidades VALUES (1,'Derecho Civil'),(1,'Derecho Laboral'),(2,'Derecho Civil'),(3,'Derecho Civil');
INSERT INTO solicitud_asesoramiento(id,id_abogado,id_ciudadano,area_juridica,descripcion,estado,creada_en,aceptada_en) OVERRIDING SYSTEM VALUE VALUES
(1,1,9001,'Derecho Civil','Caso sintético finalizado','ACEPTADA',now()-interval '15 days',now()-interval '14 days'),
(2,1,9002,'Derecho Laboral','Caso sintético en curso','ACEPTADA',now()-interval '8 days',now()-interval '7 days'),
(3,1,9003,'Derecho Civil','Pendiente sintético','PENDIENTE',now(),null),
(4,2,9004,'Derecho Civil','Caso privado del segundo abogado','ACEPTADA',now()-interval '5 days',now()-interval '4 days'),
(5,1,9005,'Derecho Civil','Caso sintético histórico','ACEPTADA',now()-interval '65 days',now()-interval '64 days');
INSERT INTO asesoramiento(id,id_solicitud,estado,iniciado_en,finalizado_en) OVERRIDING SYSTEM VALUE VALUES
(1,1,'FINALIZADO',now()-interval '13 days',now()-interval '3 days'),
(2,2,'EN_CURSO',now()-interval '6 days',null),
(4,4,'FINALIZADO',now()-interval '4 days',now()-interval '2 days'),
(5,5,'FINALIZADO',now()-interval '63 days',now()-interval '40 days');
INSERT INTO valoracion_asesoramiento(id_asesoramiento,puntuacion,creada_en) VALUES(1,5,now()-interval '2 days'),(4,1,now()-interval '1 day'),(5,3,now()-interval '1 day');
INSERT INTO pago_asesoramiento(id_asesoramiento,clave_operacion,importe,moneda,estado,registrado_en,cobrado_en) VALUES
(1,'synthetic:cuota1',10000,'ARS','COBRADO',now()-interval '2 days',now()-interval '2 days'),
(1,'synthetic:cuota2',10000,'ARS','COBRADO',now()-interval '1 day',now()-interval '1 day'),
(2,'synthetic:pendiente',99999,'ARS','PENDIENTE',now(),null),
(1,'synthetic:rechazado',99999,'ARS','RECHAZADO',now(),null),
(2,'synthetic:cancelado',99999,'ARS','CANCELADO',now(),null),
(4,'synthetic:otro',999999,'ARS','COBRADO',now()-interval '1 day',now()-interval '1 day'),
(5,'synthetic:anterior',5000,'ARS','COBRADO',now()-interval '40 days',now()-interval '40 days'),
(1,'synthetic:usd',25,'USD','COBRADO',now()-interval '1 day',now()-interval '1 day');
SELECT setval(pg_get_serial_sequence('abogados_registrados','id_abogado'),(SELECT max(id_abogado) FROM abogados_registrados));
SELECT setval(pg_get_serial_sequence('solicitud_asesoramiento','id'),(SELECT max(id) FROM solicitud_asesoramiento));
SELECT setval(pg_get_serial_sequence('asesoramiento','id'),(SELECT max(id) FROM asesoramiento));
COMMIT;

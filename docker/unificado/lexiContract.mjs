export function normalizarRespuesta(data) {
  if (typeof data?.orientacion !== 'string' || !data.orientacion.trim() || data.orientacion.length > 20000) throw new Error('Respuesta inválida');
  const fixed = {
    FUERA_DE_ALCANCE: 'Por ahora solo puedo orientarte en temas laborales (Ley de Contrato de Trabajo): despidos, indemnizaciones, sueldos, aguinaldo, vacaciones, jornada y licencias. Tu consulta es de otra materia, así que te conviene hablarlo directamente con un abogado',
    LENGUAJE_INAPROPIADO: 'Tu mensaje incumple las normas de uso de Lexi. Reformulá tu consulta con respeto',
  };
  if (Object.hasOwn(fixed, data.estado)) return { orientacion: fixed[data.estado], estado: data.estado, mostrarAbogados: false };
  if (data.estado !== 'RESPONDIDA') throw new Error('Clasificación incierta');
  return { orientacion: data.orientacion.trim(), estado: 'RESPONDIDA', mostrarAbogados: data.mostrarAbogados === true };
}

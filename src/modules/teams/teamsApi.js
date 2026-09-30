import { supabaseCampeonato } from '../../lib/supabaseCampeonato'

export async function listarTeams() {
  const { data, error } = await supabaseCampeonato.rpc('admin_teams_listar')
  if (error) throw error
  return data ?? []
}

export async function crearTeams(form) {
  const { data: id, error } = await supabaseCampeonato.rpc('admin_teams_crear', {
    p_nombre: form.nombre.trim(),
    p_fecha_inicio: form.fecha_inicio || null,
    p_fecha_fin: form.fecha_fin || null,
    p_metodo_formacion: form.metodo_formacion,
    p_modalidad: form.modalidad,
    p_numero_partidos: Number(form.numero_partidos),
    p_jugadores_por_equipo: Number(form.jugadores_por_equipo) || null,
    p_reservas_por_equipo: Number(form.reservas_por_equipo) || 0,
  })
  if (error) throw error
  const config = { ...form }
  delete config.nombre
  for (const campo of ['fecha_inicio', 'fecha_fin', 'publicar_at', 'max_partidos_jugador']) {
    if (config[campo] === '') config[campo] = null
  }
  const { error: errorConfig } = await supabaseCampeonato.rpc('admin_teams_guardar_configuracion', {
    p_team_id: id,
    p_config: config,
  })
  if (errorConfig) throw errorConfig
  return id
}

export async function obtenerDetalleTeams(teamId) {
  const { data, error } = await supabaseCampeonato.rpc('admin_teams_detalle', { p_team_id: teamId })
  if (error) throw error
  return data
}
export async function catalogoJugadoresTeams() {
  const { data, error } = await supabaseCampeonato.rpc('admin_teams_catalogo_jugadores')
  if (error) throw error
  return data ?? []
}
export async function guardarElegiblesTeams(teamId, jugadores) {
  const { data, error } = await supabaseCampeonato.rpc('admin_teams_guardar_elegibles', { p_team_id: teamId, p_jugadores: jugadores })
  if (error) throw error
  return data
}

export async function guardarConvocatoriaTeams(teamId, estados) {
  const { data, error } = await supabaseCampeonato.rpc('admin_teams_guardar_convocatoria', {
    p_team_id: teamId,
    p_estados: estados,
  })
  if (error) throw error
  return data
}
export async function configurarEquiposTeams(teamId, nombreA, capitanA, nombreB, capitanB) {
  const { error } = await supabaseCampeonato.rpc('admin_teams_configurar_equipos', {
    p_team_id: teamId, p_nombre_a: nombreA, p_capitan_a: capitanA,
    p_nombre_b: nombreB, p_capitan_b: capitanB,
  })
  if (error) throw error
}

export async function guardarFormacionManualTeams(teamId, asignaciones) {
  const { data, error } = await supabaseCampeonato.rpc('admin_teams_guardar_formacion_manual', {
    p_team_id: teamId, p_asignaciones: asignaciones,
  })
  if (error) throw error
  return data
}

export async function cerrarPlantillasTeams(teamId) {
  const { error } = await supabaseCampeonato.rpc('admin_teams_cerrar_plantillas', { p_team_id: teamId })
  if (error) throw error
}
export async function reabrirPlantillasTeams(teamId) {
  const { error } = await supabaseCampeonato.rpc('admin_teams_reabrir_plantillas', { p_team_id: teamId })
  if (error) throw error
}

export async function guardarReglasTeams(teamId, config) {
  const { error } = await supabaseCampeonato.rpc('admin_teams_guardar_configuracion', { p_team_id: teamId, p_config: config })
  if (error) throw error
}
export async function marcarReglasRevisadasTeams(teamId, revisadas = true) {
  const { error } = await supabaseCampeonato.rpc('admin_teams_marcar_reglas_revisadas', { p_team_id: teamId, p_revisadas: revisadas })
  if (error) throw error
}

export async function iniciarTeams(teamId) {
  const { data, error } = await supabaseCampeonato.rpc('admin_teams_iniciar', { p_team_id: teamId })
  if (error) throw error
  return data
}

export async function guardarAlineacionTeams(partidoId, equipoId, jugador1, jugador2) {
  const { error } = await supabaseCampeonato.rpc('admin_teams_guardar_alineacion', {
    p_partido_id: partidoId, p_equipo_id: equipoId, p_jugador_1: jugador1, p_jugador_2: jugador2,
  })
  if (error) throw error
}
export async function revelarAlineacionesTeams(partidoId) {
  const { error } = await supabaseCampeonato.rpc('admin_teams_revelar_alineaciones', { p_partido_id: partidoId })
  if (error) throw error
}

export async function proponerHorarioTeams(partidoId, fechaHora, pista = null) {
  const { data, error } = await supabaseCampeonato.rpc('admin_teams_proponer_horario', { p_partido_id: partidoId, p_fecha_hora: fechaHora, p_pista: pista || null })
  if (error) throw error
  return data
}
export async function confirmarHorarioTeams(partidoId, propuestaId, pista = null) {
  const { error } = await supabaseCampeonato.rpc('admin_teams_confirmar_horario', { p_partido_id: partidoId, p_propuesta_id: propuestaId, p_pista: pista || null })
  if (error) throw error
}
export async function actualizarPistaTeams(partidoId, pista) {
  const { error } = await supabaseCampeonato.rpc('admin_teams_actualizar_pista', { p_partido_id: partidoId, p_pista: pista })
  if (error) throw error
}

export async function modificarProgramacionTeams(partidoId, fechaHora, pista = null) {
  const { error } = await supabaseCampeonato.rpc('admin_teams_modificar_programacion', { p_partido_id: partidoId, p_fecha_hora: fechaHora, p_pista: pista || null })
  if (error) throw error
}
export async function eliminarProgramacionTeams(partidoId) {
  const { error } = await supabaseCampeonato.rpc('admin_teams_eliminar_programacion', { p_partido_id: partidoId })
  if (error) throw error
}

export async function guardarResultadoTeams(partidoId, sets, finalizacion='normal', ganador=null, duracion=null, observaciones=null) {
  const { error } = await supabaseCampeonato.rpc('admin_teams_guardar_resultado', { p_partido_id:partidoId, p_sets:sets, p_finalizacion:finalizacion, p_ganador:ganador, p_duracion:duracion||null, p_observaciones:observaciones||null })
  if (error) throw error
}
export async function confirmarResultadoTeams(partidoId) {
  const { error } = await supabaseCampeonato.rpc('admin_teams_confirmar_resultado', { p_partido_id:partidoId })
  if (error) throw error
}
export async function impugnarResultadoTeams(partidoId, motivo) {
  const { error } = await supabaseCampeonato.rpc('admin_teams_impugnar_resultado', { p_partido_id:partidoId, p_motivo:motivo||null })
  if (error) throw error
}

export async function resolverIncidenciaTeams(incidenciaId, accion, resolucion=null) {
  const { error } = await supabaseCampeonato.rpc('admin_teams_resolver_incidencia', {
    p_incidencia_id: incidenciaId, p_accion: accion, p_resolucion: resolucion || null,
  })
  if (error) throw error
}

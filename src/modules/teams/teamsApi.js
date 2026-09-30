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

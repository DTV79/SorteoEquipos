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

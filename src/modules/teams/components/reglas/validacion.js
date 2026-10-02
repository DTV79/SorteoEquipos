export function errorViabilidadReglas(f) {
  const j = Number(f.jugadores_por_equipo) || 0
  const p = Number(f.numero_partidos) || 0

  if (j < 2) return 'Cada equipo necesita al menos 2 jugadores.'

  let max = Infinity

  if (f.repetir_jugadores === 'no') {
    max = Math.floor(j / 2)
  }

  if (f.repetir_jugadores === 'maximo') {
    const x = Number(f.max_partidos_jugador) || 0
    if (!x) return 'Indica el máximo de partidos por jugador.'
    max = Math.floor(j * x / 2)
  }

  if (!f.repetir_pareja) {
    max = Math.min(max,j*(j-1)/2)
  }

  if (
    f.metodo_formacion === 'predeterminado' &&
    (!String(f.nombre_equipo_a || '').trim() || !String(f.nombre_equipo_b || '').trim())
  ) {
    return 'Escribe el nombre de los dos equipos predeterminados.'
  }

  if (
    f.metodo_formacion === 'draft' &&
    ['eleccion_equipo','sorteo'].includes(f.modo_designacion_capitanes)
  ) {
    return 'En un Draft los capitanes deben estar definidos antes de formar los equipos. Usa Administrador o Definidos de antemano.'
  }

  if (
    f.modo_inicio_teams === 'programado' &&
    !String(f.inicio_programado_at || '').trim()
  ) {
    return 'Indica la fecha y hora del inicio programado.'
  }

  return p > max
    ? 'Con estas reglas solo son posibles ' + max + ' partidos por equipo y hay ' + p + ' configurados. Modifica el número de partidos o las reglas de participación.'
    : ''
}

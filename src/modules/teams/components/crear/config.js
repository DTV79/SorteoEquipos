export const PASOS = ['General','Formación','Participación','Parejas','Publicación','Revisión']

export const FORMACION_INFO = {
  manual: 'Todos se apuntan a una bolsa común. Después el administrador reparte manualmente a los jugadores entre los dos equipos y elige los capitanes.',
  draft: 'Todos se apuntan a una bolsa común. Se eligen dos capitanes y estos van seleccionando jugadores según el tipo de draft configurado.',
  sorteo: 'Todos se apuntan a una bolsa común. Al cerrar la convocatoria los equipos se forman mediante sorteo.',
  predeterminado: 'Los dos equipos existen desde antes de la convocatoria, por ejemplo Centro Urbano contra Rural. Cada jugador queda vinculado a uno de los dos lados.'
}

export const crearTeamsInicial = {
  nombre:'',
  fecha_inicio:'',
  fecha_fin:'',
  modalidad:'mejor_de',
  numero_partidos:7,
  puntos_por_victoria:1,
  metodo_formacion:'manual',
  jugadores_por_equipo:8,
  reservas_por_equipo:0,
  tipo_draft:'alterno',
  asignacion_predeterminada:'admin',
  nombre_equipo_a:'Equipo A',
  nombre_equipo_b:'Equipo B',
  color_equipo_a:'#22c55e',
  color_equipo_b:'#3b82f6',
  computa_estadisticas:true,
  computa_ranking:false,
  computa_isp:false,
  repetir_jugadores:'si',
  max_partidos_jugador:'',
  repetir_pareja:false,
  todos_antes_repetir:false,
  sistema_eleccion_parejas:'secreto',
  primer_presentador:'sorteo',
  segundo_ve_pareja:false,
  plazo_presentar_horas:48,
  modo_publicacion:'inmediata',
  publicar_at:'',
  plazo_acordar_dias:3,
  plazo_jugar_dias:7,
  tratamiento_no_finalizado:'reanudar',
  modo_designacion_capitanes:'administrador',
  modo_inicio_teams:'administrador',
  inicio_programado_at:''
}

import { useEffect, useState } from 'react'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './CampeonatoConfiguracion.css'

const SISTEMAS_PUNTUACION_INICIALES = {
  Normal: { ganador_3_0: 3, ganador_2_1: 3, perdedor_1_2: 0, perdedor_0_3: 0, descanso: 0 },
  Equitativo: { ganador_3_0: 3, ganador_2_1: 3, perdedor_1_2: 0, perdedor_0_3: 0, descanso: 2 },
  Competitivo: { ganador_3_0: 3, ganador_2_1: 2, perdedor_1_2: 1, perdedor_0_3: 0, descanso: 2 },
}

const VALORES_INICIALES = {
  id_campeonato: '',
  nombre_campeonato: '',
  anio_campeonato: new Date().getFullYear(),
  fecha_campeonato: '',
  lugar_campeonato: '',
  horario_campeonato: '',
  version_web: '',
  estado_torneo: 'Pretorneo',
  tipo_campeonato: '',
  estructura_primera_fase: '2 Grupos',
  num_grupos_iniciales: 2,
  equipos_por_grupo: 4,
  hay_regrupos: false,
  repetir_enfrentamientos_regrupos: false,
  equipos_pasan_a_regrupos: 4,
  equipos_pasan_a_cruces_por_grupo: 4,
  puntos_partido_arrastrado: 2,
  num_pistas_disponibles: 4,
  ronda_inicial_eliminatorias: '',
  formato_acceso_eliminatorias: 'Cruces normales',
  criterio_generar_cruces: 'No Enfrentados',
  hay_copa_palas_playa: '',
  criterio_palas_playa: 'No Enfrentados',
  posicion_inicio_palas_playa: 9,
  puntos_objetivo_set: 10,
  puntos_maximos_por_set: 15,
  sistema_puntuacion: 'Competitivo',
  sistemas_puntuacion: SISTEMAS_PUNTUACION_INICIALES,
  ordenar_clasificacion: '',
  modo_generar_jornadas: '',
  url_inscripcion: '',
  mostrar_ranking_historico: true,
  mostrar_estadisticas: true,
  mostrar_fotos: true,
  mostrar_normativa: true,
  mostrar_historia: true,
  mostrar_campeones: true,
  mostrar_aviso_proxima_edicion: false,
  titulo_aviso_proxima_edicion: '',
  texto_corto_aviso_proxima_edicion: '',
  texto_ampliado_aviso_proxima_edicion: '',
  modo_mantenimiento: false,
  titulo_mantenimiento: 'WEB en mantenimiento',
  mensaje_mantenimiento: '',
}

const CAMPOS_BOOLEANOS = new Set([
  'hay_regrupos',
  'repetir_enfrentamientos_regrupos',
  'mostrar_ranking_historico',
  'mostrar_estadisticas',
  'mostrar_fotos',
  'mostrar_normativa',
  'mostrar_historia',
  'mostrar_campeones',
  'mostrar_aviso_proxima_edicion',
  'modo_mantenimiento',
])

const CAMPOS_NUMERICOS = new Set([
  'anio_campeonato',
  'num_grupos_iniciales',
  'equipos_por_grupo',
  'equipos_pasan_a_regrupos',
  'equipos_pasan_a_cruces_por_grupo',
  'puntos_partido_arrastrado',
  'num_pistas_disponibles',
  'posicion_inicio_palas_playa',
  'puntos_objetivo_set',
  'puntos_maximos_por_set',
])

function aBooleano(valor) {
  const texto = String(valor).toLowerCase()
  return valor === true || texto === 'true' || texto === 'sí' || texto === 'si'
}

function normalizarSiNoIndefinido(valor) {
  if (valor === true || ['true', 'sí', 'si'].includes(String(valor).toLowerCase())) return true
  if (valor === false || ['false', 'no'].includes(String(valor).toLowerCase())) return false
  return ''
}

function normalizarConfiguracion(datos) {
  const config = { ...VALORES_INICIALES, ...(datos ?? {}) }
  config.sistemas_puntuacion = Object.fromEntries(
    Object.entries(SISTEMAS_PUNTUACION_INICIALES).map(([nombre, valores]) => [
      nombre,
      { ...valores, ...(datos?.sistemas_puntuacion?.[nombre] ?? {}) },
    ])
  )
  CAMPOS_BOOLEANOS.forEach((campo) => {
    config[campo] = aBooleano(config[campo])
  })
  config.hay_copa_palas_playa = normalizarSiNoIndefinido(datos?.hay_copa_palas_playa)

  // Corrige combinaciones antiguas o incompletas sin eliminar la opción «—».
  if (config.tipo_campeonato === 'Liguilla') {
    config.estructura_primera_fase = 'Liguilla Única'
    config.num_grupos_iniciales = 1
  } else if (config.tipo_campeonato === 'Grupos') {
    if (!['2 Grupos', '4 Grupos'].includes(config.estructura_primera_fase)) {
      config.estructura_primera_fase = '2 Grupos'
    }
    config.num_grupos_iniciales = config.estructura_primera_fase === '4 Grupos' ? 4 : 2
  }
  return config
}

function Campo({ etiqueta, children, ayuda }) {
  return (
    <label className="campo-configuracion">
      <span>{etiqueta}</span>
      {children}
      {ayuda && <small>{ayuda}</small>}
    </label>
  )
}

export default function CampeonatoConfiguracion({ codigo, onVolver, onResultados, onPanelPrincipal, onCampeonatoEliminado }) {
  const [config, setConfig] = useState(VALORES_INICIALES)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [accionMantenimiento, setAccionMantenimiento] = useState(null)
  const [resumenMantenimiento, setResumenMantenimiento] = useState(null)
  const [errorMantenimiento, setErrorMantenimiento] = useState('')
  const [confirmacionMantenimiento, setConfirmacionMantenimiento] = useState('')
  const [procesandoMantenimiento, setProcesandoMantenimiento] = useState(false)
  const [mostrarPuntuaciones, setMostrarPuntuaciones] = useState(false)
  const [sistemaPuntuacionEditado, setSistemaPuntuacionEditado] = useState('Competitivo')

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setCargando(true)
      const { data, error } = await supabaseCampeonato.rpc(
        'admin_obtener_configuracion',
        { p_codigo: codigo }
      )
      if (cancelado) return
      if (error || data?.ok !== true) {
        setMensaje({ tipo: 'error', texto: error?.message || data?.error || 'No se pudo cargar la configuración.' })
      } else {
        setConfig(normalizarConfiguracion(data.configuracion))
      }
      setCargando(false)
    }

    cargar()
    return () => { cancelado = true }
  }, [codigo])

  function cambiar(evento) {
    const { name, type, checked, value } = evento.target
    let nuevoValor = type === 'checkbox' ? checked : value
    if (CAMPOS_NUMERICOS.has(name)) {
      nuevoValor = value === '' ? '' : Number(value)
    }

    setConfig((actual) => {
      const siguiente = { ...actual, [name]: nuevoValor }
      if (name === 'tipo_campeonato') {
        if (value === 'Liguilla') {
          siguiente.estructura_primera_fase = 'Liguilla Única'
          siguiente.num_grupos_iniciales = 1
        } else if (value === 'Grupos') {
          siguiente.estructura_primera_fase = ['2 Grupos', '4 Grupos'].includes(actual.estructura_primera_fase)
            ? actual.estructura_primera_fase
            : '2 Grupos'
          siguiente.num_grupos_iniciales = siguiente.estructura_primera_fase === '4 Grupos' ? 4 : 2
        }
      }
      if (name === 'estructura_primera_fase') {
        siguiente.num_grupos_iniciales = value === '4 Grupos' ? 4 : value === '2 Grupos' ? 2 : 1
      }
      return siguiente
    })
  }

  function cambiarPuntuacion(evento) {
    const { name, value } = evento.target
    const puntos = value === '' ? '' : Math.max(0, Number(value))
    setConfig((actual) => ({
      ...actual,
      sistemas_puntuacion: {
        ...actual.sistemas_puntuacion,
        [sistemaPuntuacionEditado]: {
          ...actual.sistemas_puntuacion[sistemaPuntuacionEditado],
          [name]: puntos,
        },
      },
    }))
  }

  async function guardar(evento) {
    evento.preventDefault()
    setGuardando(true)
    setMensaje({ tipo: '', texto: 'Guardando configuración…' })

    const { data, error } = await supabaseCampeonato.rpc(
      'admin_guardar_configuracion',
      { p_codigo: codigo, p_configuracion: config }
    )

    if (error || data?.ok !== true) {
      setMensaje({ tipo: 'error', texto: error?.message || data?.error || 'No se pudo guardar la configuración.' })
    } else {
      if (data.configuracion) {
        setConfig(normalizarConfiguracion(data.configuracion))
      }
      setMensaje({ tipo: 'correcto', texto: 'Configuración guardada y comprobada en Supabase.' })
    }
    setGuardando(false)
  }

  async function abrirMantenimiento(tipo) {
    setAccionMantenimiento(tipo)
    setResumenMantenimiento(null)
    setErrorMantenimiento('')
    setConfirmacionMantenimiento('')
    const { data, error } = await supabaseCampeonato.rpc(
      'admin_resumen_mantenimiento_campeonato',
      { p_codigo: codigo }
    )
    if (error || data?.ok !== true) {
      setErrorMantenimiento(error?.message || data?.error || 'No se pudo revisar el campeonato.')
      return
    }
    setResumenMantenimiento(data)
  }

  async function ejecutarMantenimiento() {
    if (confirmacionMantenimiento !== codigo) return
    setProcesandoMantenimiento(true)
    setErrorMantenimiento('')
    const funcion = accionMantenimiento === 'vaciar'
      ? 'admin_vaciar_datos_deportivos'
      : 'admin_eliminar_campeonato_definitivamente'
    const { data, error } = await supabaseCampeonato.rpc(funcion, {
      p_codigo: codigo,
      p_confirmacion: confirmacionMantenimiento,
    })
    setProcesandoMantenimiento(false)
    if (error || data?.ok !== true) {
      setErrorMantenimiento(error?.message || data?.error || 'No se pudo completar la operación.')
      return
    }
    setAccionMantenimiento(null)
    if (funcion === 'admin_eliminar_campeonato_definitivamente') {
      onCampeonatoEliminado()
      return
    }
    setConfig((actual) => ({ ...actual, estado_torneo: 'Inscripciones' }))
    setMensaje({ tipo: 'correcto', texto: `Datos deportivos eliminados. ${codigo} se conserva con su configuración e inscripciones.` })
  }

  if (cargando) {
    return <main className="app app-admin"><p className="estado">Cargando configuración…</p></main>
  }

  const esGrupos = config.tipo_campeonato === 'Grupos'

  return (
    <main className="app app-admin app-configuracion-campeonato">
      <section className="panel-admin panel-configuracion-campeonato">
        <header className="cabecera-admin cabecera-configuracion">
          <div>
            <p className="etiqueta">CAMPEONATO</p>
            <h2>Configuración</h2>
            <p className="descripcion-admin">{codigo} · Fuente maestra Supabase</p>
          </div>
          <div className="acciones-cabecera-configuracion">
            <button type="button" className="boton boton-secundario" onClick={onVolver}>← Gestión</button>
            <button type="button" className="boton boton-secundario" onClick={onResultados}>Partidos y resultados</button>
            <button type="button" className="boton boton-secundario" onClick={onPanelPrincipal}>Panel principal</button>
          </div>
        </header>

        <form className="formulario-configuracion" onSubmit={guardar}>
          <fieldset>
            <legend>Datos generales</legend>
            <div className="rejilla-configuracion">
              <Campo etiqueta="Identificador del campeonato"><input name="id_campeonato" value={config.id_campeonato} onChange={cambiar} required /></Campo>
              <Campo etiqueta="Nombre oficial"><input name="nombre_campeonato" value={config.nombre_campeonato} onChange={cambiar} required /></Campo>
              <Campo etiqueta="Año"><input type="number" min="2000" max="2100" name="anio_campeonato" value={config.anio_campeonato} onChange={cambiar} required /></Campo>
              <Campo etiqueta="Fecha"><input type="date" name="fecha_campeonato" value={config.fecha_campeonato || ''} onChange={cambiar} /></Campo>
              <Campo etiqueta="Lugar"><input name="lugar_campeonato" value={config.lugar_campeonato || ''} onChange={cambiar} /></Campo>
              <Campo etiqueta="Horario"><input name="horario_campeonato" value={config.horario_campeonato || ''} onChange={cambiar} /></Campo>
              <Campo etiqueta="Estado del torneo" ayuda="Controlará las pantallas visibles en la web pública.">
                <select name="estado_torneo" value={config.estado_torneo} onChange={cambiar}>
                  <option>Pretorneo</option><option>Inscripciones</option><option>En juego</option><option>Finalizado</option>
                </select>
              </Campo>
              <Campo etiqueta="Versión web"><input name="version_web" value={config.version_web || ''} onChange={cambiar} /></Campo>
            </div>
          </fieldset>

          <fieldset>
            <legend>Estructura del torneo</legend>
            <div className="rejilla-configuracion">
              <Campo etiqueta="Tipo de campeonato" ayuda="Elige — mientras el formato todavía no esté decidido."><select name="tipo_campeonato" value={config.tipo_campeonato || ''} onChange={cambiar}><option value="">—</option><option value="Liguilla">Liguilla</option><option value="Grupos">Grupos</option></select></Campo>
              <Campo etiqueta="Primera fase" ayuda={config.tipo_campeonato ? 'Las opciones dependen del tipo de campeonato.' : 'Primero elige el tipo de campeonato.'}>
                <select name="estructura_primera_fase" value={config.tipo_campeonato ? config.estructura_primera_fase : ''} onChange={cambiar} disabled={!esGrupos}>
                  {!config.tipo_campeonato && <option value="">—</option>}
                  {config.tipo_campeonato === 'Liguilla' && <option>Liguilla Única</option>}
                  {esGrupos && <><option>2 Grupos</option><option>4 Grupos</option></>}
                </select>
              </Campo>
              {esGrupos && <Campo etiqueta="Equipos previstos por grupo" ayuda="De momento todos los grupos deben tener el mismo número."><input type="number" min="2" name="equipos_por_grupo" value={config.equipos_por_grupo} onChange={cambiar} /></Campo>}
              <Campo etiqueta="Pistas disponibles"><input type="number" min="1" name="num_pistas_disponibles" value={config.num_pistas_disponibles} onChange={cambiar} /></Campo>
              <Campo etiqueta={esGrupos ? 'Equipos que pasan a eliminatorias por grupo' : 'Equipos que pasan a eliminatorias'}><input type="number" min="1" name="equipos_pasan_a_cruces_por_grupo" value={config.equipos_pasan_a_cruces_por_grupo} onChange={cambiar} /></Campo>
            </div>
            {esGrupos && (
              <div className="resumen-formato-especial">
                <strong>Vista previa del formato actual</strong>
                <span>{config.num_grupos_iniciales} grupos × {config.equipos_por_grupo || 0} equipos = {(config.num_grupos_iniciales || 0) * (config.equipos_por_grupo || 0)} plazas previstas.</span>
                <span>Pasan {(config.num_grupos_iniciales || 0) * (config.equipos_pasan_a_cruces_por_grupo || 0)} equipos a eliminatorias en total.</span>
                <small>Esta versión todavía requiere grupos iguales; no genera automáticamente un reparto 5 + 4.</small>
              </div>
            )}
            <label className="interruptor-configuracion"><input type="checkbox" name="hay_regrupos" checked={config.hay_regrupos} onChange={cambiar} /><span>Segunda fase por ReGrupos</span></label>
            {config.hay_regrupos && <div className="bloque-dependiente"><div className="rejilla-configuracion"><Campo etiqueta="Equipos que pasan por grupo"><input type="number" min="2" name="equipos_pasan_a_regrupos" value={config.equipos_pasan_a_regrupos} onChange={cambiar} /></Campo><Campo etiqueta="Puntos por victoria arrastrada"><input type="number" min="0" name="puntos_partido_arrastrado" value={config.puntos_partido_arrastrado} onChange={cambiar} /></Campo></div><label className="interruptor-configuracion"><input type="checkbox" name="repetir_enfrentamientos_regrupos" checked={config.repetir_enfrentamientos_regrupos} onChange={cambiar} /><span>Repetir en ReGrupos los enfrentamientos ya jugados</span></label><small className="ayuda-regrupos">Si no se repiten, el partido anterior se arrastra al nuevo ReGrupo y no se duplica.</small></div>}
          </fieldset>

          <fieldset>
            <legend>Eliminatorias</legend>
            <div className="rejilla-configuracion">
              <Campo etiqueta="Formato de acceso">
                <select name="formato_acceso_eliminatorias" value={config.formato_acceso_eliminatorias} onChange={cambiar}>
                  <option>Cruces normales</option>
                  <option>Campeones de ReGrupo directos a semifinales</option>
                </select>
              </Campo>
              <Campo etiqueta="Ronda inicial" ayuda="Elige — mientras todavía no esté decidida."><select name="ronda_inicial_eliminatorias" value={config.ronda_inicial_eliminatorias || ''} onChange={cambiar}><option value="">—</option><option>Octavos</option><option>Cuartos</option><option>Semifinales</option><option>Final</option></select></Campo>
              <Campo etiqueta="Criterio de cruces"><select name="criterio_generar_cruces" value={config.criterio_generar_cruces} onChange={cambiar}><option>Por Clasificación</option><option>No Enfrentados</option></select></Campo>
            </div>
            {config.formato_acceso_eliminatorias === 'Campeones de ReGrupo directos a semifinales' && (
              <div className="resumen-formato-especial">
                <strong>Formato especial de ReGrupos</strong>
                <span>Los campeones pasan directamente a semifinales. Los segundos y terceros juegan cuartos cruzados.</span>
                <span>Si activas Palas de Playa, la disputan los cuartos clasificados y los perdedores de esos cuartos.</span>
              </div>
            )}
            <div className="rejilla-configuracion">
              <Campo etiqueta="¿Hay Copa Palas de Playa?" ayuda="Elige — mientras todavía no esté decidido.">
                <select
                  name="hay_copa_palas_playa"
                  value={config.hay_copa_palas_playa === true ? 'si' : config.hay_copa_palas_playa === false ? 'no' : ''}
                  onChange={(evento) => {
                    const valor = evento.target.value
                    setConfig((actual) => ({
                      ...actual,
                      hay_copa_palas_playa: valor === 'si' ? true : valor === 'no' ? false : '',
                    }))
                  }}
                >
                  <option value="">—</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </Campo>
            </div>
            {config.hay_copa_palas_playa === true && <div className="rejilla-configuracion bloque-dependiente"><Campo etiqueta="Desde la posición"><input type="number" min="1" name="posicion_inicio_palas_playa" value={config.posicion_inicio_palas_playa} onChange={cambiar} /></Campo><Campo etiqueta="Criterio Palas de Playa"><select name="criterio_palas_playa" value={config.criterio_palas_playa} onChange={cambiar}><option>Por Clasificación</option><option>No Enfrentados</option></select></Campo></div>}
          </fieldset>

          <fieldset>
            <legend>Reglas de juego y clasificación</legend>
            <div className="rejilla-configuracion">
              <Campo etiqueta="Puntos objetivo del set"><input type="number" min="1" name="puntos_objetivo_set" value={config.puntos_objetivo_set} onChange={cambiar} /></Campo>
              <Campo etiqueta="Puntos máximos del set"><input type="number" min={config.puntos_objetivo_set || 1} name="puntos_maximos_por_set" value={config.puntos_maximos_por_set} onChange={cambiar} /></Campo>
              <div className="campo-sistema-puntuacion">
                <Campo etiqueta="Sistema de puntuación"><select name="sistema_puntuacion" value={config.sistema_puntuacion} onChange={cambiar}><option>Normal</option><option>Equitativo</option><option>Competitivo</option></select></Campo>
                <button
                  type="button"
                  className="boton-configurar-puntuacion"
                  aria-expanded={mostrarPuntuaciones}
                  onClick={() => {
                    setSistemaPuntuacionEditado(config.sistema_puntuacion)
                    setMostrarPuntuaciones((visible) => !visible)
                  }}
                >
                  ⚙ Configurar puntos
                </button>
              </div>
              {config.tipo_campeonato === 'Liguilla' && <><Campo etiqueta="Ordenar clasificación"><input name="ordenar_clasificacion" value={config.ordenar_clasificacion || ''} onChange={cambiar} placeholder="Sin definir" /></Campo><Campo etiqueta="Generación de jornadas"><input name="modo_generar_jornadas" value={config.modo_generar_jornadas || ''} onChange={cambiar} placeholder="Sin definir" /></Campo></>}
            </div>
            {mostrarPuntuaciones && (
              <div className="configurador-puntuaciones">
                <div className="cabecera-configurador-puntuaciones">
                  <div>
                    <strong>Puntuación por resultado</strong>
                    <small>Estos valores se guardan únicamente para este campeonato.</small>
                  </div>
                  <select value={sistemaPuntuacionEditado} onChange={(evento) => setSistemaPuntuacionEditado(evento.target.value)}>
                    <option>Normal</option>
                    <option>Equitativo</option>
                    <option>Competitivo</option>
                  </select>
                </div>
                <div className="rejilla-puntuaciones">
                  <Campo etiqueta="Ganador 3–0 (o 2–0)"><input type="number" min="0" step="1" name="ganador_3_0" value={config.sistemas_puntuacion[sistemaPuntuacionEditado].ganador_3_0} onChange={cambiarPuntuacion} /></Campo>
                  <Campo etiqueta="Ganador 2–1"><input type="number" min="0" step="1" name="ganador_2_1" value={config.sistemas_puntuacion[sistemaPuntuacionEditado].ganador_2_1} onChange={cambiarPuntuacion} /></Campo>
                  <Campo etiqueta="Perdedor 1–2"><input type="number" min="0" step="1" name="perdedor_1_2" value={config.sistemas_puntuacion[sistemaPuntuacionEditado].perdedor_1_2} onChange={cambiarPuntuacion} /></Campo>
                  <Campo etiqueta="Perdedor 0–3 (o 0–2)"><input type="number" min="0" step="1" name="perdedor_0_3" value={config.sistemas_puntuacion[sistemaPuntuacionEditado].perdedor_0_3} onChange={cambiarPuntuacion} /></Campo>
                  <Campo etiqueta="Descanso"><input type="number" min="0" step="1" name="descanso" value={config.sistemas_puntuacion[sistemaPuntuacionEditado].descanso} onChange={cambiarPuntuacion} /></Campo>
                </div>
                <p className="aviso-sistema-activo">Sistema aplicado actualmente: <strong>{config.sistema_puntuacion}</strong></p>
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend>Contenido de la web</legend>
            <Campo etiqueta="URL de inscripción"><input type="url" name="url_inscripcion" value={config.url_inscripcion || ''} onChange={cambiar} /></Campo>
            <div className="interruptores-web">
              {[
                ['mostrar_ranking_historico', 'Ranking histórico'], ['mostrar_estadisticas', 'Estadísticas'],
                ['mostrar_fotos', 'Fotos'], ['mostrar_normativa', 'Normativa'],
                ['mostrar_historia', 'Historia'], ['mostrar_campeones', 'Campeones'],
              ].map(([campo, texto]) => <label className="interruptor-configuracion" key={campo}><input type="checkbox" name={campo} checked={config[campo]} onChange={cambiar} /><span>Mostrar {texto}</span></label>)}
            </div>
          </fieldset>

          <fieldset>
            <legend>Aviso de próxima edición</legend>
            <label className="interruptor-configuracion"><input type="checkbox" name="mostrar_aviso_proxima_edicion" checked={config.mostrar_aviso_proxima_edicion} onChange={cambiar} /><span>Mostrar aviso</span></label>
            {config.mostrar_aviso_proxima_edicion && <div className="campos-texto-configuracion bloque-dependiente"><Campo etiqueta="Título"><input name="titulo_aviso_proxima_edicion" value={config.titulo_aviso_proxima_edicion || ''} onChange={cambiar} /></Campo><Campo etiqueta="Texto corto"><textarea name="texto_corto_aviso_proxima_edicion" value={config.texto_corto_aviso_proxima_edicion || ''} onChange={cambiar} rows="2" /></Campo><Campo etiqueta="Texto ampliado"><textarea name="texto_ampliado_aviso_proxima_edicion" value={config.texto_ampliado_aviso_proxima_edicion || ''} onChange={cambiar} rows="6" /></Campo></div>}
          </fieldset>

          <fieldset className="mantenimiento-configuracion">
            <legend>Mantenimiento de la web</legend>
            <label className="interruptor-configuracion"><input type="checkbox" name="modo_mantenimiento" checked={config.modo_mantenimiento} onChange={cambiar} /><span>Ocultar la web al público</span></label>
            {config.modo_mantenimiento && <div className="campos-texto-configuracion bloque-dependiente"><Campo etiqueta="Título"><input name="titulo_mantenimiento" value={config.titulo_mantenimiento || ''} onChange={cambiar} /></Campo><Campo etiqueta="Mensaje"><textarea name="mensaje_mantenimiento" value={config.mensaje_mantenimiento || ''} onChange={cambiar} rows="3" /></Campo></div>}
          </fieldset>

          <fieldset className="zona-peligro-campeonato">
            <legend>Mantenimiento del campeonato</legend>
            <p>Estas acciones eliminan datos de Supabase. Los jugadores generales y sus códigos Jxxx se conservan.</p>
            <div className="acciones-mantenimiento-campeonato">
              <div>
                <strong>Vaciar datos deportivos</strong>
                <span>Borra equipos, partidos, resultados, clasificaciones, Histórico e ISP de esta edición. Conserva el campeonato, su configuración, solicitudes e inscripciones.</span>
                <button type="button" className="boton boton-advertencia" onClick={() => abrirMantenimiento('vaciar')}>Vaciar datos deportivos</button>
              </div>
              <div>
                <strong>Eliminar campeonato definitivamente</strong>
                <span>Borra toda la edición, incluidas configuración, solicitudes e inscripciones. No deja datos del campeonato en Histórico ni en ISP.</span>
                <button type="button" className="boton boton-peligro" onClick={() => abrirMantenimiento('eliminar')}>Eliminar campeonato</button>
              </div>
            </div>
          </fieldset>

          {mensaje && <p className={`mensaje-configuracion ${mensaje.tipo}`}>{mensaje.texto}</p>}
          <div className="barra-guardar-configuracion"><span>Al guardar, Supabase será la fuente maestra y Excel no podrá sobrescribir estos valores.</span><button className="boton boton-principal" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar configuración'}</button></div>
        </form>
      </section>
      {accionMantenimiento && (
        <div className="fondo-modal-mantenimiento" role="presentation" onMouseDown={() => !procesandoMantenimiento && setAccionMantenimiento(null)}>
          <div className="modal-mantenimiento-campeonato" role="dialog" aria-modal="true" aria-labelledby="titulo-mantenimiento-campeonato" onMouseDown={(evento) => evento.stopPropagation()}>
            <span className="icono-peligro">!</span>
            <h3 id="titulo-mantenimiento-campeonato">{accionMantenimiento === 'vaciar' ? 'Vaciar datos deportivos' : 'Eliminar campeonato definitivamente'}</h3>
            {errorMantenimiento ? <p className="error-modal-mantenimiento">{errorMantenimiento}</p> : !resumenMantenimiento ? <p>Revisando los datos relacionados…</p> : <>
              <p>{accionMantenimiento === 'vaciar' ? `Se conservarán la configuración y las ${resumenMantenimiento.inscripciones} inscripciones.` : 'Esta edición desaparecerá completamente y no podrá recuperarse.'}</p>
              <dl className="resumen-borrado">
                <div><dt>Equipos</dt><dd>{resumenMantenimiento.equipos}</dd></div>
                <div><dt>Partidos</dt><dd>{resumenMantenimiento.partidos}</dd></div>
                <div><dt>Sets</dt><dd>{resumenMantenimiento.sets}</dd></div>
                <div><dt>Clasificaciones</dt><dd>{resumenMantenimiento.clasificaciones}</dd></div>
                <div><dt>Histórico</dt><dd>{resumenMantenimiento.ranking_historico}</dd></div>
                <div><dt>ISP</dt><dd>{resumenMantenimiento.isp_partidos}</dd></div>
                {accionMantenimiento === 'eliminar' && <><div><dt>Inscripciones</dt><dd>{resumenMantenimiento.inscripciones}</dd></div><div><dt>Solicitudes</dt><dd>{resumenMantenimiento.solicitudes}</dd></div></>}
              </dl>
              <label className="confirmacion-escrita"><span>Para confirmar, escribe <b>{codigo}</b></span><input value={confirmacionMantenimiento} onChange={(evento) => setConfirmacionMantenimiento(evento.target.value)} autoComplete="off" /></label>
            </>}
            <div className="botones-modal-mantenimiento"><button type="button" className="boton boton-secundario" onClick={() => setAccionMantenimiento(null)} disabled={procesandoMantenimiento}>Cancelar</button><button type="button" className={`boton ${accionMantenimiento === 'vaciar' ? 'boton-advertencia' : 'boton-peligro'}`} onClick={ejecutarMantenimiento} disabled={!resumenMantenimiento || confirmacionMantenimiento !== codigo || procesandoMantenimiento}>{procesandoMantenimiento ? 'Procesando…' : accionMantenimiento === 'vaciar' ? 'Vaciar definitivamente' : 'Eliminar definitivamente'}</button></div>
          </div>
        </div>
      )}
    </main>
  )
}


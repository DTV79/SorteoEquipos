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
  ordenar_clasificacion: 'A',
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
  config.ordenar_clasificacion = ['A', 'B', 'C'].includes(config.ordenar_clasificacion)
    ? config.ordenar_clasificacion
    : 'A'
  config.modo_generar_jornadas = ['Suizo', 'Aleatorio'].includes(config.modo_generar_jornadas)
    ? config.modo_generar_jornadas
    : ''

  // Corrige combinaciones antiguas o incompletas sin eliminar la opción «—».
  if (config.tipo_campeonato === 'Liguilla') {
    config.estructura_primera_fase = 'Liguilla Única'
    config.num_grupos_iniciales = 1
    config.hay_regrupos = false
    config.repetir_enfrentamientos_regrupos = false
    if (config.formato_acceso_eliminatorias === 'Campeones de ReGrupo directos a semifinales') {
      config.formato_acceso_eliminatorias = 'Cruces normales'
    }
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
  const [borrarEquiposMantenimiento, setBorrarEquiposMantenimiento] = useState(false)
  const [procesandoMantenimiento, setProcesandoMantenimiento] = useState(false)
  const [mostrarPuntuaciones, setMostrarPuntuaciones] = useState(false)
  const [sistemaPuntuacionEditado, setSistemaPuntuacionEditado] = useState('Competitivo')
  const [mostrarInfoClasificacion, setMostrarInfoClasificacion] = useState(false)
  const [previsualizacionPrimeraFase, setPrevisualizacionPrimeraFase] = useState(null)
  const [previsualizandoPrimeraFase, setPrevisualizandoPrimeraFase] = useState(false)
  const [generandoPrimeraFase, setGenerandoPrimeraFase] = useState(false)
  const [errorPrimeraFase, setErrorPrimeraFase] = useState('')
  const [previsualizacionRegrupos, setPrevisualizacionRegrupos] = useState(null)
  const [previsualizandoRegrupos, setPrevisualizandoRegrupos] = useState(false)
  const [generandoRegrupos, setGenerandoRegrupos] = useState(false)
  const [errorRegrupos, setErrorRegrupos] = useState('')
  const [previsualizacionEliminatorias, setPrevisualizacionEliminatorias] = useState(null)
  const [previsualizandoEliminatorias, setPrevisualizandoEliminatorias] = useState(false)
  const [generandoEliminatorias, setGenerandoEliminatorias] = useState(false)
  const [errorEliminatorias, setErrorEliminatorias] = useState('')
  const [previsualizacionPalas, setPrevisualizacionPalas] = useState(null)
  const [previsualizandoPalas, setPrevisualizandoPalas] = useState(false)
  const [generandoPalas, setGenerandoPalas] = useState(false)
  const [errorPalas, setErrorPalas] = useState('')
  const [hayCambiosSinGuardar, setHayCambiosSinGuardar] = useState(false)

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
        setHayCambiosSinGuardar(false)
      }
      setCargando(false)
    }

    cargar()
    return () => { cancelado = true }
  }, [codigo])

  function marcarConfiguracionModificada() {
    setHayCambiosSinGuardar(true)
    setPrevisualizacionPrimeraFase(null)
    setPrevisualizacionRegrupos(null)
    setPrevisualizacionEliminatorias(null)
    setPrevisualizacionPalas(null)
  }

  function cambiar(evento) {
    marcarConfiguracionModificada()
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
          siguiente.hay_regrupos = false
          siguiente.repetir_enfrentamientos_regrupos = false
          if (actual.formato_acceso_eliminatorias === 'Campeones de ReGrupo directos a semifinales') {
            siguiente.formato_acceso_eliminatorias = 'Cruces normales'
          }
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
      if (name === 'equipos_por_grupo' && nuevoValor !== '') {
        const capacidad = Math.max(2, Number(nuevoValor))
        siguiente.equipos_pasan_a_regrupos = Math.min(Number(actual.equipos_pasan_a_regrupos || capacidad), capacidad)
        siguiente.equipos_pasan_a_cruces_por_grupo = Math.min(Number(actual.equipos_pasan_a_cruces_por_grupo || capacidad), capacidad)
      }
      if (name === 'equipos_pasan_a_regrupos' && nuevoValor !== '' && Number(nuevoValor) > Number(actual.equipos_por_grupo)) {
        siguiente.equipos_pasan_a_regrupos = Number(actual.equipos_por_grupo)
      }
      if (name === 'equipos_pasan_a_cruces_por_grupo' && actual.tipo_campeonato === 'Grupos' && nuevoValor !== '' && Number(nuevoValor) > Number(actual.equipos_por_grupo)) {
        siguiente.equipos_pasan_a_cruces_por_grupo = Number(actual.equipos_por_grupo)
      }
      if (name === 'hay_regrupos' && !checked) {
        siguiente.repetir_enfrentamientos_regrupos = false
        if (actual.formato_acceso_eliminatorias === 'Campeones de ReGrupo directos a semifinales') {
          siguiente.formato_acceso_eliminatorias = 'Cruces normales'
        }
      }
      if (name === 'repetir_enfrentamientos_regrupos' && checked) {
        siguiente.puntos_partido_arrastrado = 0
      }
      if (name === 'puntos_objetivo_set' && nuevoValor !== '' && Number(actual.puntos_maximos_por_set) < Number(nuevoValor)) {
        siguiente.puntos_maximos_por_set = Number(nuevoValor)
      }
      if (name === 'puntos_maximos_por_set' && nuevoValor !== '' && Number(nuevoValor) < Number(actual.puntos_objetivo_set)) {
        siguiente.puntos_maximos_por_set = Number(actual.puntos_objetivo_set)
      }
      return siguiente
    })
  }

  function cambiarPuntuacion(evento) {
    marcarConfiguracionModificada()
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

  async function cambiarEstadoTorneo(evento) {
    const estadoAnterior = config.estado_torneo
    const nuevoEstado = evento.target.value
    setConfig((actual) => ({ ...actual, estado_torneo: nuevoEstado }))
    setMensaje({ tipo: '', texto: 'Actualizando estado del torneo…' })

    const { data, error } = await supabaseCampeonato.rpc(
      'admin_guardar_estado_torneo',
      { p_codigo: codigo, p_estado: nuevoEstado }
    )

    if (error || data?.ok !== true) {
      setConfig((actual) => ({ ...actual, estado_torneo: estadoAnterior }))
      setMensaje({ tipo: 'error', texto: error?.message || data?.error || 'No se pudo actualizar el estado del torneo.' })
      return
    }

    setConfig((actual) => ({ ...actual, estado_torneo: data.estado_torneo || nuevoEstado }))
    setMensaje({ tipo: 'correcto', texto: `Estado actualizado a «${data.estado_torneo || nuevoEstado}». La web pública ya leerá este estado.` })
  }

  async function cambiarCriterioClasificacion(evento) {
    const criterioAnterior = config.ordenar_clasificacion
    const nuevoCriterio = evento.target.value
    setConfig((actual) => ({ ...actual, ordenar_clasificacion: nuevoCriterio }))
    setMensaje({ tipo: '', texto: `Guardando criterio ${nuevoCriterio} y recalculando la clasificación…` })

    const { data, error } = await supabaseCampeonato.rpc(
      'admin_guardar_criterio_clasificacion',
      { p_codigo: codigo, p_criterio: nuevoCriterio }
    )

    if (error || data?.ok !== true) {
      setConfig((actual) => ({ ...actual, ordenar_clasificacion: criterioAnterior }))
      setMensaje({ tipo: 'error', texto: error?.message || data?.error || 'No se pudo actualizar el criterio de clasificación.' })
      return
    }

    const criterioConfirmado = data.criterio || nuevoCriterio
    setConfig((actual) => ({ ...actual, ordenar_clasificacion: criterioConfirmado }))
    setMensaje({ tipo: 'correcto', texto: `Criterio ${criterioConfirmado} guardado. La clasificación y la web pública ya utilizan esta opción.` })
  }

  async function guardar(evento) {
    evento.preventDefault()
    setGuardando(true)
    setMensaje({ tipo: '', texto: 'Guardando configuración…' })

    const configuracionAGuardar = config.tipo_campeonato === 'Liguilla'
      ? { ...config, hay_regrupos: false, repetir_enfrentamientos_regrupos: false }
      : config

    const { data, error } = await supabaseCampeonato.rpc(
      'admin_guardar_configuracion',
      { p_codigo: codigo, p_configuracion: configuracionAGuardar }
    )

    if (error || data?.ok !== true) {
      setMensaje({ tipo: 'error', texto: error?.message || data?.error || 'No se pudo guardar la configuración.' })
    } else {
      if (data.configuracion) {
        setConfig(normalizarConfiguracion(data.configuracion))
      }
      setHayCambiosSinGuardar(false)
      setPrevisualizacionEliminatorias(null)
      setPrevisualizacionPalas(null)
      setMensaje({ tipo: 'correcto', texto: 'Configuración guardada y comprobada en Supabase.' })
    }
    setGuardando(false)
  }

  async function previsualizarPrimeraFase() {
    setPrevisualizandoPrimeraFase(true)
    setErrorPrimeraFase('')
    setPrevisualizacionPrimeraFase(null)
    const { data, error } = await supabaseCampeonato.rpc('admin_previsualizar_primera_fase', { p_codigo: codigo })
    setPrevisualizandoPrimeraFase(false)
    if (error || data?.ok !== true) {
      setErrorPrimeraFase(error?.message || data?.error || 'No se pudo preparar la primera fase.')
      return
    }
    setPrevisualizacionPrimeraFase(data)
  }

  async function generarPrimeraFase() {
    if (!previsualizacionPrimeraFase) return
    setGenerandoPrimeraFase(true)
    setErrorPrimeraFase('')
    const { data, error } = await supabaseCampeonato.rpc('admin_generar_primera_fase', { p_codigo: codigo })
    setGenerandoPrimeraFase(false)
    if (error || data?.ok !== true) {
      setErrorPrimeraFase(error?.message || data?.error || 'No se pudo generar la primera fase.')
      return
    }
    setPrevisualizacionPrimeraFase(null)
    setMensaje({ tipo: 'correcto', texto: data?.mensaje || 'Primera fase generada correctamente.' })
  }

  async function previsualizarRegrupos() {
    setPrevisualizandoRegrupos(true)
    setErrorRegrupos('')
    setPrevisualizacionRegrupos(null)
    const { data, error } = await supabaseCampeonato.rpc('admin_previsualizar_regrupos', { p_codigo: codigo })
    setPrevisualizandoRegrupos(false)
    if (error || data?.ok !== true) {
      setErrorRegrupos(error?.message || data?.error || 'No se pudieron preparar los ReGrupos.')
      return
    }
    setPrevisualizacionRegrupos(data)
  }

  async function generarRegrupos() {
    if (!previsualizacionRegrupos) return
    setGenerandoRegrupos(true)
    setErrorRegrupos('')
    const { data, error } = await supabaseCampeonato.rpc('admin_generar_regrupos', { p_codigo: codigo })
    setGenerandoRegrupos(false)
    if (error || data?.ok !== true) {
      setErrorRegrupos(error?.message || data?.error || 'No se pudieron generar los ReGrupos.')
      return
    }
    setPrevisualizacionRegrupos(null)
    setMensaje({ tipo: 'correcto', texto: `ReGrupos generados: ${data.partidos_nuevos ?? 0} partidos nuevos y ${data.partidos_arrastrados ?? 0} arrastrados.` })
  }

  async function previsualizarEliminatorias() {
    if (hayCambiosSinGuardar) return
    setPrevisualizandoEliminatorias(true)
    setErrorEliminatorias('')
    setPrevisualizacionEliminatorias(null)
    const { data, error } = await supabaseCampeonato.rpc('admin_previsualizar_eliminatorias', { p_codigo: codigo })
    setPrevisualizandoEliminatorias(false)
    if (error || data?.ok !== true) { setErrorEliminatorias(error?.message || data?.error || 'No se pudieron preparar las eliminatorias.'); return }
    setPrevisualizacionEliminatorias(data)
  }

  async function generarEliminatorias() {
    if (!previsualizacionEliminatorias?.puede_generar || hayCambiosSinGuardar) return
    setGenerandoEliminatorias(true); setErrorEliminatorias('')
    const { data, error } = await supabaseCampeonato.rpc('admin_generar_cuadro_normal', { p_codigo: codigo })
    setGenerandoEliminatorias(false)
    if (error || data?.ok !== true) { setErrorEliminatorias(error?.message || data?.error || 'No se pudieron generar las eliminatorias.'); return }
    setPrevisualizacionEliminatorias(null)
    setMensaje({ tipo: 'correcto', texto: data?.mensaje || `Eliminatorias generadas desde ${config.ronda_inicial_eliminatorias}.` })
  }

  async function previsualizarPalas() {
    if (hayCambiosSinGuardar) return
    setPrevisualizandoPalas(true)
    setErrorPalas('')
    setPrevisualizacionPalas(null)
    const { data, error } = await supabaseCampeonato.rpc('admin_previsualizar_palas_playa', { p_codigo: codigo })
    setPrevisualizandoPalas(false)
    if (error || data?.ok !== true) { setErrorPalas(error?.message || data?.error || 'No se pudo preparar Palas de Playa.'); return }
    setPrevisualizacionPalas(data)
  }

  async function generarPalas() {
    if (!previsualizacionPalas?.puede_generar || hayCambiosSinGuardar) return
    setGenerandoPalas(true)
    setErrorPalas('')
    const { data, error } = await supabaseCampeonato.rpc('admin_generar_palas_playa', { p_codigo: codigo })
    setGenerandoPalas(false)
    if (error || data?.ok !== true) { setErrorPalas(error?.message || data?.error || 'No se pudo generar Palas de Playa.'); return }
    setPrevisualizacionPalas(null)
    setMensaje({ tipo: 'correcto', texto: `Palas de Playa generada: ${data.partidos_creados ?? 0} partidos iniciales.` })
  }

  async function abrirMantenimiento(tipo) {
    setAccionMantenimiento(tipo)
    setResumenMantenimiento(null)
    setErrorMantenimiento('')
    setConfirmacionMantenimiento('')
    setBorrarEquiposMantenimiento(false)
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
    const parametros = {
      p_codigo: codigo,
      p_confirmacion: confirmacionMantenimiento,
      ...(accionMantenimiento === 'vaciar'
        ? { p_borrar_equipos: borrarEquiposMantenimiento }
        : {}),
    }
    const { data, error } = await supabaseCampeonato.rpc(funcion, parametros)
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
    setMensaje({
      tipo: 'correcto',
      texto: borrarEquiposMantenimiento
        ? `Datos deportivos y equipos eliminados. ${codigo} conserva su configuración e inscripciones.`
        : `Datos deportivos eliminados. Se conservan los equipos, la configuración y las inscripciones de ${codigo}.`,
    })
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
                <select name="estado_torneo" value={config.estado_torneo} onChange={cambiarEstadoTorneo}>
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
              <Campo etiqueta={esGrupos ? 'Equipos que pasan a eliminatorias por grupo' : 'Equipos que pasan a eliminatorias'}><input type="number" min="1" max={esGrupos ? config.equipos_por_grupo || undefined : undefined} name="equipos_pasan_a_cruces_por_grupo" value={config.equipos_pasan_a_cruces_por_grupo} onChange={cambiar} /></Campo>
            </div>
            {esGrupos && (
              <div className="resumen-formato-especial">
                <strong>Vista previa del formato actual</strong>
                <span>{config.num_grupos_iniciales} grupos × {config.equipos_por_grupo || 0} equipos = {(config.num_grupos_iniciales || 0) * (config.equipos_por_grupo || 0)} plazas previstas.</span>
                <span>Pasan {(config.num_grupos_iniciales || 0) * (config.equipos_pasan_a_cruces_por_grupo || 0)} equipos a eliminatorias en total.</span>
                <small>Esta versión todavía requiere grupos iguales; no genera automáticamente un reparto 5 + 4.</small>
              </div>
            )}
            <label className={`interruptor-configuracion${!esGrupos ? ' desactivado' : ''}`}>
              <input type="checkbox" name="hay_regrupos" checked={esGrupos && config.hay_regrupos} onChange={cambiar} disabled={!esGrupos} />
              <span>Segunda fase por ReGrupos</span>
            </label>
            {!esGrupos && <small className="ayuda-campo-desactivado">Solo está disponible en campeonatos por Grupos.</small>}
            {esGrupos && config.hay_regrupos && <div className="bloque-dependiente"><div className="rejilla-configuracion"><Campo etiqueta="Equipos que pasan por grupo"><input type="number" min="2" max={config.equipos_por_grupo || undefined} name="equipos_pasan_a_regrupos" value={config.equipos_pasan_a_regrupos} onChange={cambiar} /></Campo><Campo etiqueta="Puntos por victoria arrastrada" ayuda={config.repetir_enfrentamientos_regrupos ? 'Al repetir todos los partidos, no se arrastran puntos.' : 'Se aplica al enfrentamiento anterior que no se vuelve a jugar.'}><input type="number" min="0" name="puntos_partido_arrastrado" value={config.repetir_enfrentamientos_regrupos ? 0 : config.puntos_partido_arrastrado} onChange={cambiar} disabled={config.repetir_enfrentamientos_regrupos} /></Campo></div><label className="interruptor-configuracion"><input type="checkbox" name="repetir_enfrentamientos_regrupos" checked={config.repetir_enfrentamientos_regrupos} onChange={cambiar} /><span>Repetir en ReGrupos los enfrentamientos ya jugados</span></label><small className="ayuda-regrupos">Si no se repiten, el partido anterior se arrastra al nuevo ReGrupo y no se duplica.</small></div>}
          </fieldset>

          <fieldset>
            <legend>Eliminatorias</legend>
            <div className="rejilla-configuracion">
              <Campo etiqueta="Formato de acceso" ayuda={!config.hay_regrupos ? 'El acceso especial solo está disponible cuando hay ReGrupos.' : 'Define cómo se enlazan ReGrupos y eliminatorias.'}>
                <select name="formato_acceso_eliminatorias" value={config.formato_acceso_eliminatorias} onChange={cambiar}>
                  <option>Cruces normales</option>
                  <option disabled={!config.hay_regrupos}>Campeones de ReGrupo directos a semifinales</option>
                </select>
              </Campo>
              <Campo etiqueta="Ronda inicial" ayuda="Elige — mientras todavía no esté decidida."><select name="ronda_inicial_eliminatorias" value={config.ronda_inicial_eliminatorias || ''} onChange={cambiar}><option value="">—</option><option>Octavos</option><option>Cuartos</option><option>Semifinales</option><option>Final</option></select></Campo>
              <Campo etiqueta={<span className="etiqueta-con-info">Criterio de cruces <span className="info-criterio" tabIndex="0" role="button" aria-label="Información sobre los criterios de cruces">i<span className="info-criterio-texto"><strong>Por Clasificación:</strong> enfrenta al mejor clasificado disponible con el peor, segundo mejor con segundo peor, etc.<br /><br /><strong>No Enfrentados:</strong> prioriza emparejamientos entre equipos que todavía no hayan jugado entre sí; solo repite cuando no sea posible evitarlo.<br /><br /><strong>Aleatorio:</strong> realiza un sorteo completamente aleatorio entre los equipos disponibles, sin utilizar la clasificación ni los enfrentamientos anteriores.</span></span></span>}><select name="criterio_generar_cruces" value={config.criterio_generar_cruces} onChange={cambiar}><option>Por Clasificación</option><option>No Enfrentados</option><option>Aleatorio</option></select></Campo>
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
                    marcarConfiguracionModificada()
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
            {config.hay_copa_palas_playa === true && <div className="rejilla-configuracion bloque-dependiente">
              <Campo
                etiqueta="Desde la posición"
                ayuda={config.tipo_campeonato === 'Liguilla'
                  ? 'Desde esta posición hasta el último clasificado disputarán Palas de Playa.'
                  : 'En Grupos/ReGrupos los participantes se determinan automáticamente por el formato.'}
              >
                <input
                  type="number"
                  min="1"
                  name="posicion_inicio_palas_playa"
                  value={config.tipo_campeonato === 'Liguilla' ? config.posicion_inicio_palas_playa : ''}
                  placeholder="—"
                  onChange={cambiar}
                  disabled={config.tipo_campeonato !== 'Liguilla'}
                />
              </Campo>
              <Campo etiqueta="Criterio Palas de Playa" ayuda="Se aplica tanto en Liguilla como en Grupos/ReGrupos.">
                <select name="criterio_palas_playa" value={config.criterio_palas_playa} onChange={cambiar}>
                  <option>Por Clasificación</option><option>No Enfrentados</option>
                </select>
              </Campo>
            </div>}
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
              {['Liguilla', 'Grupos'].includes(config.tipo_campeonato) && (
                <div className="campo-configuracion">
                  <div className="etiqueta-con-informacion">
                    <span>Ordenar clasificación</span>
                    <button
                      type="button"
                      className="boton-informacion-campo"
                      aria-label="Explicar los criterios de ordenación"
                      onClick={() => setMostrarInfoClasificacion(true)}
                    >i</button>
                  </div>
                  <select name="ordenar_clasificacion" value={config.ordenar_clasificacion} onChange={cambiarCriterioClasificacion} disabled={guardando}>
                    <option value="A">A · Puntos y rendimiento proporcional</option>
                    <option value="B">B · Puntos y mayor participación</option>
                    <option value="C">C · Eficacia real por partido</option>
                  </select>
                  <small>
                    {config.tipo_campeonato === 'Grupos'
                      ? 'Se aplica por separado dentro de cada Grupo y, si están activos, también en cada ReGrupo.'
                      : 'Se aplica al recalcular la tabla y al preparar la siguiente jornada.'}
                  </small>
                </div>
              )}
              {config.tipo_campeonato === 'Liguilla' && (
                <Campo etiqueta="Generación de jornadas" ayuda="La primera jornada siempre es aleatoria. Esta opción decide cómo se crean las siguientes.">
                  <select name="modo_generar_jornadas" value={config.modo_generar_jornadas || ''} onChange={cambiar}>
                    <option value="">— Sin definir</option>
                    <option value="Suizo">Sistema suizo</option>
                    <option value="Aleatorio">Aleatorio sin repetir</option>
                  </select>
                </Campo>
              )}
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

          <fieldset className="generacion-primera-fase">
            <legend>Generación de la competición</legend>
            <p>La configuración guardada decide cómo se crea la primera fase. La previsualización no crea ni modifica partidos.</p>
            <button type="button" className="boton boton-secundario" onClick={previsualizarPrimeraFase} disabled={previsualizandoPrimeraFase || generandoPrimeraFase || !config.tipo_campeonato || hayCambiosSinGuardar}>
              {previsualizandoPrimeraFase ? 'Comprobando…' : 'Previsualizar primera fase'}
            </button>
            {!config.tipo_campeonato && <small className="ayuda-generacion-primera-fase">Define y guarda primero si el campeonato será Liguilla o Grupos.</small>}
            {errorPrimeraFase && <p className="error-generacion-primera-fase">{errorPrimeraFase}</p>}
            {previsualizacionPrimeraFase && (
              <div className="resumen-generacion-primera-fase">
                <strong>Previsualización · {previsualizacionPrimeraFase.tipo || previsualizacionPrimeraFase.tipo_campeonato || config.tipo_campeonato}</strong>
                {previsualizacionPrimeraFase.mensaje && <span>{previsualizacionPrimeraFase.mensaje}</span>}
                <span>Equipos: {previsualizacionPrimeraFase.equipos ?? previsualizacionPrimeraFase.total_equipos ?? 0}</span>
                <span>Pistas disponibles: {previsualizacionPrimeraFase.pistas ?? config.num_pistas_disponibles}</span>
                {previsualizacionPrimeraFase.num_grupos != null && <span>Grupos: {previsualizacionPrimeraFase.num_grupos}</span>}
                {(previsualizacionPrimeraFase.partidos ?? previsualizacionPrimeraFase.partidos_previstos) != null && <span>Partidos previstos: {previsualizacionPrimeraFase.partidos ?? previsualizacionPrimeraFase.partidos_previstos}</span>}
                {(previsualizacionPrimeraFase.jornadas ?? previsualizacionPrimeraFase.jornadas_previstas) != null && <span>Jornadas: {previsualizacionPrimeraFase.jornadas ?? previsualizacionPrimeraFase.jornadas_previstas}</span>}
                {Array.isArray(previsualizacionPrimeraFase.grupos) && previsualizacionPrimeraFase.grupos.map((grupo) => <div className="detalle-regrupo" key={grupo.grupo}><b>Grupo {grupo.grupo}</b><span>{grupo.equipos} equipos · {grupo.jornadas} jornadas · {grupo.partidos} partidos{grupo.hay_descansos ? ' · habrá descansos' : ''}</span></div>)}
                {Array.isArray(previsualizacionPrimeraFase.emparejamientos) && previsualizacionPrimeraFase.emparejamientos.map((partido, indice) => partido.descansa ? <div className="detalle-cruce-eliminatoria" key={`d-${partido.grupo}-${partido.jornada}-${indice}`}><b>Grupo {partido.grupo} · Jornada {partido.jornada}</b><span>Descansa: {partido.nombre_descansa || partido.descansa}</span></div> : <div className="detalle-cruce-eliminatoria" key={`${partido.grupo}-${partido.jornada}-${indice}`}><b>Grupo {partido.grupo} · Jornada {partido.jornada} · Pista {partido.pista}</b><span>{partido.nombre_1 || partido.equipo_1} — {partido.nombre_2 || partido.equipo_2}</span></div>)}
                {previsualizacionPrimeraFase.hay_descanso === true && <span>Habrá descanso por número impar de equipos.</span>}
                {previsualizacionPrimeraFase.ya_generada ? <span className="aviso-configuracion-pendiente">Primera fase ya generada: {previsualizacionPrimeraFase.partidos_existentes} partidos existentes. No se volverá a generar.</span> : <button type="button" className="boton boton-principal" onClick={generarPrimeraFase} disabled={generandoPrimeraFase || previsualizacionPrimeraFase.puede_generar === false}>
                  {generandoPrimeraFase ? 'Generando…' : 'Confirmar y generar primera fase'}
                </button>}
              </div>
            )}
          </fieldset>

          {config.tipo_campeonato === 'Grupos' && config.hay_regrupos && (
            <fieldset className="generacion-regrupos">
              <legend>Generación de ReGrupos</legend>
              <p>Solo se habilitan cuando toda la fase de grupos está terminada. Primero se muestra exactamente qué equipos formarán cada ReGrupo y qué partidos se crearán o se arrastrarán.</p>
              <button type="button" className="boton boton-secundario" onClick={previsualizarRegrupos} disabled={previsualizandoRegrupos || generandoRegrupos || hayCambiosSinGuardar}>
                {previsualizandoRegrupos ? 'Comprobando…' : 'Previsualizar ReGrupos'}
              </button>
              {errorRegrupos && <p className="error-generacion-primera-fase">{errorRegrupos}</p>}
              {previsualizacionRegrupos && (
                <div className="resumen-generacion-primera-fase">
                  <strong>{previsualizacionRegrupos.repetir_enfrentamientos ? 'Liguilla completa · se permiten repetidos' : 'Sin repetir enfrentamientos · con arrastre'}</strong>
                  <span>Equipos: {previsualizacionRegrupos.equipos ?? 0}</span>
                  <span>ReGrupos: {previsualizacionRegrupos.numero_regrupos ?? 0}</span>
                  <span>Partidos nuevos: {previsualizacionRegrupos.partidos_nuevos ?? 0}</span>
                  <span>Partidos arrastrados: {previsualizacionRegrupos.partidos_arrastrados ?? 0}</span>
                  {!previsualizacionRegrupos.repetir_enfrentamientos && <span>Puntos por victoria arrastrada: {config.puntos_partido_arrastrado}</span>}
                  {Array.isArray(previsualizacionRegrupos.regrupos) && previsualizacionRegrupos.regrupos.map((grupo) => (
                    <div className="detalle-regrupo" key={grupo.codigo}>
                      <b>{grupo.nombre || `ReGrupo ${grupo.codigo}`}</b>
                      <span>{Array.isArray(grupo.equipos) ? grupo.equipos.join(' · ') : ''}</span>
                    </div>
                  ))}
                  <button type="button" className="boton boton-principal" onClick={generarRegrupos} disabled={generandoRegrupos}>
                    {generandoRegrupos ? 'Generando…' : 'Confirmar y generar ReGrupos'}
                  </button>
                </div>
              )}
            </fieldset>
          )}

          <fieldset className="generacion-eliminatorias">
            <legend>Generación de Eliminatorias</legend>
            <p>Usa la configuración guardada y la clasificación de la última fase completada. La previsualización no crea partidos.</p>
            {hayCambiosSinGuardar && <p className="aviso-configuracion-pendiente">Hay cambios sin guardar. Guarda la configuración antes de previsualizar o generar cruces.</p>}
            <button type="button" className="boton boton-secundario" onClick={previsualizarEliminatorias} disabled={previsualizandoEliminatorias || generandoEliminatorias || hayCambiosSinGuardar || !config.ronda_inicial_eliminatorias}>{previsualizandoEliminatorias ? 'Comprobando…' : 'Previsualizar eliminatorias'}</button>
            {errorEliminatorias && <p className="error-generacion-primera-fase">{errorEliminatorias}</p>}
            {previsualizacionEliminatorias && <div className="resumen-generacion-primera-fase">
              <strong>{previsualizacionEliminatorias.ronda_inicial} · {previsualizacionEliminatorias.criterio_cruces}</strong>
              <span>Fase de origen: {previsualizacionEliminatorias.fase_origen}</span><span>Clasificados: {previsualizacionEliminatorias.clasificados}</span>
              {previsualizacionEliminatorias.mensaje && <span>{previsualizacionEliminatorias.mensaje}</span>}
              {Array.isArray(previsualizacionEliminatorias.partidos) && previsualizacionEliminatorias.partidos.map((partido) => <div className="detalle-cruce-eliminatoria" key={partido.orden}><b>Cruce {partido.orden}</b><span>{previsualizacionEliminatorias.nombres_equipos?.[partido.equipo_1] || partido.equipo_1} — {previsualizacionEliminatorias.nombres_equipos?.[partido.equipo_2] || partido.equipo_2}</span></div>)}
              <button type="button" className="boton boton-principal" onClick={generarEliminatorias} disabled={generandoEliminatorias || !previsualizacionEliminatorias.puede_generar}>{generandoEliminatorias ? 'Generando…' : 'Confirmar y generar eliminatorias'}</button>
            </div>}
          </fieldset>

          {config.hay_copa_palas_playa === true && (
            <fieldset className="generacion-palas">
              <legend>Generación de Palas de Playa</legend>
              <p>Primero se muestra exactamente quién participa, los cruces, las pistas y quién descansa. La previsualización no crea partidos.</p>
              {hayCambiosSinGuardar && <p className="aviso-configuracion-pendiente">Hay cambios sin guardar. Guarda la configuración antes de previsualizar.</p>}
              <button type="button" className="boton boton-secundario" onClick={previsualizarPalas} disabled={previsualizandoPalas || generandoPalas || hayCambiosSinGuardar}>{previsualizandoPalas ? 'Comprobando…' : 'Previsualizar Palas de Playa'}</button>
              {errorPalas && <p className="error-generacion-primera-fase">{errorPalas}</p>}
              {previsualizacionPalas && <div className="resumen-generacion-primera-fase">
                <strong>Previsualización · Palas de Playa · {previsualizacionPalas.criterio}</strong>
                {previsualizacionPalas.mensaje && <span>{previsualizacionPalas.mensaje}</span>}
                {previsualizacionPalas.participantes != null && <span>Equipos participantes: {previsualizacionPalas.participantes}</span>}
                {previsualizacionPalas.ronda_inicial && <span>Ronda inicial: {previsualizacionPalas.ronda_inicial}</span>}
                {Array.isArray(previsualizacionPalas.partidos) && previsualizacionPalas.partidos.map((partido, indice) => <div className="detalle-cruce-eliminatoria" key={`${partido.ronda || 'PP'}-${partido.orden || indice}`}><b>{partido.ronda || 'Palas'} · Partido {partido.orden || indice + 1}{partido.pista ? ` · Pista ${partido.pista}` : ''}</b><span>{previsualizacionPalas.nombres_equipos?.[partido.equipo_1] || partido.equipo_1} — {previsualizacionPalas.nombres_equipos?.[partido.equipo_2] || partido.equipo_2}</span></div>)}
                {previsualizacionPalas.descansa && <div className="detalle-regrupo"><b>Descanso</b><span>{previsualizacionPalas.nombres_equipos?.[previsualizacionPalas.descansa] || previsualizacionPalas.descansa} · descansa por ser el peor clasificado disponible</span></div>}
                {previsualizacionPalas.ya_generada ? <span className="aviso-configuracion-pendiente">Palas de Playa ya está generada. No se volverá a crear.</span> : <button type="button" className="boton boton-principal" onClick={generarPalas} disabled={generandoPalas || !previsualizacionPalas.puede_generar}>{generandoPalas ? 'Generando…' : 'Confirmar y generar Palas de Playa'}</button>}
              </div>}
            </fieldset>
          )}

          <fieldset className="zona-peligro-campeonato">
            <legend>Mantenimiento del campeonato</legend>
            <p>Estas acciones eliminan datos de Supabase. Los jugadores generales y sus códigos Jxxx se conservan.</p>
            <div className="acciones-mantenimiento-campeonato">
              <div>
                <strong>Vaciar datos deportivos</strong>
                <span>Borra partidos, resultados, clasificaciones, Histórico e ISP de esta edición. Antes de confirmar podrás elegir si conservas los equipos o si también los borras.</span>
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
      {mostrarInfoClasificacion && (
        <div className="fondo-modal-informacion" role="presentation" onMouseDown={() => setMostrarInfoClasificacion(false)}>
          <section className="modal-informacion-clasificacion" role="dialog" aria-modal="true" aria-labelledby="titulo-info-clasificacion" onMouseDown={(evento) => evento.stopPropagation()}>
            <button type="button" className="cerrar-modal-informacion" aria-label="Cerrar" onClick={() => setMostrarInfoClasificacion(false)}>×</button>
            <h3 id="titulo-info-clasificacion">Cómo se ordena la clasificación</h3>
            <p>El criterio se aplica dentro de cada clasificación. En Grupos y ReGrupos ordena cada grupo por separado; en Liguilla también determina el orden que utiliza el método suizo para preparar la siguiente jornada.</p>
            <article>
              <strong>A · Puntos y rendimiento proporcional</strong>
              <p>Prioriza los puntos totales y, en caso de empate, la eficacia por partido. Compensa mejor a los equipos que hayan descansado.</p>
              <ol><li>Puntos totales</li><li>Coeficiente de puntos (puntos ÷ partidos jugados)</li><li>Diferencia de sets</li><li>Sets ganados</li><li>Diferencia de puntos</li><li>Puntos ganados</li><li>Partidos jugados</li><li>Sorteo</li></ol>
              <div className="ejemplo-criterio-clasificacion">
                <b>Ejemplo</b>
                <p>Equipo Azul: 6 puntos en 3 partidos = 2,00 por partido.<br />Equipo Verde: 6 puntos en 4 partidos = 1,50 por partido.</p>
                <span>Queda antes el Equipo Azul: tienen los mismos puntos, pero mejor promedio.</span>
              </div>
            </article>
            <article>
              <strong>B · Puntos y mayor participación</strong>
              <p>Con los mismos puntos, coloca antes al equipo que haya disputado más partidos. Premia la constancia y la participación.</p>
              <ol><li>Puntos totales</li><li>Partidos jugados, mayor número primero</li><li>Diferencia de sets</li><li>Sets ganados</li><li>Diferencia de puntos</li><li>Puntos ganados</li><li>Sorteo</li></ol>
              <div className="ejemplo-criterio-clasificacion">
                <b>Ejemplo</b>
                <p>Equipo Azul: 6 puntos en 3 partidos.<br />Equipo Verde: 6 puntos en 4 partidos.</p>
                <span>Queda antes el Equipo Verde: tienen los mismos puntos y ha jugado más partidos.</span>
              </div>
            </article>
            <article>
              <strong>C · Eficacia real por partido</strong>
              <p>El criterio principal es el promedio de puntos por partido. Es el más independiente del número de jornadas disputadas.</p>
              <ol><li>Coeficiente de puntos (puntos ÷ partidos jugados)</li><li>Puntos totales</li><li>Diferencia de sets</li><li>Sets ganados</li><li>Diferencia de puntos</li><li>Puntos ganados</li><li>Partidos jugados</li><li>Sorteo</li></ol>
              <div className="ejemplo-criterio-clasificacion">
                <b>Ejemplo</b>
                <p>Equipo Azul: 6 puntos en 3 partidos = 2,00 por partido.<br />Equipo Verde: 7 puntos en 4 partidos = 1,75 por partido.</p>
                <span>Queda antes el Equipo Azul: en C manda primero la eficacia, aunque tenga menos puntos totales.</span>
              </div>
            </article>
          </section>
        </div>
      )}
      {accionMantenimiento && (
        <div className="fondo-modal-mantenimiento" role="presentation" onMouseDown={() => !procesandoMantenimiento && setAccionMantenimiento(null)}>
          <div className="modal-mantenimiento-campeonato" role="dialog" aria-modal="true" aria-labelledby="titulo-mantenimiento-campeonato" onMouseDown={(evento) => evento.stopPropagation()}>
            <span className="icono-peligro">!</span>
            <h3 id="titulo-mantenimiento-campeonato">{accionMantenimiento === 'vaciar' ? 'Vaciar datos deportivos' : 'Eliminar campeonato definitivamente'}</h3>
            {errorMantenimiento ? <p className="error-modal-mantenimiento">{errorMantenimiento}</p> : !resumenMantenimiento ? <p>Revisando los datos relacionados…</p> : <>
              <p>{accionMantenimiento === 'vaciar' ? `Se conservarán la configuración y las ${resumenMantenimiento.inscripciones} inscripciones.` : 'Esta edición desaparecerá completamente y no podrá recuperarse.'}</p>
              {accionMantenimiento === 'vaciar' && (
                <fieldset className="opciones-vaciado-equipos">
                  <legend>¿Qué hacemos con los equipos?</legend>
                  <label className={!borrarEquiposMantenimiento ? 'seleccionada' : ''}>
                    <input type="radio" name="borrar_equipos_mantenimiento" checked={!borrarEquiposMantenimiento} onChange={() => setBorrarEquiposMantenimiento(false)} disabled={procesandoMantenimiento} />
                    <span><strong>Conservar equipos</strong><small>Mantiene las parejas creadas. Se borran sus partidos, resultados, clasificación y asignación de grupo.</small></span>
                  </label>
                  <label className={borrarEquiposMantenimiento ? 'seleccionada peligro' : ''}>
                    <input type="radio" name="borrar_equipos_mantenimiento" checked={borrarEquiposMantenimiento} onChange={() => setBorrarEquiposMantenimiento(true)} disabled={procesandoMantenimiento} />
                    <span><strong>Borrar también los equipos</strong><small>Elimina las parejas de esta edición; después tendrás que volver a crearlas o importarlas.</small></span>
                  </label>
                </fieldset>
              )}
              <dl className="resumen-borrado">
                <div><dt>Equipos</dt><dd>{accionMantenimiento === 'vaciar' && !borrarEquiposMantenimiento ? `${resumenMantenimiento.equipos} conservados` : resumenMantenimiento.equipos}</dd></div>
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


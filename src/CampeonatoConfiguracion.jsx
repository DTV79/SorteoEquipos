import { useEffect, useState } from 'react'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './CampeonatoConfiguracion.css'

const VALORES_INICIALES = {
  id_campeonato: '',
  nombre_campeonato: '',
  anio_campeonato: new Date().getFullYear(),
  fecha_campeonato: '',
  lugar_campeonato: '',
  horario_campeonato: '',
  version_web: '',
  estado_torneo: 'Pretorneo',
  tipo_campeonato: 'Grupos',
  estructura_primera_fase: '2 Grupos',
  num_grupos_iniciales: 2,
  equipos_por_grupo: 4,
  hay_regrupos: false,
  equipos_pasan_a_regrupos: 4,
  equipos_pasan_a_cruces_por_grupo: 4,
  puntos_partido_arrastrado: 2,
  num_pistas_disponibles: 4,
  ronda_inicial_eliminatorias: 'Cuartos',
  criterio_generar_cruces: 'No Enfrentados',
  hay_copa_palas_playa: false,
  criterio_palas_playa: 'No Enfrentados',
  posicion_inicio_palas_playa: 9,
  puntos_objetivo_set: 10,
  puntos_maximos_por_set: 15,
  sistema_puntuacion: 'Competitivo',
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
  'hay_copa_palas_playa',
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

function normalizarConfiguracion(datos) {
  const config = { ...VALORES_INICIALES, ...(datos ?? {}) }
  CAMPOS_BOOLEANOS.forEach((campo) => {
    config[campo] = aBooleano(config[campo])
  })
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

export default function CampeonatoConfiguracion({ codigo, onVolver, onResultados, onPanelPrincipal }) {
  const [config, setConfig] = useState(VALORES_INICIALES)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

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
        } else if (actual.estructura_primera_fase === 'Liguilla Única') {
          siguiente.estructura_primera_fase = '2 Grupos'
          siguiente.num_grupos_iniciales = 2
        }
      }
      if (name === 'estructura_primera_fase') {
        siguiente.num_grupos_iniciales = value === '4 Grupos' ? 4 : value === '2 Grupos' ? 2 : 1
      }
      return siguiente
    })
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
      setMensaje({ tipo: 'correcto', texto: 'Configuración guardada y protegida frente a Excel.' })
    }
    setGuardando(false)
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
              <Campo etiqueta="Tipo de campeonato"><select name="tipo_campeonato" value={config.tipo_campeonato} onChange={cambiar}><option>Liguilla</option><option>Grupos</option></select></Campo>
              <Campo etiqueta="Primera fase"><select name="estructura_primera_fase" value={config.estructura_primera_fase} onChange={cambiar} disabled={!esGrupos}><option>Liguilla Única</option><option>2 Grupos</option><option>4 Grupos</option></select></Campo>
              {esGrupos && <Campo etiqueta="Equipos por grupo"><input type="number" min="2" name="equipos_por_grupo" value={config.equipos_por_grupo} onChange={cambiar} /></Campo>}
              <Campo etiqueta="Pistas disponibles"><input type="number" min="1" name="num_pistas_disponibles" value={config.num_pistas_disponibles} onChange={cambiar} /></Campo>
              <Campo etiqueta="Equipos que pasan a eliminatorias"><input type="number" min="1" name="equipos_pasan_a_cruces_por_grupo" value={config.equipos_pasan_a_cruces_por_grupo} onChange={cambiar} /></Campo>
            </div>
            <label className="interruptor-configuracion"><input type="checkbox" name="hay_regrupos" checked={config.hay_regrupos} onChange={cambiar} /><span>Segunda fase por ReGrupos</span></label>
            {config.hay_regrupos && <div className="rejilla-configuracion bloque-dependiente"><Campo etiqueta="Equipos que pasan a ReGrupos"><input type="number" min="2" name="equipos_pasan_a_regrupos" value={config.equipos_pasan_a_regrupos} onChange={cambiar} /></Campo><Campo etiqueta="Puntos por partido arrastrado"><input type="number" min="0" name="puntos_partido_arrastrado" value={config.puntos_partido_arrastrado} onChange={cambiar} /></Campo></div>}
          </fieldset>

          <fieldset>
            <legend>Eliminatorias</legend>
            <div className="rejilla-configuracion">
              <Campo etiqueta="Ronda inicial"><select name="ronda_inicial_eliminatorias" value={config.ronda_inicial_eliminatorias} onChange={cambiar}><option>Octavos</option><option>Cuartos</option><option>Semifinales</option><option>Final</option></select></Campo>
              <Campo etiqueta="Criterio de cruces"><select name="criterio_generar_cruces" value={config.criterio_generar_cruces} onChange={cambiar}><option>Por Clasificación</option><option>No Enfrentados</option></select></Campo>
            </div>
            <label className="interruptor-configuracion"><input type="checkbox" name="hay_copa_palas_playa" checked={config.hay_copa_palas_playa} onChange={cambiar} /><span>Hay Copa Palas de Playa</span></label>
            {config.hay_copa_palas_playa && <div className="rejilla-configuracion bloque-dependiente"><Campo etiqueta="Desde la posición"><input type="number" min="1" name="posicion_inicio_palas_playa" value={config.posicion_inicio_palas_playa} onChange={cambiar} /></Campo><Campo etiqueta="Criterio Palas de Playa"><select name="criterio_palas_playa" value={config.criterio_palas_playa} onChange={cambiar}><option>Por Clasificación</option><option>No Enfrentados</option></select></Campo></div>}
          </fieldset>

          <fieldset>
            <legend>Reglas de juego y clasificación</legend>
            <div className="rejilla-configuracion">
              <Campo etiqueta="Puntos objetivo del set"><input type="number" min="1" name="puntos_objetivo_set" value={config.puntos_objetivo_set} onChange={cambiar} /></Campo>
              <Campo etiqueta="Puntos máximos del set"><input type="number" min={config.puntos_objetivo_set || 1} name="puntos_maximos_por_set" value={config.puntos_maximos_por_set} onChange={cambiar} /></Campo>
              <Campo etiqueta="Sistema de puntuación"><select name="sistema_puntuacion" value={config.sistema_puntuacion} onChange={cambiar}><option>Normal</option><option>Equitativo</option><option>Competitivo</option></select></Campo>
              {config.tipo_campeonato === 'Liguilla' && <><Campo etiqueta="Ordenar clasificación"><input name="ordenar_clasificacion" value={config.ordenar_clasificacion || ''} onChange={cambiar} placeholder="Sin definir" /></Campo><Campo etiqueta="Generación de jornadas"><input name="modo_generar_jornadas" value={config.modo_generar_jornadas || ''} onChange={cambiar} placeholder="Sin definir" /></Campo></>}
            </div>
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

          {mensaje && <p className={`mensaje-configuracion ${mensaje.tipo}`}>{mensaje.texto}</p>}
          <div className="barra-guardar-configuracion"><span>Al guardar, Supabase será la fuente maestra y Excel no podrá sobrescribir estos valores.</span><button className="boton boton-principal" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar configuración'}</button></div>
        </form>
      </section>
    </main>
  )
}

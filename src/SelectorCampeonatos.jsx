import { useCallback, useEffect, useState } from 'react'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './SelectorCampeonatos.css'

function estadoVisible(estado) {
  return { pretorneo: 'Pretorneo', inscripciones: 'Inscripciones', en_juego: 'En juego', finalizado: 'Finalizado' }[estado] ?? estado
}

export default function SelectorCampeonatos({ onSeleccionar, onVolver }) {
  const [campeonatos, setCampeonatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mostrarAlta, setMostrarAlta] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [activando, setActivando] = useState('')
  const [nuevo, setNuevo] = useState({ nombre: '', anio: new Date().getFullYear(), fecha: '', copiar: '' })

  const cargar = useCallback(async () => {
    setCargando(true)
    const { data, error: errorCarga } = await supabaseCampeonato.rpc('admin_listar_campeonatos')
    if (errorCarga || data?.ok !== true) setError(errorCarga?.message || data?.error || 'No se pudieron cargar los campeonatos.')
    else { setCampeonatos(data.campeonatos ?? []); setError('') }
    setCargando(false)
  }, [])

  useEffect(() => {
    let cancelado = false
    async function iniciar() {
      const { data, error: errorCarga } = await supabaseCampeonato.rpc('admin_listar_campeonatos')
      if (cancelado) return
      if (errorCarga || data?.ok !== true) setError(errorCarga?.message || data?.error || 'No se pudieron cargar los campeonatos.')
      else { setCampeonatos(data.campeonatos ?? []); setError('') }
      setCargando(false)
    }
    iniciar()
    return () => { cancelado = true }
  }, [])

  async function crear(evento) {
    evento.preventDefault()
    setGuardando(true)
    setError('')
    const { data, error: errorAlta } = await supabaseCampeonato.rpc('admin_crear_campeonato', {
      p_nombre: nuevo.nombre,
      p_anio: Number(nuevo.anio),
      p_fecha: nuevo.fecha || null,
      p_copiar_configuracion_de: nuevo.copiar || null,
      p_activar: true,
    })
    setGuardando(false)
    if (errorAlta || data?.ok !== true) { setError(errorAlta?.message || data?.error || 'No se pudo crear el campeonato.'); return }
    setMostrarAlta(false)
    onSeleccionar(data.codigo_campeonato, 'configuracion')
  }

  async function activar(codigo) {
    setActivando(codigo)
    const { data, error: errorActivacion } = await supabaseCampeonato.rpc('admin_activar_campeonato', { p_codigo: codigo })
    setActivando('')
    if (errorActivacion || data?.ok !== true) { setError(errorActivacion?.message || data?.error || 'No se pudo activar.'); return }
    await cargar()
  }

  return <main className="app app-admin app-listado-campeonatos"><section className="panel-admin panel-listado-campeonatos">
    <header className="cabecera-admin"><div><p className="etiqueta">CAMPEONATOS</p><h2>Gestión de campeonatos</h2><p className="descripcion-admin">Crea una edición nueva o continúa gestionando una existente.</p></div><div className="acciones-listado-campeonatos"><button type="button" className="boton boton-principal" onClick={() => setMostrarAlta(true)}>+ Crear campeonato</button><button type="button" className="boton boton-secundario" onClick={onVolver}>← Panel principal</button></div></header>
    {error && <p className="mensaje-configuracion error">{error}</p>}
    {cargando ? <p className="estado">Cargando campeonatos…</p> : <div className="lista-campeonatos-admin">{campeonatos.map((campeonato) => <article key={campeonato.codigo_campeonato} className={campeonato.activo ? 'campeonato-activo' : ''}>
      <div className="cabecera-tarjeta-campeonato"><span>{campeonato.codigo_campeonato}</span>{campeonato.activo && <b>ACTIVO EN LA WEB</b>}</div>
      <h3>{campeonato.nombre}</h3><p>{campeonato.fecha_inicio ? new Date(`${campeonato.fecha_inicio}T00:00:00`).toLocaleDateString('es-ES') : campeonato.anio} · {estadoVisible(campeonato.estado)}</p>
      <dl><div><dt>Inscritos</dt><dd>{campeonato.inscripciones}</dd></div><div><dt>Equipos</dt><dd>{campeonato.equipos}</dd></div><div><dt>Partidos</dt><dd>{campeonato.partidos}</dd></div></dl>
      <div className="acciones-tarjeta-campeonato"><button type="button" className="boton boton-principal" onClick={() => onSeleccionar(campeonato.codigo_campeonato, 'menu')}>Gestionar</button>{!campeonato.activo && <button type="button" className="boton boton-secundario" disabled={Boolean(activando)} onClick={() => activar(campeonato.codigo_campeonato)}>{activando === campeonato.codigo_campeonato ? 'Activando…' : 'Usar en la web'}</button>}</div>
    </article>)}</div>}
    {!cargando && campeonatos.length === 0 && <p className="estado">Todavía no hay campeonatos.</p>}
  </section>
  {mostrarAlta && <div className="fondo-modal-campeonato" role="presentation" onMouseDown={() => !guardando && setMostrarAlta(false)}><form className="modal-crear-campeonato" onSubmit={crear} onMouseDown={(evento) => evento.stopPropagation()}><h3>Crear nuevo campeonato</h3><p>El código CAMP-AÑO-NÚMERO se generará automáticamente.</p><label><span>Nombre oficial</span><input required value={nuevo.nombre} onChange={(evento) => setNuevo({ ...nuevo, nombre: evento.target.value })} placeholder="III Campeonato Sprint Pádel" /></label><div className="campos-cortos-alta"><label><span>Año</span><input type="number" min="2000" max="2100" required value={nuevo.anio} onChange={(evento) => setNuevo({ ...nuevo, anio: evento.target.value })} /></label><label><span>Fecha</span><input type="date" value={nuevo.fecha} onChange={(evento) => setNuevo({ ...nuevo, fecha: evento.target.value })} /></label></div><label><span>Configuración inicial</span><select value={nuevo.copiar} onChange={(evento) => setNuevo({ ...nuevo, copiar: evento.target.value })}><option value="">Empezar con valores predeterminados</option>{campeonatos.map((c) => <option key={c.codigo_campeonato} value={c.codigo_campeonato}>Copiar configuración de {c.codigo_campeonato}</option>)}</select></label><small>Solo se copia la configuración. Jugadores inscritos, equipos, partidos y resultados comenzarán vacíos.</small><div><button type="button" className="boton boton-secundario" onClick={() => setMostrarAlta(false)}>Cancelar</button><button className="boton boton-principal" disabled={guardando}>{guardando ? 'Creando…' : 'Crear y configurar'}</button></div></form></div>}
  </main>
}

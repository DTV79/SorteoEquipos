import { useEffect, useMemo, useState } from 'react'
import {
  catalogoJugadoresTeams,
  estadoAccesosTeams,
  generarCodigoAltaTeams,
  guardarConvocatoriaTeams,
  obtenerDetalleTeams,
} from '../teamsApi'

const OPCIONES = [
  ['elegible', 'Me apunto'],
  ['no_disponible', 'No puedo'],
  ['pendiente', 'Todavía no sé'],
]

export default function Convocatoria({ teams }) {
  const [jugadores, setJugadores] = useState([])
  const [estados, setEstados] = useState({})
  const [origenes, setOrigenes] = useState({})
  const [accesos, setAccesos] = useState({})
  const [codigos, setCodigos] = useState({})
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [guardado, setGuardado] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [cat, det, accesosData] = await Promise.all([
          catalogoJugadoresTeams(),
          obtenerDetalleTeams(teams.id),
          estadoAccesosTeams(),
        ])

        setJugadores(cat.filter(j => j.activo))

        const es = {}
        const os = {}
        for (const e of det?.elegibles ?? []) {
          es[e.id_jugador] = e.estado
          os[e.id_jugador] = e.origen
        }
        setEstados(es)
        setOrigenes(os)
        setGuardado((det?.elegibles ?? []).length > 0)

        const mapaAccesos = {}
        for (const acceso of accesosData ?? []) {
          mapaAccesos[acceso.id_jugador] = acceso
        }
        setAccesos(mapaAccesos)
      } catch (e) {
        setMensaje('Error: ' + e.message)
      } finally {
        setCargando(false)
      }
    })()
  }, [teams.id])

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    return !q
      ? jugadores
      : jugadores.filter(j =>
          (j.alias || '').toLowerCase().includes(q) ||
          (j.nombre_oficial || '').toLowerCase().includes(q)
        )
  }, [jugadores, buscar])

  const totalElegibles = Object.values(estados).filter(x => x === 'elegible').length
  const pendientes = Object.values(estados).filter(x => x === 'pendiente').length
  const plazas =
    (Number(teams.jugadores_por_equipo) || 0) * 2 +
    (Number(teams.reservas_por_equipo) || 0) * 2

  function cambiar(id, estado) {
    setGuardado(false)
    setMensaje('')
    setEstados(s => ({ ...s, [id]: estado }))
    setOrigenes(s => ({ ...s, [id]: 'admin' }))
  }

  async function generarCodigo(j) {
    const nombre = j.alias || j.nombre_oficial
    const acceso = accesos[j.id_jugador]

    if (acceso?.acceso_creado) {
      const ok = window.confirm(
        'Vas a restablecer el acceso de ' + nombre +
        '. Su PIN actual dejará de funcionar y tendrá que crear uno nuevo con el código que se genere. ¿Continuar?'
      )
      if (!ok) return
    }

    setMensaje('')

    try {
      const data = await generarCodigoAltaTeams(j.id_jugador)
      setCodigos(c => ({ ...c, [j.id_jugador]: data.codigo }))
      setAccesos(a => ({
        ...a,
        [j.id_jugador]: {
          ...(a[j.id_jugador] || {}),
          acceso_creado: acceso?.acceso_creado || false,
          tiene_acceso: false,
          codigo_pendiente: true,
          codigo_expira_at: data.expira_at,
        },
      }))
      setMensaje(
        (data.tipo === 'restablecimiento' ? 'Acceso restablecido. ' : 'Código de alta generado. ') +
        'Envía el código a ' + nombre + '.'
      )
    } catch (e) {
      setMensaje('Error: ' + e.message)
    }
  }

  async function copiarCodigo(codigo) {
    try {
      await navigator.clipboard.writeText(codigo)
      setMensaje('Código copiado al portapapeles.')
    } catch {
      setMensaje('Código: ' + codigo)
    }
  }

  async function guardar() {
    setGuardando(true)
    setMensaje('')
    try {
      const datos = jugadores
        .filter(j => estados[j.id_jugador])
        .map(j => ({
          id_jugador: j.id_jugador,
          estado: estados[j.id_jugador],
        }))
      await guardarConvocatoriaTeams(teams.id, datos)
      setMensaje('Convocatoria guardada correctamente.')
      setGuardado(true)
    } catch (e) {
      setMensaje('Error: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="teams-convocatoria">
      <div className="teams-seccion-cab">
        <div>
          <p className="etiqueta">CONVOCATORIA</p>
          <h2>Disponibilidad de jugadores</h2>
          <p>
            El jugador puede responder desde Mi Zona. El administrador también puede
            registrar respuestas recibidas por WhatsApp u otros medios.
          </p>
        </div>
        <div className={'teams-contador ' + (plazas && totalElegibles < plazas ? 'faltan' : '')}>
          <strong>{totalElegibles}</strong>
          <span>{plazas ? 'apuntados · ' + plazas + ' plazas previstas' : 'apuntados'}</span>
          {pendientes > 0 && <small>{pendientes} pendientes</small>}
        </div>
      </div>

      <div className="teams-convocatoria-tools">
        <input
          type="search"
          placeholder="Buscar jugador…"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
        />
        <button
          className="boton boton-secundario"
          type="button"
          onClick={() => {
            const n = { ...estados }
            jugadores.forEach(j => { n[j.id_jugador] = 'elegible' })
            setEstados(n)
            setGuardado(false)
            setMensaje('')
          }}
        >
          Todos: Me apunto
        </button>
      </div>

      {cargando ? (
        <div className="teams-vacio">Cargando catálogo…</div>
      ) : (
        <div className="teams-jugadores teams-jugadores-estados">
          {filtrados.map(j => {
            const estado = estados[j.id_jugador] || ''
            const acceso = accesos[j.id_jugador] || {}
            const codigo = codigos[j.id_jugador]

            return (
              <article
                key={j.id_jugador}
                className={'teams-jugador-estado ' + (estado || 'sin-respuesta')}
              >
                <div className="teams-jugador-identidad">
                  <span className="teams-avatar">
                    {(j.alias || j.nombre_oficial || '?').trim().charAt(0).toUpperCase()}
                  </span>
                  <span>
                    <b>{j.alias || j.nombre_oficial}</b>
                    {j.alias && j.nombre_oficial !== j.alias && (
                      <small>{j.nombre_oficial}</small>
                    )}
                  </span>
                </div>

                <div className="teams-estado-opciones">
                  {OPCIONES.map(([v, t]) => (
                    <button
                      type="button"
                      key={v}
                      className={estado === v ? 'activo ' + v : ''}
                      onClick={() => cambiar(j.id_jugador, v)}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="teams-jugador-pie">
                  <small className="teams-origen">
                    {origenes[j.id_jugador] === 'web'
                      ? 'Respondido en web'
                      : estado
                        ? 'Marcado por administrador'
                        : 'Sin respuesta'}
                  </small>

                  <div className="teams-acceso-jugador">
                    <span className={
                      'teams-acceso-estado ' +
                      (acceso.tiene_acceso ? 'activo' : acceso.codigo_pendiente ? 'pendiente' : '')
                    }>
                      {acceso.tiene_acceso
                        ? 'Mi Zona activa'
                        : acceso.codigo_pendiente
                          ? 'Código pendiente'
                          : 'Sin acceso'}
                    </span>
                    <button
                      type="button"
                      className="teams-pin-btn"
                      onClick={() => generarCodigo(j)}
                    >
                      {acceso.acceso_creado ? '🔁 Restablecer acceso' : '🔐 Código de alta'}
                    </button>
                  </div>
                </div>

                {codigo && (
                  <div className="teams-codigo-alta">
                    <span>Código de un solo uso</span>
                    <strong>{codigo}</strong>
                    <button type="button" onClick={() => copiarCodigo(codigo)}>
                      Copiar
                    </button>
                    <small>Válido durante 48 horas</small>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      {mensaje && (
        <p className={mensaje.startsWith('Error:') ? 'teams-error' : 'teams-ok'}>
          {mensaje}
        </p>
      )}

      <footer className="teams-convocatoria-acciones">
        <span>
          {plazas && totalElegibles < plazas
            ? 'Faltan ' + (plazas - totalElegibles) + ' apuntados para cubrir las plazas previstas.'
            : plazas && totalElegibles > plazas
              ? (totalElegibles - plazas) + ' jugadores podrán quedar sin seleccionar o como reservas generales.'
              : ' '}
        </span>
        <button
          type="button"
          className="boton boton-principal"
          disabled={guardando || cargando || guardado}
          onClick={guardar}
        >
          {guardando ? 'Guardando…' : guardado ? 'Guardado ✓' : 'Guardar cambios'}
        </button>
      </footer>
    </section>
  )
}

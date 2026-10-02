import { useMemo, useState } from 'react'
import { crearTeams } from '../teamsApi'
import { crearTeamsInicial, PASOS } from './crear/config'
import PasoGeneral from './crear/PasoGeneral'
import PasoFormacion from './crear/PasoFormacion'
import PasoParticipacion from './crear/PasoParticipacion'
import PasoParejas from './crear/PasoParejas'
import PasoPublicacion from './crear/PasoPublicacion'
import PasoRevision from './crear/PasoRevision'

const inicial = crearTeamsInicial

export default function CrearTeams({ onCancelar, onCreado }) {
  const [paso,setPaso] = useState(0)
  const [form,setForm] = useState(inicial)
  const [error,setError] = useState('')
  const [guardando,setGuardando] = useState(false)

  const set = (k,v) => setForm(a => {
    const siguiente = {...a,[k]:v}
    if (
      k === 'metodo_formacion' &&
      v === 'draft' &&
      ['eleccion_equipo','sorteo'].includes(a.modo_designacion_capitanes)
    ) {
      siguiente.modo_designacion_capitanes = 'administrador'
    }
    return siguiente
  })

  const viabilidad = useMemo(() => {
    const j = Number(form.jugadores_por_equipo) || 0
    const p = Number(form.numero_partidos) || 0

    if (j < 2) return 'Cada equipo necesita al menos 2 jugadores.'

    let max = Infinity

    if (form.repetir_jugadores === 'no') max = Math.floor(j / 2)

    if (form.repetir_jugadores === 'maximo') {
      const x = Number(form.max_partidos_jugador) || 0
      if (!x) return 'Indica el máximo de partidos por jugador.'
      max = Math.floor(j * x / 2)
    }

    if (!form.repetir_pareja) max = Math.min(max, j * (j - 1) / 2)

    return p > max
      ? `Con estas reglas solo son posibles ${max} partidos por equipo y has configurado ${p}. Aumenta jugadores, permite más repeticiones o reduce el número de partidos.`
      : ''
  }, [
    form.jugadores_por_equipo,
    form.numero_partidos,
    form.repetir_jugadores,
    form.max_partidos_jugador,
    form.repetir_pareja
  ])

  const resumen = useMemo(() => ({
    formato: {
      numero_fijo:'Número fijo',
      mejor_de:'Al mejor de X',
      mejor_de_jugar_todos:'Al mejor de X · jugar todos',
      numero_fijo_desempate:'Número fijo + desempate'
    }[form.modalidad],
    formacion: {
      manual:'Manual',
      draft:'Draft de capitanes',
      sorteo:'Sorteo',
      predeterminado:'Equipos predeterminados'
    }[form.metodo_formacion]
  }), [form])

  async function guardar(e) {
    e.preventDefault()

    if (!form.nombre.trim()) return setError('El nombre del Teams es obligatorio.')
    if (viabilidad) return setError(viabilidad)

    if (
      form.metodo_formacion === 'predeterminado' &&
      (!form.nombre_equipo_a.trim() || !form.nombre_equipo_b.trim())
    ) {
      return setError('Escribe el nombre de los dos equipos predeterminados.')
    }

    if (
      form.metodo_formacion === 'draft' &&
      ['eleccion_equipo','sorteo'].includes(form.modo_designacion_capitanes)
    ) {
      return setError('En un Draft los capitanes deben estar definidos antes de formar los equipos.')
    }

    if (
      form.modo_inicio_teams === 'programado' &&
      !form.inicio_programado_at
    ) {
      return setError('Indica la fecha y hora del inicio programado.')
    }

    setGuardando(true)
    setError('')

    try {
      await crearTeams(form)
      await onCreado()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="teams-admin">
      <form className="teams-asistente" onSubmit={guardar}>
        <div className="teams-asistente-cab">
          <div>
            <p className="etiqueta">NUEVO TEAMS</p>
            <h2>{paso + 1}. {PASOS[paso]}</h2>
          </div>
          <button type="button" className="boton boton-secundario" onClick={onCancelar}>
            Cerrar
          </button>
        </div>

        {error && <p className="teams-error">{error}</p>}

        <div className="teams-pasos">
          {PASOS.map((x,i) => (
            <span key={x} className={i <= paso ? 'activo' : ''}>{i + 1}</span>
          ))}
        </div>

        <PasoGeneral form={form} set={set} resumen={resumen} viabilidad={viabilidad} />

        <PasoFormacion form={form} set={set} resumen={resumen} viabilidad={viabilidad} />

        <PasoParticipacion form={form} set={set} resumen={resumen} viabilidad={viabilidad} />

        <PasoParejas form={form} set={set} resumen={resumen} viabilidad={viabilidad} />

        <PasoPublicacion form={form} set={set} resumen={resumen} viabilidad={viabilidad} />

        <PasoRevision form={form} set={set} resumen={resumen} viabilidad={viabilidad} />

        <footer className="teams-acciones">
          {paso > 0
            ? <button type="button" className="boton boton-secundario" onClick={()=>setPaso(p=>p-1)}>← Anterior</button>
            : <span/>
          }

          {paso < 5
            ? (
              <button
                type="button"
                className="boton boton-principal"
                onClick={() => {
                  if (paso === 0 && !form.nombre.trim()) {
                    setError('Escribe el nombre del Teams.')
                    return
                  }
                  if ((paso === 1 || paso === 2) && viabilidad) {
                    setError(viabilidad)
                    return
                  }
                  if (
                    paso === 1 &&
                    form.metodo_formacion === 'predeterminado' &&
                    (!form.nombre_equipo_a.trim() || !form.nombre_equipo_b.trim())
                  ) {
                    setError('Escribe el nombre de los dos equipos.')
                    return
                  }
                  setError('')
                  setPaso(p=>p+1)
                }}
              >
                Siguiente →
              </button>
            )
            : (
              <button className="boton boton-principal" disabled={guardando}>
                {guardando ? 'Creando…' : 'Crear Teams'}
              </button>
            )
          }
        </footer>
      </form>
    </main>
  )
}

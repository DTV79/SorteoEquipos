import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './GastosDeudas.css'

const numero = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const euros = (v) => Number(v || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })

function asistenciaDe(persona, idActividad) {
  return persona.asistencias?.find((a) => numero(a.id_actividad) === numero(idActividad)) || null
}

function repartirCentimos(total, personas) {
  const ids = [...personas].map((p) => numero(p.id_persona)).sort((a,b)=>a-b)
  const resultado = new Map()
  if (!ids.length) return resultado
  const centimos = Math.round(numero(total) * 100)
  const base = Math.floor(centimos / ids.length)
  let resto = centimos - (base * ids.length)
  ids.forEach((id) => {
    resultado.set(id, (base + (resto > 0 ? 1 : 0)) / 100)
    if (resto > 0) resto -= 1
  })
  return resultado
}

export default function GastosDeudas({ codigo, onCambio }) {
  const [datos, setDatos] = useState(null)
  const [destinos, setDestinos] = useState([])
  const [guardandoPago, setGuardandoPago] = useState('')

  const cargar = useCallback(async () => {
    const { data } = await supabaseCampeonato.rpc('admin_obtener_economia', { p_codigo: codigo })
    if (data?.ok) { setDatos(data); return data }
    return null
  }, [codigo])

  const calcular = useCallback((data) => {
    if (!data?.ok) return { porPersona: new Map(), actividades: [] }
    const personas = (data.personas || []).filter((p) => p.activo)
    const actividades = [...(data.actividades || [])].filter((a) => a.activo).sort((a,b)=>numero(a.orden)-numero(b.orden)||numero(a.id_actividad)-numero(b.id_actividad))
    const campeonato = actividades.find((a) => a.codigo === 'CAMPEONATO')
    const porPersona = new Map(personas.map((p) => [numero(p.id_persona), { total:0, pagado:0, actividades:new Map(), general:0 }]))

    personas.forEach((persona) => {
      const item = porPersona.get(numero(persona.id_persona))
      actividades.forEach((actividad) => {
        const asis = asistenciaDe(persona, actividad.id_actividad)
        const cuota = asis?.asiste && actividad.cobrable
          ? (asis.importe == null || asis.importe === '' ? numero(actividad.precio_persona) : numero(asis.importe))
          : 0
        const pagado = numero(asis?.pagado)
        item.actividades.set(numero(actividad.id_actividad), { cuota, reparto:0, total:cuota, pagado, pendiente:Math.max(cuota-pagado,0), asis })
        item.total += cuota
        item.pagado += pagado
      })
    })

    ;(data.movimientos || []).filter((m) => m.tipo === 'gasto' && m.modo_reparto !== 'no_repartir').forEach((mov) => {
      let elegibles = []
      if (mov.modo_reparto === 'jugadores') elegibles = personas.filter((p) => p.tipo === 'jugador')
      else if (mov.modo_reparto === 'actividad' && mov.id_actividad) elegibles = personas.filter((p) => asistenciaDe(p, mov.id_actividad)?.asiste)
      else if (mov.modo_reparto === 'manual') {
        const ids = new Set((mov.reparto_personas || []).map(numero))
        elegibles = personas.filter((p) => ids.has(numero(p.id_persona)))
      }
      if (!elegibles.length) return
      const reparto = repartirCentimos(mov.importe, elegibles)
      const idActividad = numero(mov.id_actividad || campeonato?.id_actividad || 0)
      elegibles.forEach((persona) => {
        const id = numero(persona.id_persona)
        const parte = numero(reparto.get(id))
        const item = porPersona.get(id)
        if (!item || !parte) return
        if (idActividad && item.actividades.has(idActividad)) {
          const act = item.actividades.get(idActividad)
          act.reparto += parte
          act.total += parte
          act.pendiente = Math.max(act.total - act.pagado, 0)
        } else item.general += parte
        item.total += parte
      })
    })

    personas.forEach((persona) => {
      const item = porPersona.get(numero(persona.id_persona))
      item.pendiente = Math.max(item.total - item.pagado, 0)
    })
    return { porPersona, actividades, personas }
  }, [])

  const calculo = useMemo(() => calcular(datos), [calcular, datos])

  const localizar = useCallback(async () => {
    const fresco = await cargar()
    if (!fresco) return
    window.setTimeout(() => {
      const tarjetas = [...document.querySelectorAll('.gastos-campeonato .lista-personas-economia .persona-economia')]
      const personas = (fresco.personas || []).filter((p) => p.activo)
      const actividades = [...(fresco.actividades || [])].filter((a) => a.activo).sort((a,b)=>numero(a.orden)-numero(b.orden)||numero(a.id_actividad)-numero(b.id_actividad))
      const nuevos = []
      tarjetas.forEach((tarjeta, i) => {
        const persona = personas[i]
        if (!persona) return
        const header = tarjeta.querySelector(':scope > header')
        let hostPersona = header?.querySelector(':scope > .host-resumen-deuda-persona')
        if (header && !hostPersona) { hostPersona=document.createElement('div'); hostPersona.className='host-resumen-deuda-persona'; header.appendChild(hostPersona) }
        const actividadesDom = [...tarjeta.querySelectorAll('.actividad-persona')]
        const hostsActividad = []
        actividadesDom.forEach((seccion, j) => {
          const actividad = actividades[j]
          if (!actividad) return
          seccion.classList.add('actividad-con-deuda')
          const etiqueta = [...seccion.querySelectorAll('.cobro-actividad-persona label > span')].find((s)=>s.textContent?.trim()==='A cobrar')
          if (etiqueta) etiqueta.textContent='Cuota / ajuste'
          let host = seccion.querySelector(':scope > .host-deuda-actividad')
          if (!host) { host=document.createElement('div'); host.className='host-deuda-actividad'; seccion.appendChild(host) }
          hostsActividad.push({ host, actividad })
        })
        nuevos.push({ persona, hostPersona, hostsActividad })
      })
      setDestinos(nuevos)
    }, 40)
  }, [cargar])

  useEffect(() => {
    const click = (e) => {
      const tab = e.target.closest('.gastos-pestanas button')
      if (tab) {
        if (tab.textContent?.includes('Asistencia y cobros')) { window.setTimeout(localizar,0); window.setTimeout(localizar,120) }
        else setDestinos([])
      }
    }
    document.addEventListener('click', click)
    return () => document.removeEventListener('click', click)
  }, [localizar])

  async function marcarPagado(persona, actividad, total) {
    const clave = `${persona.id_persona}-${actividad.id_actividad}`
    setGuardandoPago(clave)
    const asis = asistenciaDe(persona, actividad.id_actividad)
    const fila = {
      id_persona: persona.id_persona,
      id_actividad: actividad.id_actividad,
      asiste: Boolean(asis?.asiste),
      importe: asis?.importe == null || asis?.importe === '' ? null : numero(asis.importe),
      pagado: Math.max(numero(total),0),
      menu: asis?.menu || '',
      observaciones: asis?.observaciones || '',
    }
    const { data, error } = await supabaseCampeonato.rpc('admin_economia_guardar_asistencias', { p_codigo: codigo, p_datos: [fila] })
    setGuardandoPago('')
    if (error || data?.ok !== true) return
    onCambio?.()
    ;[120,350,700].forEach((ms)=>window.setTimeout(()=>{
      const b=[...document.querySelectorAll('.gastos-pestanas button')].find((x)=>x.textContent?.includes('Asistencia y cobros'))
      if (b && !b.classList.contains('activo')) b.click()
      window.setTimeout(localizar,40)
    },ms))
  }

  if (!datos) return null
  return <>{destinos.map(({ persona, hostPersona, hostsActividad }) => {
    const p = calculo.porPersona.get(numero(persona.id_persona)) || {total:0,pagado:0,pendiente:0,actividades:new Map()}
    return <span key={persona.id_persona}>
      {hostPersona && createPortal(<div className="resumen-deuda-persona"><span>Total a pagar <strong>{euros(p.total)}</strong></span><span>Pagado <strong>{euros(p.pagado)}</strong></span><span className={p.pendiente>0?'pendiente':''}>Pendiente <strong>{euros(p.pendiente)}</strong></span></div>, hostPersona)}
      {hostsActividad.map(({host,actividad}) => {
        const d=p.actividades.get(numero(actividad.id_actividad)) || {cuota:0,reparto:0,total:0,pagado:0,pendiente:0}
        const clave=`${persona.id_persona}-${actividad.id_actividad}`
        return createPortal(<div className="deuda-actividad-resumen" key={actividad.id_actividad}><div><span>Cuota / ajuste <b>{euros(d.cuota)}</b></span><span>Gastos repartidos <b>{euros(d.reparto)}</b></span><span className="total">Total a pagar <b>{euros(d.total)}</b></span><span className={d.pendiente>0?'pendiente':''}>Pendiente <b>{euros(d.pendiente)}</b></span></div>{d.total>0 && <button type="button" disabled={guardandoPago===clave} onClick={()=>marcarPagado(persona,actividad,d.total)}>{guardandoPago===clave?'Guardando…':'Marcar total pagado'}</button>}</div>,host)
      })}
    </span>
  })}</>
}

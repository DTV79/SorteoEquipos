import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './GastosMovimientoMejoras.css'

const CATEGORIAS = ['Pistas', 'Pelotas', 'Premios / trofeos', 'Comida / bebida', 'Material', 'Música / animación', 'Alquiler / equipamiento', 'Transporte', 'Otros']

function numero(v) { const n = Number(v); return Number.isFinite(n) ? n : 0 }
function normalizar(v) { return String(v || '').trim().toLowerCase() }
function ponerValorReact(input, valor) {
  if (!input) return
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, valor)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

export default function GastosMovimientoMejoras({ codigo }) {
  const [host, setHost] = useState(null)
  const [datos, setDatos] = useState({ personas: [], movimientos: [] })
  const [categoria, setCategoria] = useState('')
  const [otraCategoria, setOtraCategoria] = useState('')
  const [pagadoPor, setPagadoPor] = useState('')
  const [otroPagador, setOtroPagador] = useState('')
  const [modo, setModo] = useState('no_repartir')
  const [seleccion, setSeleccion] = useState([])
  const [importe, setImporte] = useState(0)
  const [idEditando, setIdEditando] = useState(null)

  const cargar = useCallback(async () => {
    if (!codigo) return null
    const { data } = await supabaseCampeonato.rpc('admin_obtener_economia', { p_codigo: codigo })
    if (data?.ok) {
      setDatos({ personas: (data.personas || []).filter(p => p.activo), movimientos: data.movimientos || [] })
      return data
    }
    return null
  }, [codigo])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    function preparar() {
      const form = document.querySelector('.gastos-campeonato .formulario-movimiento-bloque form.formulario-economia')
      if (!form) { setHost(null); return }
      const labels = [...form.querySelectorAll(':scope > label')]
      const buscar = texto => labels.find(l => normalizar(l.querySelector(':scope > span')?.textContent) === normalizar(texto))
      const lCat = buscar('Categoría'), lPag = buscar('Pagado por / adelantado por'), lRep = buscar('Repartir entre')
      if (!lCat || !lPag || !lRep) return
      lCat.classList.add('campo-original-oculto-mejora')
      lPag.classList.add('campo-original-oculto-mejora')
      let h = form.querySelector(':scope > .host-mejoras-movimiento')
      if (!h) { h = document.createElement('div'); h.className = 'host-mejoras-movimiento campo-completo'; lRep.insertAdjacentElement('afterend', h) }
      setHost(h)

      const inputs = labels.map(l => ({ label:l, nombre:normalizar(l.querySelector(':scope > span')?.textContent), input:l.querySelector('input,select') }))
      const val = nombre => inputs.find(x => x.nombre === normalizar(nombre))?.input?.value || ''
      setImporte(numero(val('Importe')))
      setModo(val('Repartir entre') || 'no_repartir')
      const cat = val('Categoría')
      if (cat) {
        const conocida = CATEGORIAS.find(c => normalizar(c) === normalizar(cat))
        setCategoria(conocida || 'Otra')
        setOtraCategoria(conocida ? '' : cat)
      }
      const pag = val('Pagado por / adelantado por')
      if (pag) {
        const persona = (datos.personas || []).find(p => normalizar(p.nombre) === normalizar(pag))
        setPagadoPor(persona ? persona.nombre : 'Otra persona / organización')
        setOtroPagador(persona ? '' : pag)
      }
    }
    preparar()
    const obs = new MutationObserver(preparar)
    obs.observe(document.body, { childList:true, subtree:true })
    return () => obs.disconnect()
  }, [datos.personas])

  useEffect(() => {
    if (!host) return
    const form = host.closest('form')
    const actualizar = () => {
      const labels = [...form.querySelectorAll(':scope > label')]
      const por = t => labels.find(l => normalizar(l.querySelector(':scope > span')?.textContent) === normalizar(t))?.querySelector('input,select')
      setImporte(numero(por('Importe')?.value))
      setModo(por('Repartir entre')?.value || 'no_repartir')
    }
    form.addEventListener('input', actualizar)
    form.addEventListener('change', actualizar)
    return () => { form.removeEventListener('input', actualizar); form.removeEventListener('change', actualizar) }
  }, [host])

  useEffect(() => {
    const click = async e => {
      const b = e.target.closest('.lista-movimientos .boton-enlace')
      if (!b || normalizar(b.textContent) !== 'editar') return
      const articulo = b.closest('article')
      const concepto = articulo?.querySelector('.movimiento-principal > strong')?.textContent?.trim()
      const fresco = await cargar()
      const item = (fresco?.movimientos || []).find(m => m.concepto === concepto)
      if (!item) return
      setIdEditando(item.id_movimiento)
      setSeleccion((item.reparto_personas || []).map(numero))
      const cat = item.categoria || ''
      const conocida = CATEGORIAS.find(c => normalizar(c) === normalizar(cat))
      setCategoria(conocida || (cat ? 'Otra' : ''))
      setOtraCategoria(conocida ? '' : cat)
      const persona = (fresco?.personas || []).find(p => normalizar(p.nombre) === normalizar(item.pagado_por))
      setPagadoPor(persona ? persona.nombre : (item.pagado_por ? 'Otra persona / organización' : ''))
      setOtroPagador(persona ? '' : (item.pagado_por || ''))
    }
    document.addEventListener('click', click)
    return () => document.removeEventListener('click', click)
  }, [cargar])

  useEffect(() => {
    if (!host) return
    const form = host.closest('form')
    const onSubmit = () => {
      const labels = [...form.querySelectorAll(':scope > label')]
      const por = t => labels.find(l => normalizar(l.querySelector(':scope > span')?.textContent) === normalizar(t))?.querySelector('input,select')
      const concepto = por('Concepto')?.value?.trim()
      const fecha = por('Fecha')?.value
      const imp = numero(por('Importe')?.value)
      const modoActual = por('Repartir entre')?.value
      if (modoActual !== 'manual') return
      const ids = [...seleccion]
      const editando = idEditando
      window.setTimeout(async () => {
        const fresco = await cargar()
        const candidato = editando
          ? (fresco?.movimientos || []).find(m => numero(m.id_movimiento) === numero(editando))
          : (fresco?.movimientos || []).find(m => m.concepto === concepto && m.fecha === fecha && Math.abs(numero(m.importe)-imp) < .001)
        if (candidato) await supabaseCampeonato.rpc('admin_economia_guardar_reparto_manual', { p_codigo:codigo, p_id_movimiento:candidato.id_movimiento, p_personas:ids })
        setIdEditando(null)
        setSeleccion([])
        await cargar()
      }, 700)
    }
    form.addEventListener('submit', onSubmit)
    return () => form.removeEventListener('submit', onSubmit)
  }, [host, seleccion, idEditando, codigo, cargar])

  const jugadores = useMemo(() => datos.personas.filter(p => p.tipo === 'jugador'), [datos.personas])
  const asistentes = useMemo(() => {
    const form = host?.closest('form')
    const actividad = [...(form?.querySelectorAll(':scope > label') || [])].find(l => normalizar(l.querySelector(':scope > span')?.textContent) === 'actividad')?.querySelector('select')?.value
    if (!actividad) return datos.personas
    return datos.personas.filter(p => p.asistencias?.some(a => numero(a.id_actividad) === numero(actividad) && a.asiste))
  }, [datos.personas, host, modo])

  function sincronizarCampo(nombre, valor) {
    const form = host?.closest('form'); if (!form) return
    const label = [...form.querySelectorAll(':scope > label')].find(l => normalizar(l.querySelector(':scope > span')?.textContent) === normalizar(nombre))
    ponerValorReact(label?.querySelector('input'), valor)
  }
  function toggle(id) { setSeleccion(s => s.includes(numero(id)) ? s.filter(x => x !== numero(id)) : [...s, numero(id)]) }

  if (!host) return null
  const porPersona = seleccion.length ? importe / seleccion.length : 0
  return createPortal(
    <div className="mejoras-movimiento">
      <div className="mejoras-dos-columnas">
        <label><span>Categoría</span><select value={categoria} onChange={e => { const v=e.target.value; setCategoria(v); const final=v==='Otra'?otraCategoria:v; sincronizarCampo('Categoría', final) }}><option value="">Seleccionar categoría…</option>{CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}<option value="Otra">Otra…</option></select></label>
        {categoria === 'Otra' && <label><span>Otra categoría</span><input value={otraCategoria} onChange={e => { setOtraCategoria(e.target.value); sincronizarCampo('Categoría', e.target.value) }} placeholder="Escribe la categoría" /></label>}
        <label><span>Pagado por / adelantado por</span><select value={pagadoPor} onChange={e => { const v=e.target.value; setPagadoPor(v); const final=v==='Otra persona / organización'?otroPagador:v; sincronizarCampo('Pagado por / adelantado por', final) }}><option value="">Seleccionar…</option>{datos.personas.map(p => <option key={p.id_persona} value={p.nombre}>{p.nombre} · {p.tipo === 'jugador' ? 'Jugador' : 'Asistente'}</option>)}<option value="Otra persona / organización">Otra persona / organización…</option></select></label>
        {pagadoPor === 'Otra persona / organización' && <label><span>Nombre del pagador</span><input value={otroPagador} onChange={e => { setOtroPagador(e.target.value); sincronizarCampo('Pagado por / adelantado por', e.target.value) }} placeholder="Organización u otra persona" /></label>}
      </div>
      {modo === 'manual' && <section className="reparto-manual-panel"><header><div><strong>¿Entre quiénes se reparte?</strong><p>Selecciona las personas que deben asumir este gasto, independientemente de quién lo haya adelantado.</p></div><b>{seleccion.length} seleccionados</b></header><div className="reparto-rapido"><button type="button" onClick={() => setSeleccion(jugadores.map(p=>numero(p.id_persona)))}>Todos los jugadores</button><button type="button" onClick={() => setSeleccion(asistentes.map(p=>numero(p.id_persona)))}>Todos los asistentes</button><button type="button" onClick={() => setSeleccion([])}>Ninguno</button></div><div className="reparto-personas">{datos.personas.map(p => <label key={p.id_persona} className={seleccion.includes(numero(p.id_persona))?'seleccionado':''}><input type="checkbox" checked={seleccion.includes(numero(p.id_persona))} onChange={() => toggle(p.id_persona)} /><span><strong>{p.nombre}</strong><small>{p.tipo === 'jugador' ? 'Jugador' : 'Asistente / invitado'}</small></span></label>)}</div><div className="reparto-calculo"><span>Reparto calculado</span><strong>{importe.toLocaleString('es-ES',{style:'currency',currency:'EUR'})} ÷ {seleccion.length || 0} = {porPersona.toLocaleString('es-ES',{style:'currency',currency:'EUR'})} por persona</strong></div></section>}
    </div>, host
  )
}

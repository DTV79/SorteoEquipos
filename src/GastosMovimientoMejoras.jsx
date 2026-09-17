import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './GastosMovimientoMejoras.css'

const CATEGORIAS = ['Pistas','Pelotas','Premios / trofeos','Comida / bebida','Material','Música / animación','Alquiler / equipamiento','Transporte','Otros']
const numero = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const normalizar = (v) => String(v || '').trim().toLowerCase()

function ponerValorReact(campo, valor) {
  if (!campo) return
  const proto = campo.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  setter?.call(campo, valor)
  campo.dispatchEvent(new Event('input', { bubbles: true }))
  campo.dispatchEvent(new Event('change', { bubbles: true }))
}

export default function GastosMovimientoMejoras({ codigo }) {
  const [host, setHost] = useState(null)
  const [hostCantidad, setHostCantidad] = useState(null)
  const [datos, setDatos] = useState({ personas: [], movimientos: [] })
  const [categoria, setCategoria] = useState('')
  const [otraCategoria, setOtraCategoria] = useState('')
  const [pagadoPor, setPagadoPor] = useState('')
  const [otroPagador, setOtroPagador] = useState('')
  const [modo, setModo] = useState('no_repartir')
  const [seleccion, setSeleccion] = useState([])
  const [importe, setImporte] = useState(0)
  const [cantidad, setCantidad] = useState('')
  const [idEditando, setIdEditando] = useState(null)
  const formActual = useRef(null)
  const vigilanciaSubmit = useRef(null)

  const cargar = useCallback(async () => {
    if (!codigo) return null
    const { data } = await supabaseCampeonato.rpc('admin_obtener_economia', { p_codigo: codigo })
    if (data?.ok) {
      setDatos({ personas: (data.personas || []).filter((p) => p.activo), movimientos: data.movimientos || [] })
      return data
    }
    return null
  }, [codigo])

  const preparar = useCallback(async () => {
    const form = document.querySelector('.gastos-campeonato .formulario-movimiento-bloque form.formulario-economia')
    if (!form) { setHost(null); setHostCantidad(null); formActual.current = null; return }
    const fresco = await cargar()
    const labels = [...form.querySelectorAll(':scope > label')]
    const buscar = (t) => labels.find((l) => normalizar(l.querySelector(':scope > span')?.textContent) === normalizar(t))
    const lCat = buscar('Categoría'), lPag = buscar('Pagado por / adelantado por'), lRep = buscar('Repartir entre'), lConcepto = buscar('Concepto')
    if (!lCat || !lPag || !lRep || !lConcepto) return

    lCat.classList.add('campo-original-oculto-mejora')
    lPag.classList.add('campo-original-oculto-mejora')
    lRep.classList.add('campo-original-oculto-mejora')

    let hc = form.querySelector(':scope > .host-cantidad-movimiento')
    if (!hc) {
      hc = document.createElement('div')
      hc.className = 'host-cantidad-movimiento'
      lConcepto.insertAdjacentElement('afterend', hc)
    }
    let h = form.querySelector(':scope > .host-mejoras-movimiento')
    if (!h) {
      h = document.createElement('div')
      h.className = 'host-mejoras-movimiento campo-completo'
      lRep.insertAdjacentElement('afterend', h)
    }
    setHostCantidad(hc)
    setHost(h)
    formActual.current = form

    const cat = lCat.querySelector('input')?.value || ''
    const pag = lPag.querySelector('input')?.value || ''
    const rep = lRep.querySelector('select')?.value || 'no_repartir'
    const imp = buscar('Importe')?.querySelector('input')?.value
    setImporte(numero(imp))
    setModo(rep)
    if (cat) {
      const conocida = CATEGORIAS.find((c) => normalizar(c) === normalizar(cat))
      setCategoria(conocida || 'Otra')
      setOtraCategoria(conocida ? '' : cat)
    } else { setCategoria(''); setOtraCategoria('') }
    if (pag) {
      const persona = (fresco?.personas || []).find((p) => normalizar(p.nombre) === normalizar(pag))
      setPagadoPor(persona ? persona.nombre : 'Otra persona / organización')
      setOtroPagador(persona ? '' : pag)
    } else { setPagadoPor(''); setOtroPagador('') }
  }, [cargar])

  const vigilarRestauracion = useCallback(() => {
    if (vigilanciaSubmit.current) window.clearInterval(vigilanciaSubmit.current)
    const inicio = Date.now()
    vigilanciaSubmit.current = window.setInterval(() => {
      const form = document.querySelector('.gastos-campeonato .formulario-movimiento-bloque form.formulario-economia')
      if (!form) {
        if (Date.now() - inicio > 8000) {
          window.clearInterval(vigilanciaSubmit.current)
          vigilanciaSubmit.current = null
        }
        return
      }
      const faltanMejoras =
        !form.querySelector(':scope > .host-mejoras-movimiento') ||
        !form.querySelector(':scope > .host-cantidad-movimiento')
      if (faltanMejoras) {
        window.clearInterval(vigilanciaSubmit.current)
        vigilanciaSubmit.current = null
        window.setTimeout(preparar, 20)
        return
      }
      if (Date.now() - inicio > 8000) {
        window.clearInterval(vigilanciaSubmit.current)
        vigilanciaSubmit.current = null
      }
    }, 180)
  }, [preparar])

  useEffect(() => {
    cargar()
    const click = (e) => {
      const tab = e.target.closest('.gastos-pestanas button')
      if (tab) {
        if (tab.textContent?.includes('Gastos e ingresos')) {
          window.setTimeout(preparar, 0)
          window.setTimeout(preparar, 120)
        } else {
          setHost(null); setHostCantidad(null)
        }
      }
      const editar = e.target.closest('.lista-movimientos .boton-enlace')
      if (editar && normalizar(editar.textContent) === 'editar') {
        window.setTimeout(async () => {
          const fresco = await cargar()
          const articulo = editar.closest('article')
          const concepto = articulo?.querySelector('.movimiento-principal > strong')?.textContent?.trim()
          const item = (fresco?.movimientos || []).find((m) => m.concepto === concepto)
          if (item) {
            setIdEditando(item.id_movimiento)
            setSeleccion((item.reparto_personas || []).map(numero))
            setModo(item.modo_reparto || 'no_repartir')
            setCantidad(item.cantidad == null ? '' : String(item.cantidad))
            const cat = item.categoria || ''
            const conocida = CATEGORIAS.find((c) => normalizar(c) === normalizar(cat))
            setCategoria(conocida || (cat ? 'Otra' : ''))
            setOtraCategoria(conocida ? '' : cat)
            const persona = (fresco?.personas || []).find((p) => normalizar(p.nombre) === normalizar(item.pagado_por))
            setPagadoPor(persona ? persona.nombre : (item.pagado_por ? 'Otra persona / organización' : ''))
            setOtroPagador(persona ? '' : (item.pagado_por || ''))
          }
          preparar()
        }, 80)
      }
    }
    document.addEventListener('click', click)
    return () => {
      document.removeEventListener('click', click)
      if (vigilanciaSubmit.current) {
        window.clearInterval(vigilanciaSubmit.current)
        vigilanciaSubmit.current = null
      }
    }
  }, [cargar, preparar])

  useEffect(() => {
    const form = formActual.current
    if (!form || !host) return
    const actualizar = (e) => {
      const nombre = normalizar(e.target?.closest?.('label')?.querySelector(':scope > span')?.textContent)
      if (nombre === 'importe') setImporte(numero(e.target.value))
    }
    form.addEventListener('input', actualizar)
    form.addEventListener('change', actualizar)
    return () => { form.removeEventListener('input', actualizar); form.removeEventListener('change', actualizar) }
  }, [host])

  useEffect(() => {
    const form = formActual.current
    if (!form || !host) return
    const onSubmit = () => {
      vigilarRestauracion()
      const labels = [...form.querySelectorAll(':scope > label')]
      const por = (t) => labels.find((l) => normalizar(l.querySelector(':scope > span')?.textContent) === normalizar(t))?.querySelector('input,select')
      const concepto = por('Concepto')?.value?.trim()
      const fecha = por('Fecha')?.value
      const imp = numero(por('Importe')?.value)
      const ids = [...seleccion]
      const editando = idEditando
      const cant = cantidad === '' ? null : numero(cantidad)
      window.setTimeout(async () => {
        const fresco = await cargar()
        const candidato = editando
          ? (fresco?.movimientos || []).find((m) => numero(m.id_movimiento) === numero(editando))
          : (fresco?.movimientos || []).find((m) => m.concepto === concepto && m.fecha === fecha && Math.abs(numero(m.importe) - imp) < .001)
        if (candidato) {
          await supabaseCampeonato.rpc('admin_economia_guardar_cantidad_movimiento', { p_codigo: codigo, p_id_movimiento: candidato.id_movimiento, p_cantidad: cant })
          await supabaseCampeonato.rpc('admin_economia_guardar_reparto_manual', { p_codigo: codigo, p_id_movimiento: candidato.id_movimiento, p_personas: modo === 'manual' ? ids : [] })
        }
        setIdEditando(null); setSeleccion([]); setCantidad('')
        await cargar()
        vigilarRestauracion()
      }, 900)
    }
    form.addEventListener('submit', onSubmit)
    return () => form.removeEventListener('submit', onSubmit)
  }, [host, modo, seleccion, cantidad, idEditando, codigo, cargar, vigilarRestauracion])

  const jugadores = useMemo(() => datos.personas.filter((p) => p.tipo === 'jugador'), [datos.personas])
  const asistentes = useMemo(() => datos.personas.filter((p) => p.asistencias?.some((a) => a.asiste)), [datos.personas])
  function sincronizarCampo(nombre, valor) {
    const form = formActual.current
    if (!form) return
    const label = [...form.querySelectorAll(':scope > label')].find((l) => normalizar(l.querySelector(':scope > span')?.textContent) === normalizar(nombre))
    ponerValorReact(label?.querySelector('input,select'), valor)
  }
  function cambiarModo(valor) { setModo(valor); sincronizarCampo('Repartir entre', valor); if (valor !== 'manual') setSeleccion([]) }
  function toggle(id) { setSeleccion((s) => s.includes(numero(id)) ? s.filter((x) => x !== numero(id)) : [...s, numero(id)]) }
  const porPersona = seleccion.length ? importe / seleccion.length : 0

  return <>
    {hostCantidad && createPortal(
      <label className="campo-cantidad-mejora"><span>Cantidad <small>(opcional)</small></span><input type="number" min="0" step="any" inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="Ej. 2" /></label>,
      hostCantidad
    )}
    {host && createPortal(
      <div className="mejoras-movimiento"><div className="mejoras-dos-columnas">
        <label><span>Categoría</span><select value={categoria} onChange={(e) => { const v=e.target.value; setCategoria(v); sincronizarCampo('Categoría', v==='Otra' ? otraCategoria : v) }}><option value="">Seleccionar categoría…</option>{CATEGORIAS.map((c)=><option key={c} value={c}>{c}</option>)}<option value="Otra">Otra…</option></select></label>
        {categoria==='Otra' && <label><span>Otra categoría</span><input value={otraCategoria} onChange={(e)=>{setOtraCategoria(e.target.value);sincronizarCampo('Categoría',e.target.value)}} placeholder="Escribe la categoría" /></label>}
        <label><span>Pagado por / adelantado por</span><select value={pagadoPor} onChange={(e)=>{const v=e.target.value;setPagadoPor(v);sincronizarCampo('Pagado por / adelantado por',v==='Otra persona / organización'?otroPagador:v)}}><option value="">Seleccionar…</option>{datos.personas.map((p)=><option key={p.id_persona} value={p.nombre}>{p.nombre} · {p.tipo==='jugador'?'Jugador':'Asistente'}</option>)}<option value="Otra persona / organización">Otra persona / organización…</option></select></label>
        {pagadoPor==='Otra persona / organización' && <label><span>Nombre del pagador</span><input value={otroPagador} onChange={(e)=>{setOtroPagador(e.target.value);sincronizarCampo('Pagado por / adelantado por',e.target.value)}} placeholder="Escribe el nombre" /></label>}
        <label className="selector-reparto-mejorado"><span>Repartir este pago entre</span><select value={modo} onChange={(e)=>cambiarModo(e.target.value)}><option value="no_repartir">No repartir</option><option value="jugadores">Jugadores del campeonato</option><option value="actividad">Asistentes a la actividad</option><option value="manual">Selección / reparto manual</option></select></label>
      </div>
      {modo==='manual' && <section className="reparto-manual-panel"><header><div><strong>¿Entre quiénes se reparte?</strong><p>Selecciona quién debe asumir este gasto. Puede ser distinto de quien adelantó el dinero.</p></div><b>{seleccion.length} seleccionados</b></header><div className="reparto-rapido"><button type="button" onClick={()=>setSeleccion(jugadores.map((p)=>numero(p.id_persona)))}>Todos los jugadores</button><button type="button" onClick={()=>setSeleccion(asistentes.map((p)=>numero(p.id_persona)))}>Todos los asistentes</button><button type="button" onClick={()=>setSeleccion([])}>Ninguno</button></div><div className="reparto-personas">{datos.personas.map((p)=><label key={p.id_persona} className={seleccion.includes(numero(p.id_persona))?'seleccionado':''}><input type="checkbox" checked={seleccion.includes(numero(p.id_persona))} onChange={()=>toggle(p.id_persona)} /><span><strong>{p.nombre}</strong><small>{p.tipo==='jugador'?'Jugador':'Asistente / invitado'}</small></span></label>)}</div><div className="reparto-calculo"><span>Reparto calculado</span><strong>{importe.toLocaleString('es-ES',{style:'currency',currency:'EUR'})} ÷ {seleccion.length||0} = {porPersona.toLocaleString('es-ES',{style:'currency',currency:'EUR'})} por persona</strong></div></section>}
      </div>, host
    )}
  </>
}

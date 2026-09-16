import { useEffect, useState } from 'react'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './IncidenciasPartidosOverlay.css'

const EVENTO = 'sprint-padel-incidencia-partido'

function idDesdeTarjeta(tarjeta) {
  const texto = tarjeta.querySelector('.partido-cabecera-campeonato span')?.textContent || ''
  const partes = texto.split(' · ')
  return partes[partes.length - 1]?.trim() || ''
}

export default function IncidenciasPartidosOverlay() {
  const [incidencia, setIncidencia] = useState(null)
  const [partido, setPartido] = useState(null)
  const [ganador, setGanador] = useState('')
  const [motivo, setMotivo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [sets, setSets] = useState([{a:'',b:'',finalizado:true},{a:'',b:'',finalizado:true},{a:'',b:'',finalizado:false}])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const preparar = () => {
      document.querySelectorAll('form.tarjeta-partido-campeonato').forEach((tarjeta) => {
        if (tarjeta.querySelector('.acciones-incidencias-partido')) return
        const id = idDesdeTarjeta(tarjeta)
        if (!id) return
        const contenedor = document.createElement('div')
        contenedor.className = 'acciones-incidencias-partido'
        const wo = document.createElement('button')
        wo.type = 'button'; wo.className = 'boton boton-secundario boton-wo'; wo.textContent = 'Resolver W.O.'
        const ret = document.createElement('button')
        ret.type = 'button'; ret.className = 'boton boton-secundario boton-retirada'; ret.textContent = 'Finalizar por retirada'
        wo.onclick = () => window.dispatchEvent(new CustomEvent(EVENTO,{detail:{id,tipo:'WO'}}))
        ret.onclick = () => window.dispatchEvent(new CustomEvent(EVENTO,{detail:{id,tipo:'RETIRADA'}}))
        contenedor.append(wo,ret)
        tarjeta.querySelector('.datos-partido-campeonato')?.appendChild(contenedor)
      })
    }
    preparar()
    const observer = new MutationObserver(preparar)
    observer.observe(document.body,{childList:true,subtree:true})
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const abrir = async (evento) => {
      const codigo = window.sessionStorage.getItem('sprint-padel-campeonato-seleccionado')
      if (!codigo) return
      const {data,error:err} = await supabaseCampeonato.rpc('admin_listar_partidos',{p_codigo:codigo})
      if (err || data?.ok !== true) { setError(err?.message || data?.error || 'No se pudo cargar el partido.'); return }
      const p = (data.partidos || []).find(x => x.id_partido === evento.detail.id)
      if (!p) { setError('No se encontró el partido.'); return }
      setPartido(p); setIncidencia(evento.detail.tipo); setGanador(p.id_equipo_ganador_admin || '')
      setMotivo(p.motivo_resolucion || (evento.detail.tipo === 'WO' ? 'No presentado' : 'Lesión / imposibilidad de continuar'))
      setDetalle(p.detalle_resolucion || '')
      setSets([1,2,3].map((n) => { const s=(p.sets||[]).find(x=>Number(x.numero_set)===n); return {a:s?.juegos_equipo_1 ?? '',b:s?.juegos_equipo_2 ?? '',finalizado:s ? Boolean(s.finalizado) : n<3} }))
      setError('')
    }
    window.addEventListener(EVENTO,abrir)
    return () => window.removeEventListener(EVENTO,abrir)
  }, [])

  const cerrar = () => { if (!guardando) { setIncidencia(null); setPartido(null); setError('') } }

  async function resolver() {
    if (!partido || !ganador) { setError('Selecciona el equipo ganador.'); return }
    let pSets=[]
    if (incidencia === 'RETIRADA') {
      for (const s of sets) {
        if (s.a === '' && s.b === '') continue
        if (s.a === '' || s.b === '') { setError('Completa los dos valores de cada set utilizado.'); return }
        pSets.push({juegos_equipo_1:Number(s.a),juegos_equipo_2:Number(s.b),finalizado:Boolean(s.finalizado)})
      }
      if (!pSets.length) { setError('En una retirada indica el marcador que llegó a jugarse.'); return }
    }
    setGuardando(true); setError('')
    const {data,error:err}=await supabaseCampeonato.rpc('admin_resolver_incidencia',{
      p_id_partido:partido.id_partido,p_tipo:incidencia,p_id_equipo_ganador:ganador,p_motivo:motivo || null,p_detalle:detalle || null,p_sets:pSets,p_pista:partido.pista ?? null,p_duracion_min:partido.duracion_min ?? null
    })
    if (err || data?.ok !== true) { setError(err?.message || data?.error || 'No se pudo resolver el partido.'); setGuardando(false); return }
    if (['MM','PP'].includes(partido.codigo_fase)) {
      const codigo=window.sessionStorage.getItem('sprint-padel-campeonato-seleccionado')
      const {error:errorCuadro}=await supabaseCampeonato.rpc('admin_actualizar_cuadro',{p_codigo:codigo})
      if (errorCuadro) { setError(`Incidencia guardada, pero no se pudo actualizar el cuadro: ${errorCuadro.message}`); setGuardando(false); return }
    }
    const tarjeta=[...document.querySelectorAll('form.tarjeta-partido-campeonato')].find(x=>idDesdeTarjeta(x)===partido.id_partido)
    if (tarjeta) {
      const badge=tarjeta.querySelector('.badge-partido'); if (badge) { badge.textContent=incidencia==='WO'?'W.O.':'Retirada'; badge.className=`badge-partido jugado ${incidencia.toLowerCase()}` }
      let resumen=tarjeta.querySelector('.resumen-incidencia-partido'); if(!resumen){resumen=document.createElement('p');resumen.className='resumen-incidencia-partido';tarjeta.querySelector('.equipos-campeonato')?.after(resumen)}
      const nombreGanador=ganador===partido.id_equipo_1?partido.equipo_1:partido.equipo_2
      resumen.textContent=`${incidencia==='WO'?'Ganador por W.O.':'Ganador por retirada'}: ${nombreGanador}${motivo?` · ${motivo}`:''}`
    }
    setGuardando(false); cerrar()
  }

  if (!incidencia || !partido) return null
  return <div className="modal-fondo modal-incidencia-fondo" onMouseDown={cerrar}>
    <div className="modal-confirmacion modal-incidencia-partido" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}>
      <h3>{incidencia==='WO'?'Resolver partido por W.O.':'Finalizar partido por retirada'}</h3>
      <p><strong>{partido.equipo_1}</strong> contra <strong>{partido.equipo_2}</strong></p>
      <label><span>Equipo ganador</span><select value={ganador} onChange={e=>setGanador(e.target.value)}><option value="">Seleccionar…</option><option value={partido.id_equipo_1}>{partido.equipo_1}</option><option value={partido.id_equipo_2}>{partido.equipo_2}</option></select></label>
      <label><span>Motivo</span><select value={motivo} onChange={e=>setMotivo(e.target.value)}>{incidencia==='WO'?<><option>No presentado</option><option>Lesión sin sustituto antes de empezar</option><option>Decisión de la organización</option><option>Otro</option></>:<><option>Lesión / imposibilidad de continuar</option><option>Abandono</option><option>Decisión de la organización</option><option>Otro</option></>}</select></label>
      {incidencia==='RETIRADA' && <div className="sets-incidencia"><strong>Marcador realmente jugado</strong><small>Marca como finalizados solo los sets que terminaron. El set en curso conserva sus puntos, pero no cuenta como set ganado.</small>{sets.map((s,i)=><div className="fila-set-incidencia" key={i}><b>Set {i+1}</b><input type="number" min="0" value={s.a} onChange={e=>setSets(v=>v.map((x,j)=>j===i?{...x,a:e.target.value}:x))}/><span>–</span><input type="number" min="0" value={s.b} onChange={e=>setSets(v=>v.map((x,j)=>j===i?{...x,b:e.target.value}:x))}/><label><input type="checkbox" checked={s.finalizado} onChange={e=>setSets(v=>v.map((x,j)=>j===i?{...x,finalizado:e.target.checked}:x))}/> Finalizado</label></div>)}</div>}
      <label><span>Detalle opcional</span><textarea rows="3" value={detalle} onChange={e=>setDetalle(e.target.value)} placeholder="Observaciones para el histórico"/></label>
      {incidencia==='WO' && <p className="nota-incidencia">No se inventará ningún marcador. Cuenta la victoria/derrota para la clasificación, pero no sets, puntos de juego ni ISP.</p>}
      {error && <p className="mensaje-partido error">{error}</p>}
      <div className="modal-acciones"><button type="button" className="boton boton-secundario" disabled={guardando} onClick={cerrar}>Cancelar</button><button type="button" className="boton boton-principal" disabled={guardando} onClick={resolver}>{guardando?'Guardando…':incidencia==='WO'?'Confirmar W.O.':'Confirmar retirada'}</button></div>
    </div>
  </div>
}

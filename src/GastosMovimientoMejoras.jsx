import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './GastosMovimientoMejoras.css'

const CATEGORIAS = ['Pistas', 'Pelotas', 'Premios / trofeos', 'Comida / bebida', 'Material', 'Música / animación', 'Alquiler / equipamiento', 'Transporte', 'Otros']
function numero(v){const n=Number(v);return Number.isFinite(n)?n:0}
function normalizar(v){return String(v||'').trim().toLowerCase()}
function ponerValorReact(campo,valor){if(!campo)return;const proto=campo.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;setter?.call(campo,valor);campo.dispatchEvent(new Event('input',{bubbles:true}));campo.dispatchEvent(new Event('change',{bubbles:true}))}

export default function GastosMovimientoMejoras({codigo}){
 const [host,setHost]=useState(null),[datos,setDatos]=useState({personas:[],movimientos:[]}),[categoria,setCategoria]=useState(''),[otraCategoria,setOtraCategoria]=useState(''),[pagadoPor,setPagadoPor]=useState(''),[otroPagador,setOtroPagador]=useState(''),[modo,setModo]=useState('no_repartir'),[seleccion,setSeleccion]=useState([]),[importe,setImporte]=useState(0),[idEditando,setIdEditando]=useState(null)
 const cargar=useCallback(async()=>{if(!codigo)return null;const{data}=await supabaseCampeonato.rpc('admin_obtener_economia',{p_codigo:codigo});if(data?.ok){setDatos({personas:(data.personas||[]).filter(p=>p.activo),movimientos:data.movimientos||[]});return data}return null},[codigo])
 useEffect(()=>{cargar()},[cargar])

 useEffect(()=>{
  function preparar(){
   const form=document.querySelector('.gastos-campeonato .formulario-movimiento-bloque form.formulario-economia');if(!form){setHost(null);return}
   const labels=[...form.querySelectorAll(':scope > label')],buscar=t=>labels.find(l=>normalizar(l.querySelector(':scope > span')?.textContent)===normalizar(t))
   const lCat=buscar('Categoría'),lPag=buscar('Pagado por / adelantado por'),lRep=buscar('Repartir entre');if(!lCat||!lPag||!lRep)return
   lCat.classList.add('campo-original-oculto-mejora');lPag.classList.add('campo-original-oculto-mejora');lRep.classList.add('campo-original-oculto-mejora')
   let h=form.querySelector(':scope > .host-mejoras-movimiento');if(!h){h=document.createElement('div');h.className='host-mejoras-movimiento campo-completo';lRep.insertAdjacentElement('afterend',h)}setHost(h)
   if(h.dataset.inicializado==='1')return
   h.dataset.inicializado='1'
   const cat=lCat.querySelector('input')?.value||'',pag=lPag.querySelector('input')?.value||'',rep=lRep.querySelector('select')?.value||'no_repartir',imp=buscar('Importe')?.querySelector('input')?.value
   setImporte(numero(imp));setModo(rep)
   if(cat){const conocida=CATEGORIAS.find(c=>normalizar(c)===normalizar(cat));setCategoria(conocida||'Otra');setOtraCategoria(conocida?'':cat)}
   if(pag){const persona=(datos.personas||[]).find(p=>normalizar(p.nombre)===normalizar(pag));setPagadoPor(persona?persona.nombre:'Otra persona / organización');setOtroPagador(persona?'':pag)}
  }
  preparar();const obs=new MutationObserver(preparar);obs.observe(document.body,{childList:true,subtree:true});return()=>obs.disconnect()
 },[datos.personas])

 useEffect(()=>{if(!host)return;const form=host.closest('form');const actualizar=e=>{const nombre=normalizar(e.target?.closest?.('label')?.querySelector(':scope > span')?.textContent);if(nombre==='importe')setImporte(numero(e.target.value))};form.addEventListener('input',actualizar);form.addEventListener('change',actualizar);return()=>{form.removeEventListener('input',actualizar);form.removeEventListener('change',actualizar)}},[host])

 useEffect(()=>{const click=async e=>{const b=e.target.closest('.lista-movimientos .boton-enlace');if(!b||normalizar(b.textContent)!=='editar')return;const concepto=b.closest('article')?.querySelector('.movimiento-principal > strong')?.textContent?.trim(),fresco=await cargar(),item=(fresco?.movimientos||[]).find(m=>m.concepto===concepto);if(!item)return;setIdEditando(item.id_movimiento);setSeleccion((item.reparto_personas||[]).map(numero));setModo(item.modo_reparto||'no_repartir');const cat=item.categoria||'',conocida=CATEGORIAS.find(c=>normalizar(c)===normalizar(cat));setCategoria(conocida||(cat?'Otra':''));setOtraCategoria(conocida?'':cat);const persona=(fresco?.personas||[]).find(p=>normalizar(p.nombre)===normalizar(item.pagado_por));setPagadoPor(persona?persona.nombre:(item.pagado_por?'Otra persona / organización':''));setOtroPagador(persona?'':(item.pagado_por||''))};document.addEventListener('click',click);return()=>document.removeEventListener('click',click)},[cargar])

 useEffect(()=>{if(!host)return;const form=host.closest('form'),onSubmit=()=>{const labels=[...form.querySelectorAll(':scope > label')],por=t=>labels.find(l=>normalizar(l.querySelector(':scope > span')?.textContent)===normalizar(t))?.querySelector('input,select'),concepto=por('Concepto')?.value?.trim(),fecha=por('Fecha')?.value,imp=numero(por('Importe')?.value);if(modo!=='manual')return;const ids=[...seleccion],editando=idEditando;window.setTimeout(async()=>{const fresco=await cargar(),candidato=editando?(fresco?.movimientos||[]).find(m=>numero(m.id_movimiento)===numero(editando)):(fresco?.movimientos||[]).find(m=>m.concepto===concepto&&m.fecha===fecha&&Math.abs(numero(m.importe)-imp)<.001);if(candidato)await supabaseCampeonato.rpc('admin_economia_guardar_reparto_manual',{p_codigo:codigo,p_id_movimiento:candidato.id_movimiento,p_personas:ids});setIdEditando(null);setSeleccion([]);await cargar()},700)};form.addEventListener('submit',onSubmit);return()=>form.removeEventListener('submit',onSubmit)},[host,modo,seleccion,idEditando,codigo,cargar])

 const jugadores=useMemo(()=>datos.personas.filter(p=>p.tipo==='jugador'),[datos.personas]),asistentes=useMemo(()=>datos.personas.filter(p=>p.asistencias?.some(a=>a.asiste)),[datos.personas])
 function sincronizarCampo(nombre,valor){const form=host?.closest('form');if(!form)return;const label=[...form.querySelectorAll(':scope > label')].find(l=>normalizar(l.querySelector(':scope > span')?.textContent)===normalizar(nombre));ponerValorReact(label?.querySelector('input,select'),valor)}
 function cambiarModo(valor){setModo(valor);sincronizarCampo('Repartir entre',valor);if(valor!=='manual')setSeleccion([])}
 function toggle(id){setSeleccion(s=>s.includes(numero(id))?s.filter(x=>x!==numero(id)):[...s,numero(id)])}
 if(!host)return null
 const porPersona=seleccion.length?importe/seleccion.length:0
 return createPortal(<div className="mejoras-movimiento"><div className="mejoras-dos-columnas">
  <label><span>Categoría</span><select value={categoria} onChange={e=>{const v=e.target.value;setCategoria(v);sincronizarCampo('Categoría',v==='Otra'?otraCategoria:v)}}><option value="">Seleccionar categoría…</option>{CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}<option value="Otra">Otra…</option></select></label>
  {categoria==='Otra'&&<label><span>Otra categoría</span><input value={otraCategoria} onChange={e=>{setOtraCategoria(e.target.value);sincronizarCampo('Categoría',e.target.value)}} placeholder="Escribe la categoría"/></label>}
  <label><span>Pagado por / adelantado por</span><select value={pagadoPor} onChange={e=>{const v=e.target.value;setPagadoPor(v);sincronizarCampo('Pagado por / adelantado por',v==='Otra persona / organización'?otroPagador:v)}}><option value="">Seleccionar…</option>{datos.personas.map(p=><option key={p.id_persona} value={p.nombre}>{p.nombre} · {p.tipo==='jugador'?'Jugador':'Asistente'}</option>)}<option value="Otra persona / organización">Otra persona / organización…</option></select></label>
  {pagadoPor==='Otra persona / organización'&&<label><span>Nombre del pagador</span><input value={otroPagador} onChange={e=>{setOtroPagador(e.target.value);sincronizarCampo('Pagado por / adelantado por',e.target.value)}} placeholder="Escribe el nombre, no hace falta darlo de alta"/></label>}
  <label className="selector-reparto-mejorado"><span>Repartir este pago entre</span><select value={modo} onChange={e=>cambiarModo(e.target.value)}><option value="no_repartir">No repartir</option><option value="jugadores">Jugadores del campeonato</option><option value="actividad">Asistentes a la actividad</option><option value="manual">Selección / reparto manual</option></select></label>
 </div>{modo==='manual'&&<section className="reparto-manual-panel"><header><div><strong>¿Entre quiénes se reparte?</strong><p>Selecciona quién debe asumir este gasto. Puede ser distinto de quien adelantó el dinero.</p></div><b>{seleccion.length} seleccionados</b></header><div className="reparto-rapido"><button type="button" onClick={()=>setSeleccion(jugadores.map(p=>numero(p.id_persona)))}>Todos los jugadores</button><button type="button" onClick={()=>setSeleccion(asistentes.map(p=>numero(p.id_persona)))}>Todos los asistentes</button><button type="button" onClick={()=>setSeleccion([])}>Ninguno</button></div><div className="reparto-personas">{datos.personas.map(p=><label key={p.id_persona} className={seleccion.includes(numero(p.id_persona))?'seleccionado':''}><input type="checkbox" checked={seleccion.includes(numero(p.id_persona))} onChange={()=>toggle(p.id_persona)}/><span><strong>{p.nombre}</strong><small>{p.tipo==='jugador'?'Jugador':'Asistente / invitado'}</small></span></label>)}</div><div className="reparto-calculo"><span>Reparto calculado</span><strong>{importe.toLocaleString('es-ES',{style:'currency',currency:'EUR'})} ÷ {seleccion.length||0} = {porPersona.toLocaleString('es-ES',{style:'currency',currency:'EUR'})} por persona</strong></div></section>}</div>,host)
}

import { useEffect, useState } from 'react'
import { confirmarHorarioTeams, eliminarProgramacionTeams, guardarAlineacionTeams, modificarProgramacionTeams, obtenerDetalleTeams, proponerHorarioTeams, revelarAlineacionesTeams, actualizarPistaTeams, confirmarResultadoTeams, guardarResultadoTeams, impugnarResultadoTeams } from '../teamsApi'
import PartidoAdminCard from './partidos/PartidoAdminCard'
export default function Partidos({teams,onCambio}){
 const [d,setD]=useState(null),[sel,setSel]=useState({}),[agenda,setAgenda]=useState({}),[mensaje,setMensaje]=useState(''),[guardando,setGuardando]=useState(false),[impugnando,setImpugnando]=useState(null)
 async function cargar(){try{setD(await obtenerDetalleTeams(teams.id))}catch(e){setMensaje('Error: '+e.message)}}
 useEffect(()=>{void cargar()},[teams.id])
 if(!d)return <section className="teams-convocatoria"><div className="teams-vacio">Cargando partidos…</div></section>
 const eq=d.equipos||[],miembros=d.miembros||[],als=d.alineaciones||[],partidos=d.partidos||[],propuestas=d.propuestas||[]
 function jugadoresEquipo(eid){return miembros.filter(m=>m.equipo_id===eid&&!m.es_reserva&&m.disponible!==false)}
 function jugadoresElegibles(p,eid,otroId=''){
  const base=jugadoresEquipo(eid), prev=partidos.filter(x=>x.numero<p.numero&&x.estado==='finalizado')
  const prevIds=new Set(prev.map(x=>x.id)), usos={}
  for(const a of als)if(prevIds.has(a.partido_id)&&a.equipo_id===eid)usos[a.id_jugador]=(usos[a.id_jugador]||0)+1
  const sinJugar=base.filter(j=>(usos[j.id_jugador]||0)===0), otroUsos=otroId?(usos[otroId]||0):null
  let lista=base.filter(j=>{
   const n=usos[j.id_jugador]||0
   if(d.teams?.todos_antes_repetir&&sinJugar.length>=2&&n>0)return false
   if(d.teams?.todos_antes_repetir&&sinJugar.length===1&&otroId&&otroUsos>0&&n>0)return false
   if(d.teams?.repetir_jugadores==='no'&&n>0)return false
   if(d.teams?.repetir_jugadores==='maximo'&&d.teams?.max_partidos_jugador&&n>=d.teams.max_partidos_jugador)return false
   return true
  })
  if(otroId&&!d.teams?.repetir_pareja){
   const parejasPrevias=new Set()
   for(const pp of prev){
    const ids=als.filter(a=>a.partido_id===pp.id&&a.equipo_id===eid).map(a=>a.id_jugador)
    if(ids.length===2)parejasPrevias.add(ids.slice().sort().join('|'))
   }
   lista=lista.filter(j=>!parejasPrevias.has([otroId,j.id_jugador].sort().join('|')))
  }
  return lista
 }
 function pareja(pid,eid){return als.filter(a=>a.partido_id===pid&&a.equipo_id===eid).sort((a,b)=>a.orden-b.orden)}
 function valor(pid,eid,n){return sel[pid+'-'+eid+'-'+n]??pareja(pid,eid)[n-1]?.id_jugador??''}
 function setv(pid,eid,n,v){setSel(x=>({...x,[pid+'-'+eid+'-'+n]:v}));setMensaje('')}
 function valorResultado(pid,k){
  const key=pid+'-'+k
  if(Object.prototype.hasOwnProperty.call(agenda,key)) return agenda[key]
  const p=(d.partidos||[]).find(x=>x.id===pid), ss=setsPartido(pid)
  const m=k.match(/^(s|tb)([1-3])([ab])$/)
  if(m){const st=ss.find(x=>x.numero===Number(m[2]));if(!st)return '';const campo=m[1]==='s'?'puntos_'+m[3]:'tiebreak_'+m[3];return st[campo]??''}
  if(k==='fin') return p?.finalizacion||'normal'
  if(k==='duracion') return p?.duracion_minutos??p?.duracion??''
  if(k==='obs') return p?.observaciones??''
  if(k==='ganador') return p?.equipo_ganador_id??''
  return ''
 }
 function ag(pid,k){const key=pid+'-'+k;return Object.prototype.hasOwnProperty.call(agenda,key)?agenda[key]:valorResultado(pid,k)} function sag(pid,k,v){setAgenda(x=>({...x,[pid+'-'+k]:v}));setMensaje('')}
 function props(pid){return propuestas.filter(x=>x.partido_id===pid)}
 function setsPartido(pid){return (d.sets||[]).filter(x=>x.partido_id===pid).sort((a,b)=>a.numero-b.numero)} function incidenciaPartido(pid){return (d.incidencias||[]).find(x=>x.partido_id===pid&&x.estado==='pendiente')}
 function fecha(v){return new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v))}
 async function guardar(p,e){const j1=valor(p.id,e.id,1),j2=valor(p.id,e.id,2);if(!j1||!j2)return setMensaje('Error: Selecciona los dos jugadores de '+e.nombre+'.');setGuardando(true);try{await guardarAlineacionTeams(p.id,e.id,j1,j2);setMensaje('Pareja de '+e.nombre+' guardada correctamente.');await cargar()}catch(x){setMensaje('Error: '+x.message)}finally{setGuardando(false)}}
 async function revelar(p){setGuardando(true);try{await revelarAlineacionesTeams(p.id);setMensaje('Parejas reveladas. Ya podéis concertar el partido.');await cargar();onCambio?.()}catch(x){setMensaje('Error: '+x.message)}finally{setGuardando(false)}}
 async function proponer(p){const fh=ag(p.id,'fecha');if(!fh)return setMensaje('Error: Indica una fecha y hora.');setGuardando(true);try{await proponerHorarioTeams(p.id,new Date(fh).toISOString(),ag(p.id,'pista'));sag(p.id,'fecha','');sag(p.id,'pista','');setMensaje('Propuesta añadida. Puedes añadir más alternativas.');await cargar()}catch(x){setMensaje('Error: '+x.message)}finally{setGuardando(false)}}
 async function confirmar(p,pr){setGuardando(true);try{await confirmarHorarioTeams(p.id,pr.id,ag(p.id,'pistaConfirmada'));setMensaje('Fecha confirmada. Partido programado.');await cargar()}catch(x){setMensaje('Error: '+x.message)}finally{setGuardando(false)}}
 async function modificarProgramacion(p){const fh=ag(p.id,'editarFecha');if(!fh)return setMensaje('Error: Indica la nueva fecha y hora.');setGuardando(true);try{await modificarProgramacionTeams(p.id,new Date(fh).toISOString(),ag(p.id,'editarPista'));setMensaje('Programación modificada.');sag(p.id,'editando','');await cargar()}catch(x){setMensaje('Error: '+x.message)}finally{setGuardando(false)}}
 async function eliminarProgramacion(p){setGuardando(true);try{await eliminarProgramacionTeams(p.id);setMensaje('Fecha eliminada. El partido vuelve a estar pendiente de concertar.');await cargar()}catch(x){setMensaje('Error: '+x.message)}finally{setGuardando(false)}}
 async function pista(p){setGuardando(true);try{await actualizarPistaTeams(p.id,ag(p.id,'pistaFinal'));setMensaje('Club / pista actualizado.');await cargar()}catch(x){setMensaje('Error: '+x.message)}finally{setGuardando(false)}}
 async function guardarResultado(p){const fin=ag(p.id,'fin')||'normal',sets=[1,2,3].map(n=>({numero:n,a:Number(ag(p.id,'s'+n+'a')||0),b:Number(ag(p.id,'s'+n+'b')||0),tiebreak_a:ag(p.id,'tb'+n+'a')===''||ag(p.id,'tb'+n+'a')==null?null:Number(ag(p.id,'tb'+n+'a')),tiebreak_b:ag(p.id,'tb'+n+'b')===''||ag(p.id,'tb'+n+'b')==null?null:Number(ag(p.id,'tb'+n+'b'))})).filter(x=>x.a||x.b||x.tiebreak_a!=null||x.tiebreak_b!=null);const ganador=ag(p.id,'ganador')||null;setGuardando(true);try{await guardarResultadoTeams(p.id,sets,fin,ganador,Number(ag(p.id,'duracion'))||null,ag(p.id,'obs'));setMensaje(fin==='suspendido'||fin==='no_finalizado'?'Partido enviado a incidencias sin otorgar punto.':'Resultado guardado. Pendiente de confirmación rival.');await cargar()}catch(x){setMensaje('Error: '+x.message)}finally{setGuardando(false)}}
 async function confirmarResultado(p){setGuardando(true);try{await confirmarResultadoTeams(p.id);setMensaje('Resultado confirmado y punto adjudicado.');await cargar();onCambio?.()}catch(x){setMensaje('Error: '+x.message)}finally{setGuardando(false)}}
 async function impugnar(p){const motivo=ag(p.id,'motivo');if(!motivo?.trim())return setMensaje('Error: Indica el motivo de la impugnación.');setGuardando(true);try{await impugnarResultadoTeams(p.id,motivo);setMensaje('Resultado impugnado. Se ha creado una incidencia.');setImpugnando(null);await cargar()}catch(x){setMensaje('Error: '+x.message)}finally{setGuardando(false)}}
 const puntosVictoria=Number(d.teams?.puntos_por_victoria||1), oficiales=partidos.filter(p=>p.estado==='finalizado'&&p.equipo_ganador_id), victoriasA=oficiales.filter(p=>p.equipo_ganador_id===eq[0]?.id).length, victoriasB=oficiales.filter(p=>p.equipo_ganador_id===eq[1]?.id).length, marcadorA=victoriasA*puntosVictoria, marcadorB=victoriasB*puntosVictoria, pendientes=Math.max(0,Number(d.teams?.numero_partidos||partidos.length)-oficiales.length)
 function resumenEquipo(eid){
  let sets=0,puntos=0,tb=0,limpias=0
  const usados=new Set()
  for(const p of oficiales){
   const esA=eid===eq[0]?.id, ss=setsPartido(p.id);let sa=0,sb=0
   for(const s of ss){const a=Number(s.puntos_a||0),b=Number(s.puntos_b||0),ta=s.tiebreak_a,tb2=s.tiebreak_b; puntos+=esA?a:b;let ganaA=a>b,ganaB=b>a;if(a===b&&ta!=null&&tb2!=null){ganaA=Number(ta)>Number(tb2);ganaB=Number(tb2)>Number(ta);if((esA&&ganaA)||(!esA&&ganaB))tb++}if(ganaA)sa++;if(ganaB)sb++;if((esA&&ganaA)||(!esA&&ganaB))sets++}
   if(p.equipo_ganador_id===eid&&((esA&&sb===0)||(!esA&&sa===0)))limpias++
   for(const a of als)if(a.partido_id===p.id&&a.equipo_id===eid)usados.add(a.id_jugador)
  }
  return {sets,puntos,tb,limpias,usados:usados.size,total:jugadoresEquipo(eid).length}
 }
 const ra=eq[0]?resumenEquipo(eq[0].id):{}, rb=eq[1]?resumenEquipo(eq[1].id):{}
 const estados={pendiente_alineaciones:'Pendiente de parejas',alineaciones_cerradas:'Parejas cerradas',revelado:'Parejas reveladas',concertando:'Concertando fecha',programado:'Programado',pendiente_resultado:'Pendiente de resultado',pendiente_confirmacion:'Pendiente de confirmación',finalizado:'Finalizado',suspendido:'Suspendido',incidencia:'Incidencia',anulado:'Anulado'}
 return <section className="teams-convocatoria"><div className="teams-seccion-cab"><div><p className="etiqueta">PARTIDOS</p><h2>Partidos del Teams</h2><p>Gestiona las parejas, fecha y avance de cada enfrentamiento.</p></div><div className="teams-contador"><strong>{partidos.length}</strong><span>partidos creados</span></div></div>
 {mensaje&&<p className={mensaje.startsWith('Error:')?'teams-error':'teams-ok'}>{mensaje}</p>}
 {eq.length>=2&&<div className="teams-marcador-serie"><span className="teams-marcador-label">MARCADOR DEL TEAMS</span><div className="teams-marcador-equipos"><div><i className="teams-equipo-dot grande" style={{backgroundColor:eq[0]?.color||'#64748b'}}></i><b>{eq[0]?.nombre}</b></div><strong>{marcadorA} <em>–</em> {marcadorB}</strong><div><i className="teams-equipo-dot grande" style={{backgroundColor:eq[1]?.color||'#64748b'}}></i><b>{eq[1]?.nombre}</b></div></div><small>{oficiales.length} jugados · {pendientes} pendientes</small><div className="teams-resumen-serie"><div className="teams-resumen-head"><span></span><b>{eq[0]?.nombre}</b><b>{eq[1]?.nombre}</b></div><div><span>🏆 Partidos ganados</span><strong>{victoriasA}</strong><strong>{victoriasB}</strong></div><div><span>🎾 Sets ganados</span><strong>{ra.sets}</strong><strong>{rb.sets}</strong></div><div><span>🔢 Juegos / puntos</span><strong>{ra.puntos}</strong><strong>{rb.puntos}</strong></div><div><span>🔥 Tie-breaks ganados</span><strong>{ra.tb}</strong><strong>{rb.tb}</strong></div><div><span>💥 Victorias limpias</span><strong>{ra.limpias}</strong><strong>{rb.limpias}</strong></div><div><span>👥 Jugadores utilizados</span><strong>{ra.usados}/{ra.total}</strong><strong>{rb.usados}/{rb.total}</strong></div></div></div>}
 <div className="teams-partidos-lista">{partidos.map(p => (
  <PartidoAdminCard
    key={p.id}
    p={p}
    eq={eq}
    estados={estados}
    pareja={pareja}
    valor={valor}
    setv={setv}
    jugadoresElegibles={jugadoresElegibles}
    guardando={guardando}
    guardar={guardar}
    revelar={revelar}
    ag={ag}
    sag={sag}
    proponer={proponer}
    props={props}
    fecha={fecha}
    confirmar={confirmar}
    modificarProgramacion={modificarProgramacion}
    eliminarProgramacion={eliminarProgramacion}
    pista={pista}
    guardarResultado={guardarResultado}
    setsPartido={setsPartido}
    confirmarResultado={confirmarResultado}
    impugnando={impugnando}
    setImpugnando={setImpugnando}
    impugnar={impugnar}
    incidenciaPartido={incidenciaPartido}
  />
))}</div></section>
}
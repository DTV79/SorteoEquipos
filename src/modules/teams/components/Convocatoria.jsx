import { useEffect, useMemo, useState } from 'react'
import { catalogoJugadoresTeams, guardarElegiblesTeams, obtenerDetalleTeams } from '../teamsApi'

export default function Convocatoria({ teams }) {
 const [jugadores,setJugadores]=useState([]),[seleccionados,setSeleccionados]=useState(new Set()),[buscar,setBuscar]=useState(''),[cargando,setCargando]=useState(true),[guardando,setGuardando]=useState(false),[mensaje,setMensaje]=useState('')
 useEffect(()=>{(async()=>{try{const [cat,det]=await Promise.all([catalogoJugadoresTeams(),obtenerDetalleTeams(teams.id)]);setJugadores(cat.filter(j=>j.activo));setSeleccionados(new Set((det?.elegibles??[]).filter(e=>e.estado==='elegible').map(e=>e.id_jugador)))}catch(e){setMensaje('Error: '+e.message)}finally{setCargando(false)}})()},[teams.id])
 const filtrados=useMemo(()=>{const q=buscar.trim().toLowerCase();return !q?jugadores:jugadores.filter(j=>(j.alias||'').toLowerCase().includes(q)||(j.nombre_oficial||'').toLowerCase().includes(q))},[jugadores,buscar])
 const plazas=(Number(teams.jugadores_por_equipo)||0)*2+(Number(teams.reservas_por_equipo)||0)*2
 function toggle(id){setSeleccionados(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n})}
 async function guardar(){setGuardando(true);setMensaje('');try{await guardarElegiblesTeams(teams.id,[...seleccionados]);setMensaje('Convocatoria guardada correctamente.')}catch(e){setMensaje('Error: '+e.message)}finally{setGuardando(false)}}
 return <section className="teams-convocatoria">
  <div className="teams-seccion-cab"><div><p className="etiqueta">CONVOCATORIA</p><h2>Jugadores elegibles</h2><p>Marca los jugadores que pueden participar. Podrás modificar esta lista antes de cerrar la convocatoria.</p></div><div className={'teams-contador '+(plazas&&seleccionados.size<plazas?'faltan':'')}><strong>{seleccionados.size}</strong><span>{plazas?'seleccionados · '+plazas+' plazas previstas':'seleccionados'}</span></div></div>
  <div className="teams-convocatoria-tools"><input type="search" placeholder="Buscar jugador…" value={buscar} onChange={e=>setBuscar(e.target.value)}/><button className="boton boton-secundario" type="button" onClick={()=>setSeleccionados(new Set(jugadores.map(j=>j.id_jugador)))}>Seleccionar todos</button><button className="boton boton-secundario" type="button" onClick={()=>setSeleccionados(new Set())}>Quitar todos</button></div>
  {cargando?<div className="teams-vacio">Cargando catálogo…</div>:<div className="teams-jugadores">{filtrados.map(j=><label key={j.id_jugador} className={'teams-jugador '+(seleccionados.has(j.id_jugador)?'seleccionado':'')}><input type="checkbox" checked={seleccionados.has(j.id_jugador)} onChange={()=>toggle(j.id_jugador)}/><span className="teams-avatar">{(j.alias||j.nombre_oficial||'?').trim().charAt(0).toUpperCase()}</span><span><b>{j.alias||j.nombre_oficial}</b>{j.alias&&j.nombre_oficial!==j.alias&&<small>{j.nombre_oficial}</small>}</span></label>)}</div>}
  {mensaje&&<p className={mensaje.startsWith('Error:')?'teams-error':'teams-ok'}>{mensaje}</p>}
  <footer className="teams-convocatoria-acciones"><span>{plazas&&seleccionados.size<plazas?'Faltan '+(plazas-seleccionados.size)+' para cubrir equipos y reservas.':plazas&&seleccionados.size>plazas?(seleccionados.size-plazas)+' podrán quedar sin seleccionar o como reservas generales.':' '}</span><button type="button" className="boton boton-principal" disabled={guardando||cargando} onClick={guardar}>{guardando?'Guardando…':'Guardar convocatoria'}</button></footer>
 </section>
}

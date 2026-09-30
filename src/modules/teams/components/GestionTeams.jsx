import { useEffect, useState } from 'react'
import Convocatoria from './Convocatoria'
import Equipos from './Equipos'
import { obtenerDetalleTeams } from '../teamsApi'

export default function GestionTeams({ teams, onVolver }) {
 const [tab,setTab]=useState('General'),[detalle,setDetalle]=useState(null)
 const pestañas=['General','Convocatoria','Equipos','Reglas','Partidos','Incidencias']
 async function refrescar(){try{setDetalle(await obtenerDetalleTeams(teams.id))}catch{}}
 useEffect(()=>{void refrescar()},[teams.id,tab])
 const t=detalle?.teams||teams,elegibles=(detalle?.elegibles||[]).filter(e=>e.estado==='elegible')
 const eq=detalle?.equipos||[],ea=eq.find(e=>e.lado==='A'),eb=eq.find(e=>e.lado==='B'),miembros=detalle?.miembros||[]
 const convocatoriaOk=elegibles.length>0,equiposOk=Boolean(ea?.id_capitan&&eb?.id_capitan)
 const formacionOk=equiposOk&&miembros.some(m=>m.equipo_id===ea?.id)&&miembros.some(m=>m.equipo_id===eb?.id)
 const cerradas=Boolean(t.plantillas_cerradas)
 const reglasOk=false,iniciado=t.estado==='en_curso'||t.estado==='finalizado'
 const pasos=[
  {n:1,t:'Teams creado',s:'Configuración general guardada',ok:true,tab:'General'},
  {n:2,t:'Convocatoria',s:convocatoriaOk?elegibles.length+' jugadores apuntados':'Registrar disponibilidad de jugadores',ok:convocatoriaOk,tab:'Convocatoria'},
  {n:3,t:'Equipos y capitanes',s:equiposOk?(ea.nombre+' · '+eb.nombre):'Definir nombres y capitanes',ok:equiposOk,tab:'Equipos'},
  {n:4,t:'Formación de plantillas',s:formacionOk?miembros.length+' jugadores asignados':t.metodo_formacion==='manual'?'Repartir jugadores entre los equipos':t.metodo_formacion==='draft'?'Realizar el draft':'Realizar el sorteo',ok:formacionOk,tab:'Equipos'},
  {n:5,t:'Cerrar plantillas',s:cerradas?'Plantillas bloqueadas':'Revisar y cerrar la composición definitiva',ok:cerradas,tab:'Equipos'},
  {n:6,t:'Revisar reglas',s:reglasOk?'Reglas revisadas':'Comprobar la configuración antes de iniciar',ok:reglasOk,tab:'Reglas'},
  {n:7,t:'Iniciar Teams',s:iniciado?'Teams iniciado':'Crear el primer partido y comenzar',ok:iniciado,tab:'General'}
 ]
 const actual=pasos.find(p=>!p.ok)?.n??7
 return <main className="teams-admin">
  <header className="teams-gestion-cab"><button className="boton-volver" onClick={onVolver}>← Todos los Teams</button><div className="teams-gestion-titulo"><div><p className="etiqueta">SPRINT PÁDEL · TEAMS</p><h1>{teams.nombre}</h1><p>Copa por equipos</p></div><span className={'teams-estado estado-'+t.estado}>{t.estado.replaceAll('_',' ')}</span></div></header>
  <nav className="teams-tabs">{pestañas.map(p=><button key={p} className={tab===p?'activo':''} disabled={!['General','Convocatoria','Equipos'].includes(p)} onClick={()=>setTab(p)}>{p}{!['General','Convocatoria','Equipos'].includes(p)&&<small>Próximamente</small>}</button>)}</nav>
  {tab==='Convocatoria'?<Convocatoria teams={t}/>:tab==='Equipos'?<Equipos teams={t}/>:<section className="teams-dashboard"><div className="teams-dashboard-principal"><p className="etiqueta">ESTADO ACTUAL</p><h2>Preparación del Teams</h2><p>Este resumen se actualiza automáticamente con lo que ya has completado.</p><div className="teams-flujo">{pasos.map(p=><div key={p.n} className={p.ok?'completado':p.n===actual?'actual':''} onClick={()=>['Convocatoria','Equipos'].includes(p.tab)&&setTab(p.tab)}><span>{p.ok?'✓':p.n}</span><div><b>{p.t}</b><small>{p.s}</small></div></div>)}</div></div><aside className="teams-ficha"><h3>Resumen</h3><dl><div><dt>Formato</dt><dd>{t.modalidad}</dd></div><div><dt>Partidos</dt><dd>{t.numero_partidos}</dd></div><div><dt>Formación</dt><dd>{t.metodo_formacion}</dd></div><div><dt>Jugadores/equipo</dt><dd>{t.jugadores_por_equipo??'—'}</dd></div><div><dt>Reservas/equipo</dt><dd>{t.reservas_por_equipo??0}</dd></div></dl></aside></section>}
 </main>
}
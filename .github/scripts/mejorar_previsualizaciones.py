from pathlib import Path
p=Path('src/CampeonatoConfiguracion.jsx')
s=p.read_text(encoding='utf-8')
old='''                <strong>{previsualizacionPrimeraFase.tipo_campeonato || config.tipo_campeonato}</strong>
                {previsualizacionPrimeraFase.mensaje && <span>{previsualizacionPrimeraFase.mensaje}</span>}
                {previsualizacionPrimeraFase.total_equipos != null && <span>Equipos: {previsualizacionPrimeraFase.total_equipos}</span>}
                {previsualizacionPrimeraFase.num_grupos != null && <span>Grupos: {previsualizacionPrimeraFase.num_grupos}</span>}
                {previsualizacionPrimeraFase.partidos_previstos != null && <span>Partidos previstos: {previsualizacionPrimeraFase.partidos_previstos}</span>}
                {previsualizacionPrimeraFase.jornadas_previstas != null && <span>Jornadas previstas: {previsualizacionPrimeraFase.jornadas_previstas}</span>}
                {previsualizacionPrimeraFase.hay_descanso === true && <span>Habrá descanso por número impar de equipos.</span>}
                <button type="button" className="boton boton-principal" onClick={generarPrimeraFase} disabled={generandoPrimeraFase}>
                  {generandoPrimeraFase ? 'Generando…' : 'Confirmar y generar primera fase'}
                </button>'''
new='''                <strong>Previsualización · {previsualizacionPrimeraFase.tipo || previsualizacionPrimeraFase.tipo_campeonato || config.tipo_campeonato}</strong>
                {previsualizacionPrimeraFase.mensaje && <span>{previsualizacionPrimeraFase.mensaje}</span>}
                <span>Equipos: {previsualizacionPrimeraFase.equipos ?? previsualizacionPrimeraFase.total_equipos ?? 0}</span>
                <span>Pistas disponibles: {previsualizacionPrimeraFase.pistas ?? config.num_pistas_disponibles}</span>
                {previsualizacionPrimeraFase.num_grupos != null && <span>Grupos: {previsualizacionPrimeraFase.num_grupos}</span>}
                {(previsualizacionPrimeraFase.partidos ?? previsualizacionPrimeraFase.partidos_previstos) != null && <span>Partidos previstos: {previsualizacionPrimeraFase.partidos ?? previsualizacionPrimeraFase.partidos_previstos}</span>}
                {(previsualizacionPrimeraFase.jornadas ?? previsualizacionPrimeraFase.jornadas_previstas) != null && <span>Jornadas: {previsualizacionPrimeraFase.jornadas ?? previsualizacionPrimeraFase.jornadas_previstas}</span>}
                {Array.isArray(previsualizacionPrimeraFase.grupos) && previsualizacionPrimeraFase.grupos.map((grupo) => <div className="detalle-regrupo" key={grupo.grupo}><b>Grupo {grupo.grupo}</b><span>{grupo.equipos} equipos · {grupo.jornadas} jornadas · {grupo.partidos} partidos{grupo.hay_descansos ? ' · habrá descansos' : ''}</span></div>)}
                {Array.isArray(previsualizacionPrimeraFase.emparejamientos) && previsualizacionPrimeraFase.emparejamientos.map((partido, indice) => partido.descansa ? <div className="detalle-cruce-eliminatoria" key={`d-${partido.grupo}-${partido.jornada}-${indice}`}><b>Grupo {partido.grupo} · Jornada {partido.jornada}</b><span>Descansa: {partido.nombre_descansa || partido.descansa}</span></div> : <div className="detalle-cruce-eliminatoria" key={`${partido.grupo}-${partido.jornada}-${indice}`}><b>Grupo {partido.grupo} · Jornada {partido.jornada} · Pista {partido.pista}</b><span>{partido.nombre_1 || partido.equipo_1} — {partido.nombre_2 || partido.equipo_2}</span></div>)}
                {previsualizacionPrimeraFase.hay_descanso === true && <span>Habrá descanso por número impar de equipos.</span>}
                {previsualizacionPrimeraFase.ya_generada ? <span className="aviso-configuracion-pendiente">Primera fase ya generada: {previsualizacionPrimeraFase.partidos_existentes} partidos existentes. No se volverá a generar.</span> : <button type="button" className="boton boton-principal" onClick={generarPrimeraFase} disabled={generandoPrimeraFase || previsualizacionPrimeraFase.puede_generar === false}>
                  {generandoPrimeraFase ? 'Generando…' : 'Confirmar y generar primera fase'}
                </button>}'''
if old not in s: raise SystemExit('bloque primera fase no encontrado')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

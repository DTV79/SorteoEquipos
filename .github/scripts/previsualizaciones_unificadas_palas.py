from pathlib import Path
p=Path('src/CampeonatoConfiguracion.jsx')
s=p.read_text(encoding='utf-8')
s=s.replace("  const [errorEliminatorias, setErrorEliminatorias] = useState('')\n  const [hayCambiosSinGuardar, setHayCambiosSinGuardar] = useState(false)", "  const [errorEliminatorias, setErrorEliminatorias] = useState('')\n  const [previsualizacionPalas, setPrevisualizacionPalas] = useState(null)\n  const [previsualizandoPalas, setPrevisualizandoPalas] = useState(false)\n  const [generandoPalas, setGenerandoPalas] = useState(false)\n  const [errorPalas, setErrorPalas] = useState('')\n  const [hayCambiosSinGuardar, setHayCambiosSinGuardar] = useState(false)",1)
s=s.replace("    setPrevisualizacionEliminatorias(null)\n  }", "    setPrevisualizacionEliminatorias(null)\n    setPrevisualizacionPalas(null)\n  }",1)
s=s.replace("      setPrevisualizacionEliminatorias(null)\n      setMensaje({ tipo: 'correcto', texto: 'Configuración guardada y comprobada en Supabase.' })", "      setPrevisualizacionEliminatorias(null)\n      setPrevisualizacionPalas(null)\n      setMensaje({ tipo: 'correcto', texto: 'Configuración guardada y comprobada en Supabase.' })",1)
needle="""  async function abrirMantenimiento(tipo) {"""
insert="""  async function previsualizarPalas() {
    if (hayCambiosSinGuardar) return
    setPrevisualizandoPalas(true)
    setErrorPalas('')
    setPrevisualizacionPalas(null)
    const { data, error } = await supabaseCampeonato.rpc('admin_previsualizar_palas_playa', { p_codigo: codigo })
    setPrevisualizandoPalas(false)
    if (error || data?.ok !== true) { setErrorPalas(error?.message || data?.error || 'No se pudo preparar Palas de Playa.'); return }
    setPrevisualizacionPalas(data)
  }

  async function generarPalas() {
    if (!previsualizacionPalas?.puede_generar || hayCambiosSinGuardar) return
    setGenerandoPalas(true)
    setErrorPalas('')
    const { data, error } = await supabaseCampeonato.rpc('admin_generar_palas_playa', { p_codigo: codigo })
    setGenerandoPalas(false)
    if (error || data?.ok !== true) { setErrorPalas(error?.message || data?.error || 'No se pudo generar Palas de Playa.'); return }
    setPrevisualizacionPalas(null)
    setMensaje({ tipo: 'correcto', texto: `Palas de Playa generada: ${data.partidos_creados ?? 0} partidos iniciales.` })
  }

"""+needle
if needle not in s: raise SystemExit('No se encontró abrirMantenimiento')
s=s.replace(needle,insert,1)
needle2="""          <fieldset className=\"zona-peligro-campeonato\">"""
palas="""          {config.hay_copa_palas_playa === true && (
            <fieldset className=\"generacion-palas\">
              <legend>Generación de Palas de Playa</legend>
              <p>Primero se muestra exactamente quién participa, los cruces, las pistas y quién descansa. La previsualización no crea partidos.</p>
              {hayCambiosSinGuardar && <p className=\"aviso-configuracion-pendiente\">Hay cambios sin guardar. Guarda la configuración antes de previsualizar.</p>}
              <button type=\"button\" className=\"boton boton-secundario\" onClick={previsualizarPalas} disabled={previsualizandoPalas || generandoPalas || hayCambiosSinGuardar}>{previsualizandoPalas ? 'Comprobando…' : 'Previsualizar Palas de Playa'}</button>
              {errorPalas && <p className=\"error-generacion-primera-fase\">{errorPalas}</p>}
              {previsualizacionPalas && <div className=\"resumen-generacion-primera-fase\">
                <strong>Previsualización · Palas de Playa · {previsualizacionPalas.criterio}</strong>
                {previsualizacionPalas.mensaje && <span>{previsualizacionPalas.mensaje}</span>}
                {previsualizacionPalas.participantes != null && <span>Equipos participantes: {previsualizacionPalas.participantes}</span>}
                {previsualizacionPalas.ronda_inicial && <span>Ronda inicial: {previsualizacionPalas.ronda_inicial}</span>}
                {Array.isArray(previsualizacionPalas.partidos) && previsualizacionPalas.partidos.map((partido, indice) => <div className=\"detalle-cruce-eliminatoria\" key={`${partido.ronda || 'PP'}-${partido.orden || indice}`}><b>{partido.ronda || 'Palas'} · Partido {partido.orden || indice + 1}{partido.pista ? ` · Pista ${partido.pista}` : ''}</b><span>{previsualizacionPalas.nombres_equipos?.[partido.equipo_1] || partido.equipo_1} — {previsualizacionPalas.nombres_equipos?.[partido.equipo_2] || partido.equipo_2}</span></div>)}
                {previsualizacionPalas.descansa && <div className=\"detalle-regrupo\"><b>Descanso</b><span>{previsualizacionPalas.nombres_equipos?.[previsualizacionPalas.descansa] || previsualizacionPalas.descansa} · descansa por ser el peor clasificado disponible</span></div>}
                {previsualizacionPalas.ya_generada ? <span className=\"aviso-configuracion-pendiente\">Palas de Playa ya está generada. No se volverá a crear.</span> : <button type=\"button\" className=\"boton boton-principal\" onClick={generarPalas} disabled={generandoPalas || !previsualizacionPalas.puede_generar}>{generandoPalas ? 'Generando…' : 'Confirmar y generar Palas de Playa'}</button>}
              </div>}
            </fieldset>
          )}

"""+needle2
if needle2 not in s: raise SystemExit('No se encontró zona peligro')
s=s.replace(needle2,palas,1)
p.write_text(s,encoding='utf-8')

from pathlib import Path
p=Path('src/CampeonatoConfiguracion.jsx'); s=p.read_text(encoding='utf-8')
a="  const [errorPrimeraFase, setErrorPrimeraFase] = useState('')\n"
b="""  const [previsualizacionRegrupos, setPrevisualizacionRegrupos] = useState(null)
  const [previsualizandoRegrupos, setPrevisualizandoRegrupos] = useState(false)
  const [generandoRegrupos, setGenerandoRegrupos] = useState(false)
  const [errorRegrupos, setErrorRegrupos] = useState('')
"""
assert a in s and 'previsualizacionRegrupos' not in s; s=s.replace(a,a+b,1)
a='  async function abrirMantenimiento(tipo) {\n'
b="""  async function previsualizarRegrupos() {
    setPrevisualizandoRegrupos(true)
    setErrorRegrupos('')
    setPrevisualizacionRegrupos(null)
    const { data, error } = await supabaseCampeonato.rpc('admin_previsualizar_regrupos', { p_codigo: codigo })
    setPrevisualizandoRegrupos(false)
    if (error || data?.ok !== true) {
      setErrorRegrupos(error?.message || data?.error || 'No se pudieron preparar los ReGrupos.')
      return
    }
    setPrevisualizacionRegrupos(data)
  }

  async function generarRegrupos() {
    if (!previsualizacionRegrupos) return
    setGenerandoRegrupos(true)
    setErrorRegrupos('')
    const { data, error } = await supabaseCampeonato.rpc('admin_generar_regrupos', { p_codigo: codigo })
    setGenerandoRegrupos(false)
    if (error || data?.ok !== true) {
      setErrorRegrupos(error?.message || data?.error || 'No se pudieron generar los ReGrupos.')
      return
    }
    setPrevisualizacionRegrupos(null)
    setMensaje({ tipo: 'correcto', texto: `ReGrupos generados: ${data.partidos_nuevos ?? 0} partidos nuevos y ${data.partidos_arrastrados ?? 0} arrastrados.` })
  }

"""
assert a in s; s=s.replace(a,b+a,1)
a='          <fieldset className="zona-peligro-campeonato">\n'
b="""          {config.tipo_campeonato === 'Grupos' && config.hay_regrupos && (
            <fieldset className="generacion-regrupos">
              <legend>Generación de ReGrupos</legend>
              <p>Solo se habilitan cuando toda la fase de grupos está terminada. Primero se muestra exactamente qué equipos formarán cada ReGrupo y qué partidos se crearán o se arrastrarán.</p>
              <button type="button" className="boton boton-secundario" onClick={previsualizarRegrupos} disabled={previsualizandoRegrupos || generandoRegrupos}>
                {previsualizandoRegrupos ? 'Comprobando…' : 'Previsualizar ReGrupos'}
              </button>
              {errorRegrupos && <p className="error-generacion-primera-fase">{errorRegrupos}</p>}
              {previsualizacionRegrupos && (
                <div className="resumen-generacion-primera-fase">
                  <strong>{previsualizacionRegrupos.repetir_enfrentamientos ? 'Liguilla completa · se permiten repetidos' : 'Sin repetir enfrentamientos · con arrastre'}</strong>
                  <span>Equipos: {previsualizacionRegrupos.equipos ?? 0}</span>
                  <span>ReGrupos: {previsualizacionRegrupos.numero_regrupos ?? 0}</span>
                  <span>Partidos nuevos: {previsualizacionRegrupos.partidos_nuevos ?? 0}</span>
                  <span>Partidos arrastrados: {previsualizacionRegrupos.partidos_arrastrados ?? 0}</span>
                  {!previsualizacionRegrupos.repetir_enfrentamientos && <span>Puntos por victoria arrastrada: {config.puntos_partido_arrastrado}</span>}
                  {Array.isArray(previsualizacionRegrupos.regrupos) && previsualizacionRegrupos.regrupos.map((grupo) => (
                    <div className="detalle-regrupo" key={grupo.codigo}>
                      <b>{grupo.nombre || `ReGrupo ${grupo.codigo}`}</b>
                      <span>{Array.isArray(grupo.equipos) ? grupo.equipos.join(' · ') : ''}</span>
                    </div>
                  ))}
                  <button type="button" className="boton boton-principal" onClick={generarRegrupos} disabled={generandoRegrupos}>
                    {generandoRegrupos ? 'Generando…' : 'Confirmar y generar ReGrupos'}
                  </button>
                </div>
              )}
            </fieldset>
          )}

"""
assert a in s; s=s.replace(a,b+a,1); p.write_text(s,encoding='utf-8')
p=Path('src/CampeonatoConfiguracion.css'); css=p.read_text(encoding='utf-8'); css += "\n.generacion-regrupos{border-color:#1d4ed8!important;background:#0b1220!important}.generacion-regrupos>p{margin:0 0 14px;color:#cbd5e1;line-height:1.5}.detalle-regrupo{display:grid;gap:3px;padding:9px 0;border-top:1px solid #334155}.detalle-regrupo b{color:#bfdbfe}.detalle-regrupo span{font-size:13px;color:#cbd5e1}\n"; p.write_text(css,encoding='utf-8')

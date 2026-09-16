from pathlib import Path

p = Path('src/CampeonatoConfiguracion.jsx')
s = p.read_text(encoding='utf-8')

state_anchor = "  const [mostrarInfoClasificacion, setMostrarInfoClasificacion] = useState(false)\n"
state_add = """  const [previsualizacionPrimeraFase, setPrevisualizacionPrimeraFase] = useState(null)
  const [previsualizandoPrimeraFase, setPrevisualizandoPrimeraFase] = useState(false)
  const [generandoPrimeraFase, setGenerandoPrimeraFase] = useState(false)
  const [errorPrimeraFase, setErrorPrimeraFase] = useState('')
"""
assert state_anchor in s
s = s.replace(state_anchor, state_anchor + state_add, 1)

func_anchor = "  async function abrirMantenimiento(tipo) {\n"
func_add = """  async function previsualizarPrimeraFase() {
    setPrevisualizandoPrimeraFase(true)
    setErrorPrimeraFase('')
    setPrevisualizacionPrimeraFase(null)
    const { data, error } = await supabaseCampeonato.rpc('admin_previsualizar_primera_fase', { p_codigo: codigo })
    setPrevisualizandoPrimeraFase(false)
    if (error || data?.ok !== true) {
      setErrorPrimeraFase(error?.message || data?.error || 'No se pudo preparar la primera fase.')
      return
    }
    setPrevisualizacionPrimeraFase(data)
  }

  async function generarPrimeraFase() {
    if (!previsualizacionPrimeraFase) return
    setGenerandoPrimeraFase(true)
    setErrorPrimeraFase('')
    const { data, error } = await supabaseCampeonato.rpc('admin_generar_primera_fase', { p_codigo: codigo })
    setGenerandoPrimeraFase(false)
    if (error || data?.ok !== true) {
      setErrorPrimeraFase(error?.message || data?.error || 'No se pudo generar la primera fase.')
      return
    }
    setPrevisualizacionPrimeraFase(null)
    setMensaje({ tipo: 'correcto', texto: data?.mensaje || 'Primera fase generada correctamente.' })
  }

"""
assert func_anchor in s
s = s.replace(func_anchor, func_add + func_anchor, 1)

ui_anchor = '          <fieldset className="zona-peligro-campeonato">\n'
ui = """          <fieldset className="generacion-primera-fase">
            <legend>Generación de la competición</legend>
            <p>La configuración guardada decide cómo se crea la primera fase. La previsualización no crea ni modifica partidos.</p>
            <button type="button" className="boton boton-secundario" onClick={previsualizarPrimeraFase} disabled={previsualizandoPrimeraFase || generandoPrimeraFase || !config.tipo_campeonato}>
              {previsualizandoPrimeraFase ? 'Comprobando…' : 'Previsualizar primera fase'}
            </button>
            {!config.tipo_campeonato && <small className="ayuda-generacion-primera-fase">Define y guarda primero si el campeonato será Liguilla o Grupos.</small>}
            {errorPrimeraFase && <p className="error-generacion-primera-fase">{errorPrimeraFase}</p>}
            {previsualizacionPrimeraFase && (
              <div className="resumen-generacion-primera-fase">
                <strong>{previsualizacionPrimeraFase.tipo_campeonato || config.tipo_campeonato}</strong>
                {previsualizacionPrimeraFase.mensaje && <span>{previsualizacionPrimeraFase.mensaje}</span>}
                {previsualizacionPrimeraFase.total_equipos != null && <span>Equipos: {previsualizacionPrimeraFase.total_equipos}</span>}
                {previsualizacionPrimeraFase.num_grupos != null && <span>Grupos: {previsualizacionPrimeraFase.num_grupos}</span>}
                {previsualizacionPrimeraFase.partidos_previstos != null && <span>Partidos previstos: {previsualizacionPrimeraFase.partidos_previstos}</span>}
                {previsualizacionPrimeraFase.jornadas_previstas != null && <span>Jornadas previstas: {previsualizacionPrimeraFase.jornadas_previstas}</span>}
                {previsualizacionPrimeraFase.hay_descanso === true && <span>Habrá descanso por número impar de equipos.</span>}
                <button type="button" className="boton boton-principal" onClick={generarPrimeraFase} disabled={generandoPrimeraFase}>
                  {generandoPrimeraFase ? 'Generando…' : 'Confirmar y generar primera fase'}
                </button>
              </div>
            )}
          </fieldset>

"""
assert ui_anchor in s
s = s.replace(ui_anchor, ui + ui_anchor, 1)
p.write_text(s, encoding='utf-8')

p = Path('src/CampeonatoConfiguracion.css')
css = p.read_text(encoding='utf-8')
css += """
.generacion-primera-fase{border-color:#166534!important;background:#0b1712!important}.generacion-primera-fase>p{margin:0 0 14px;color:#cbd5e1;line-height:1.5}.ayuda-generacion-primera-fase{display:block;margin-top:8px;color:#94a3b8}.resumen-generacion-primera-fase{display:grid;gap:7px;margin-top:14px;padding:15px;border:1px solid #166534;border-radius:12px;background:#0d131a;color:#cbd5e1}.resumen-generacion-primera-fase strong{color:#86efac;font-size:16px}.resumen-generacion-primera-fase .boton{justify-self:start;margin-top:7px}.error-generacion-primera-fase{margin:14px 0 0!important;padding:11px 13px;border:1px solid #7f1d1d;border-radius:10px;background:#351418;color:#fca5a5!important;font-weight:800}@media(max-width:700px){.generacion-primera-fase>.boton,.resumen-generacion-primera-fase .boton{width:100%;justify-self:stretch}}
"""
p.write_text(css, encoding='utf-8')

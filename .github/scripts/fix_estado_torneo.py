from pathlib import Path
p=Path('src/CampeonatoConfiguracion.jsx')
s=p.read_text(encoding='utf-8')
anchor="  async function guardar(evento) {\n"
fn="""  async function cambiarEstadoTorneo(evento) {
    const estadoAnterior = config.estado_torneo
    const nuevoEstado = evento.target.value
    setConfig((actual) => ({ ...actual, estado_torneo: nuevoEstado }))
    setMensaje({ tipo: '', texto: 'Actualizando estado del torneo…' })

    const { data, error } = await supabaseCampeonato.rpc(
      'admin_guardar_estado_torneo',
      { p_codigo: codigo, p_estado: nuevoEstado }
    )

    if (error || data?.ok !== true) {
      setConfig((actual) => ({ ...actual, estado_torneo: estadoAnterior }))
      setMensaje({ tipo: 'error', texto: error?.message || data?.error || 'No se pudo actualizar el estado del torneo.' })
      return
    }

    setConfig((actual) => ({ ...actual, estado_torneo: data.estado_torneo || nuevoEstado }))
    setMensaje({ tipo: 'correcto', texto: `Estado actualizado a «${data.estado_torneo || nuevoEstado}». La web pública ya leerá este estado.` })
  }

"""
assert anchor in s
s=s.replace(anchor,fn+anchor,1)
old='<select name="estado_torneo" value={config.estado_torneo} onChange={cambiar}>'
new='<select name="estado_torneo" value={config.estado_torneo} onChange={cambiarEstadoTorneo}>'
assert old in s
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import GastosCampeonato from './GastosCampeonato'
import GastosMovimientoMejoras from './GastosMovimientoMejoras'
import GastosActividadMejoras from './GastosActividadMejoras'
import './GastosCampeonatoSimplificado.css'
import './GastosCampeonatoContraste.css'

function normalizar(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export default function GastosCampeonatoLauncher() {
  const [destino, setDestino] = useState(null)
  const [abierto, setAbierto] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [destinoMasivo, setDestinoMasivo] = useState(null)
  const [actividadesMasivas, setActividadesMasivas] = useState([])

  useEffect(() => {
    function localizarMenu() {
      const menu = document.querySelector('.panel-inicio-campeonato .modulos-campeonato')
      setDestino((actual) => (actual === menu ? actual : menu))
    }
    localizarMenu()
    const observador = new MutationObserver(localizarMenu)
    observador.observe(document.body, { childList: true, subtree: true })
    return () => observador.disconnect()
  }, [])

  useEffect(() => {
    if (!abierto) { setDestinoMasivo(null); setActividadesMasivas([]); return undefined }
    function localizarAsistencia() {
      const lista = document.querySelector('.gastos-campeonato .lista-personas-economia')
      if (!lista) { setDestinoMasivo(null); setActividadesMasivas([]); return }
      let host = lista.parentElement?.querySelector(':scope > .host-seleccion-masiva-jugadores')
      if (!host) { host = document.createElement('div'); host.className = 'host-seleccion-masiva-jugadores'; lista.parentElement?.insertBefore(host, lista) }
      setDestinoMasivo((actual) => (actual === host ? actual : host))
      const primerJugador = [...lista.querySelectorAll('.persona-economia')].find((tarjeta) => normalizar(tarjeta.querySelector('header span')?.textContent).includes('jugador'))
      const nombres = primerJugador ? [...primerJugador.querySelectorAll('.actividad-persona')].map((actividad) => actividad.querySelector('.check-asistencia strong')?.textContent?.trim()).filter(Boolean) : []
      setActividadesMasivas((actual) => JSON.stringify(actual) === JSON.stringify(nombres) ? actual : nombres)
    }
    localizarAsistencia(); const observador = new MutationObserver(localizarAsistencia); observador.observe(document.body, { childList: true, subtree: true }); return () => observador.disconnect()
  }, [abierto])

  const actividadesUnicas = useMemo(() => [...new Set(actividadesMasivas)], [actividadesMasivas])
  function abrir() { const seleccionado = window.sessionStorage.getItem('sprint-padel-campeonato-seleccionado'); if (!seleccionado) return; setCodigo(seleccionado); setAbierto(true) }
  function aplicarAsistenciaMasiva(modo, actividadObjetivo = '') {
    document.querySelectorAll('.gastos-campeonato .lista-personas-economia .persona-economia').forEach((tarjeta) => {
      if (!normalizar(tarjeta.querySelector('header span')?.textContent).includes('jugador')) return
      tarjeta.querySelectorAll('.actividad-persona').forEach((actividad) => {
        const nombre = actividad.querySelector('.check-asistencia strong')?.textContent?.trim(), checkbox = actividad.querySelector('.check-asistencia input[type="checkbox"]'); if (!checkbox) return
        const coincide = modo === 'todas' || (modo === 'actividad' && normalizar(nombre) === normalizar(actividadObjetivo)), debe = modo !== 'ninguna' && coincide
        if (modo === 'ninguna' && checkbox.checked) checkbox.click(); if (debe && !checkbox.checked) checkbox.click()
      })
    })
  }

  return <>
    {destino && createPortal(<button type="button" className="modulo-campeonato activo modulo-gastos-campeonato" onClick={abrir}><span>💶</span><strong>Gastos y cobros</strong><small>Asistentes, cena, pinchos, gastos, ingresos y pagos</small></button>, destino)}
    {abierto && codigo && createPortal(<div className="gastos-overlay"><GastosCampeonato codigo={codigo} onVolver={() => setAbierto(false)} /><GastosMovimientoMejoras codigo={codigo} /><GastosActividadMejoras codigo={codigo} /></div>, document.body)}
    {abierto && destinoMasivo && createPortal(<section className="seleccion-masiva-jugadores"><div className="seleccion-masiva-texto"><span className="seleccion-masiva-icono">👥</span><div><strong>Jugadores inscritos</strong><p>Marca de una vez a los jugadores del campeonato. Después puedes corregir casos concretos antes de guardar.</p></div></div><div className="seleccion-masiva-botones"><button type="button" className="boton-masivo principal" onClick={() => aplicarAsistenciaMasiva('todas')}>✓ Marcar todas las actividades</button>{actividadesUnicas.map((actividad) => <button type="button" className="boton-masivo" key={actividad} onClick={() => aplicarAsistenciaMasiva('actividad', actividad)}>{actividad}</button>)}<button type="button" className="boton-masivo quitar" onClick={() => aplicarAsistenciaMasiva('ninguna')}>Quitar todas</button></div><small className="seleccion-masiva-aviso">Estos botones solo cambian las casillas de los jugadores. Pulsa “Guardar cambios” para confirmar.</small></section>, destinoMasivo)}
  </>
}

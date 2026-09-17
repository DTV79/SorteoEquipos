import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import GastosCampeonato from './GastosCampeonato'

export default function GastosCampeonatoLauncher() {
  const [destino, setDestino] = useState(null)
  const [abierto, setAbierto] = useState(false)
  const [codigo, setCodigo] = useState('')

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

  function abrir() {
    const seleccionado = window.sessionStorage.getItem(
      'sprint-padel-campeonato-seleccionado'
    )
    if (!seleccionado) return
    setCodigo(seleccionado)
    setAbierto(true)
  }

  return (
    <>
      {destino &&
        createPortal(
          <button
            type="button"
            className="modulo-campeonato activo modulo-gastos-campeonato"
            onClick={abrir}
          >
            <span>💶</span>
            <strong>Gastos y cobros</strong>
            <small>Asistentes, cena, pinchos, gastos, ingresos y pagos</small>
          </button>,
          destino
        )}

      {abierto && codigo &&
        createPortal(
          <div className="gastos-overlay">
            <GastosCampeonato
              codigo={codigo}
              onVolver={() => setAbierto(false)}
            />
          </div>,
          document.body
        )}
    </>
  )
}

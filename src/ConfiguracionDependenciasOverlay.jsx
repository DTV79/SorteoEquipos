import { useEffect } from 'react'
import './ConfiguracionDependenciasOverlay.css'

function emitirCambio(elemento, valor) {
  if (!elemento || String(elemento.value) === String(valor)) return
  const descriptor = Object.getOwnPropertyDescriptor(
    elemento instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype,
    'value'
  )
  descriptor?.set?.call(elemento, String(valor))
  elemento.dispatchEvent(new Event('change', { bubbles: true }))
}

function asegurarAyuda(campo, texto) {
  if (!campo) return
  let ayuda = campo.parentElement?.querySelector('.ayuda-dependencia-configuracion')
  if (!texto) {
    ayuda?.remove()
    return
  }
  if (!ayuda) {
    ayuda = document.createElement('small')
    ayuda.className = 'ayuda-dependencia-configuracion'
    campo.parentElement?.appendChild(ayuda)
  }
  ayuda.textContent = texto
}

function aplicarDependencias(formulario) {
  const tipo = formulario.elements.namedItem('tipo_campeonato')
  const estructura = formulario.elements.namedItem('estructura_primera_fase')
  const regrupos = formulario.elements.namedItem('hay_regrupos')
  const repetir = formulario.elements.namedItem('repetir_enfrentamientos_regrupos')
  const pasanRg = formulario.elements.namedItem('equipos_pasan_a_regrupos')
  const equiposGrupo = formulario.elements.namedItem('equipos_por_grupo')
  const arrastre = formulario.elements.namedItem('puntos_partido_arrastrado')
  const acceso = formulario.elements.namedItem('formato_acceso_eliminatorias')
  const pasanCruces = formulario.elements.namedItem('equipos_pasan_a_cruces_por_grupo')
  const ronda = formulario.elements.namedItem('ronda_inicial_eliminatorias')
  const objetivo = formulario.elements.namedItem('puntos_objetivo_set')
  const maximo = formulario.elements.namedItem('puntos_maximos_por_set')

  const esGrupos = tipo?.value === 'Grupos'
  const hayRegrupos = esGrupos && Boolean(regrupos?.checked)
  const repite = hayRegrupos && Boolean(repetir?.checked)
  const capacidadGrupo = Number(equiposGrupo?.value || 0)

  if (estructura) estructura.disabled = !esGrupos

  if (regrupos) {
    regrupos.disabled = !esGrupos
    regrupos.closest('.interruptor-configuracion')?.classList.toggle('desactivado', !esGrupos)
  }

  if (pasanRg && capacidadGrupo > 0) {
    pasanRg.max = String(capacidadGrupo)
    if (Number(pasanRg.value) > capacidadGrupo) emitirCambio(pasanRg, capacidadGrupo)
  }

  if (pasanCruces && esGrupos && capacidadGrupo > 0) {
    pasanCruces.max = String(capacidadGrupo)
    if (Number(pasanCruces.value) > capacidadGrupo) emitirCambio(pasanCruces, capacidadGrupo)
  } else if (pasanCruces) {
    pasanCruces.removeAttribute('max')
  }

  if (arrastre) {
    arrastre.disabled = !hayRegrupos || repite
    if (repite && Number(arrastre.value) !== 0) emitirCambio(arrastre, 0)
    asegurarAyuda(
      arrastre,
      repite
        ? 'Con repetición de enfrentamientos no se arrastran puntos: queda fijado en 0.'
        : hayRegrupos
          ? 'Solo se usa cuando los enfrentamientos anteriores se arrastran al ReGrupo.'
          : ''
    )
  }

  if (acceso) {
    const especialDisponible = hayRegrupos
    Array.from(acceso.options).forEach((opcion) => {
      if (opcion.value === 'Campeones de ReGrupo directos a semifinales') opcion.disabled = !especialDisponible
    })
    if (!especialDisponible && acceso.value === 'Campeones de ReGrupo directos a semifinales') {
      emitirCambio(acceso, 'Cruces normales')
    }
    asegurarAyuda(
      acceso,
      especialDisponible ? '' : 'El acceso especial solo está disponible cuando hay ReGrupos.'
    )
  }

  if (objetivo && maximo) {
    const minimo = Math.max(1, Number(objetivo.value || 1))
    maximo.min = String(minimo)
    if (Number(maximo.value) < minimo) emitirCambio(maximo, minimo)
  }

  if (ronda && esGrupos && capacidadGrupo > 0 && Number(pasanCruces?.value || 0) > capacidadGrupo) {
    ronda.setCustomValidity('Los clasificados por grupo no pueden superar los equipos del grupo.')
  } else {
    ronda?.setCustomValidity('')
  }
}

export default function ConfiguracionDependenciasOverlay() {
  useEffect(() => {
    let formulario = null

    const sincronizar = () => {
      const actual = document.querySelector('.app-configuracion-campeonato .formulario-configuracion')
      if (actual !== formulario) {
        formulario?.removeEventListener('change', sincronizar)
        formulario?.removeEventListener('input', sincronizar)
        formulario = actual
        formulario?.addEventListener('change', sincronizar)
        formulario?.addEventListener('input', sincronizar)
      }
      if (formulario) aplicarDependencias(formulario)
    }

    const observador = new MutationObserver(sincronizar)
    observador.observe(document.body, { childList: true, subtree: true })
    sincronizar()

    return () => {
      observador.disconnect()
      formulario?.removeEventListener('change', sincronizar)
      formulario?.removeEventListener('input', sincronizar)
    }
  }, [])

  return null
}

import { useRef } from 'react'

export default function CampoFecha({ value, onChange }) {
  const ref = useRef(null)

  function abrir() {
    const el = ref.current
    if (!el) return
    try {
      el.showPicker?.()
    } catch {}
    el.focus()
  }

  return (
    <div className="teams-fecha-control">
      <input
        ref={ref}
        type="datetime-local"
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        className="teams-calendario-btn"
        aria-label="Abrir calendario"
        title="Abrir calendario"
        onClick={abrir}
      >
        ▣
      </button>
    </div>
  )
}

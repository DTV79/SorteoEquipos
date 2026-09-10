import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './NormasCampeonato.css'

const TIPOS_ELEMENTO = [
  'Título',
  'Subtítulo',
  'Párrafo',
  'Descripción',
  'Viñeta',
  'Viñeta dinámica',
  'Paso',
  'Criterio',
  'Etiqueta',
  'Valor dinámico',
  'Destacado',
  'Nota',
  'Ejemplo',
  'Mensaje',
]

function numero(valor, respaldo = 0) {
  const convertido = Number(valor)
  return Number.isFinite(convertido) ? convertido : respaldo
}

function ordenarElementos(elementos) {
  return [...elementos].sort((a, b) => (
    numero(a.orden_seccion) - numero(b.orden_seccion) ||
    numero(a.orden_elemento) - numero(b.orden_elemento) ||
    String(a.id || '').localeCompare(String(b.id || ''), 'es')
  ))
}

export default function NormasCampeonato({
  codigo,
  onVolver,
  onConfiguracion,
  onPanelPrincipal,
}) {
  const [contenido, setContenido] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [filtro, setFiltro] = useState('')
  const [seccionActiva, setSeccionActiva] = useState('todas')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    setMensaje('')

    const { data, error: errorCarga } = await supabaseCampeonato.rpc(
      'web_normas',
      { p_codigo: codigo }
    )

    if (errorCarga) {
      setError(errorCarga.message)
      setCargando(false)
      return
    }

    if (!data || !Array.isArray(data.elementos)) {
      setError('Este campeonato no tiene un reglamento publicado.')
      setCargando(false)
      return
    }

    setContenido({
      ...data,
      elementos: ordenarElementos(data.elementos),
      puntuacion: Array.isArray(data.puntuacion) ? data.puntuacion : [],
    })
    setCargando(false)
  }, [codigo])

  useEffect(() => {
    cargar()
  }, [cargar])

  const secciones = useMemo(() => {
    const nombres = new Set(
      (contenido?.elementos || [])
        .map((elemento) => String(elemento.seccion || '').trim())
        .filter(Boolean)
    )
    return [...nombres].sort((a, b) => a.localeCompare(b, 'es'))
  }, [contenido])

  const elementosVisibles = useMemo(() => {
    const texto = filtro.trim().toLocaleLowerCase('es')

    return (contenido?.elementos || []).filter((elemento) => {
      const coincideSeccion =
        seccionActiva === 'todas' || elemento.seccion === seccionActiva
      const coincideTexto = !texto || [
        elemento.id,
        elemento.seccion,
        elemento.tipo,
        elemento.texto,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es')
        .includes(texto)

      return coincideSeccion && coincideTexto
    })
  }, [contenido, filtro, seccionActiva])

  function actualizarElemento(id, campo, valor) {
    setContenido((actual) => ({
      ...actual,
      elementos: actual.elementos.map((elemento) => (
        elemento.id === id
          ? { ...elemento, [campo]: valor }
          : elemento
      )),
    }))
    setMensaje('')
  }

  function anadirElemento() {
    const ordenSeccion = seccionActiva === 'todas'
      ? Math.max(0, ...contenido.elementos.map((item) => numero(item.orden_seccion))) + 1
      : numero(
        contenido.elementos.find((item) => item.seccion === seccionActiva)?.orden_seccion,
        1
      )

    const seccion = seccionActiva === 'todas'
      ? 'Nueva sección'
      : seccionActiva

    setContenido((actual) => ({
      ...actual,
      elementos: [
        ...actual.elementos,
        {
          id: `ADM_${Date.now()}`,
          area: 'Regla',
          seccion,
          tipo: 'Párrafo',
          orden_seccion: ordenSeccion,
          orden_elemento:
            actual.elementos.filter((item) => item.seccion === seccion).length + 1,
          icono: '',
          visible: true,
          texto: 'Nueva norma',
        },
      ],
    }))
  }

  function eliminarElemento(id) {
    if (!window.confirm('¿Quieres eliminar este elemento del reglamento?')) return

    setContenido((actual) => ({
      ...actual,
      elementos: actual.elementos.filter((elemento) => elemento.id !== id),
    }))
  }

  function actualizarPuntuacion(indice, campo, valor) {
    setContenido((actual) => ({
      ...actual,
      puntuacion: actual.puntuacion.map((fila, posicion) => (
        posicion === indice ? { ...fila, [campo]: valor } : fila
      )),
    }))
    setMensaje('')
  }

  function anadirPuntuacion() {
    setContenido((actual) => ({
      ...actual,
      puntuacion: [
        ...actual.puntuacion,
        {
          sistema: 'Competitivo',
          situacion: 'Nueva situación',
          ganador: '0',
          perdedor: '0',
        },
      ],
    }))
  }

  function eliminarPuntuacion(indice) {
    setContenido((actual) => ({
      ...actual,
      puntuacion: actual.puntuacion.filter((_, posicion) => posicion !== indice),
    }))
  }

  async function guardar() {
    setGuardando(true)
    setError('')
    setMensaje('')

    const siguiente = {
      ...contenido,
      version: numero(contenido.version, 0) + 1,
      generado: new Date().toISOString(),
      elementos: ordenarElementos(contenido.elementos),
    }

    const { data, error: errorGuardado } = await supabaseCampeonato.rpc(
      'admin_guardar_normas',
      {
        p_codigo: codigo,
        p_contenido: siguiente,
      }
    )

    if (errorGuardado || data?.ok !== true) {
      setError(
        errorGuardado?.message ||
        data?.error ||
        'No se pudo guardar el reglamento.'
      )
      setGuardando(false)
      return
    }

    setContenido(siguiente)
    setMensaje(`Reglamento guardado: ${data.elementos} elementos publicados.`)
    setGuardando(false)
  }

  return (
    <main className="app app-admin app-campeonato">
      <section className="panel-admin panel-normas-campeonato">
        <header className="cabecera-admin cabecera-campeonato">
          <div>
            <p className="etiqueta">CAMPEONATO</p>
            <h2>Normas y reglamento</h2>
            <p className="descripcion-admin">{codigo}</p>
          </div>
          <div className="acciones-cabecera-configuracion">
            <button type="button" className="boton boton-secundario" onClick={onConfiguracion}>
              ⚙ Configuración
            </button>
            <button type="button" className="boton boton-secundario" onClick={onVolver}>
              ← Gestión
            </button>
            <button type="button" className="boton boton-secundario" onClick={onPanelPrincipal}>
              ← Panel principal
            </button>
          </div>
        </header>

        {cargando ? <p className="estado">Cargando reglamento…</p> : null}
        {error ? <p className="mensaje-normas error" role="alert">{error}</p> : null}
        {mensaje ? <p className="mensaje-normas correcto" role="status">{mensaje}</p> : null}

        {!cargando && contenido ? (
          <>
            <section className="resumen-normas-admin">
              <div>
                <strong>{contenido.elementos.length}</strong>
                <span>Elementos</span>
              </div>
              <div>
                <strong>{secciones.length}</strong>
                <span>Secciones</span>
              </div>
              <div>
                <strong>{contenido.puntuacion.length}</strong>
                <span>Reglas de puntuación</span>
              </div>
            </section>

            <div className="barra-normas-admin">
              <select
                value={seccionActiva}
                onChange={(evento) => setSeccionActiva(evento.target.value)}
                aria-label="Filtrar por sección"
              >
                <option value="todas">Todas las secciones</option>
                {secciones.map((seccion) => (
                  <option key={seccion} value={seccion}>{seccion}</option>
                ))}
              </select>
              <input
                type="search"
                value={filtro}
                onChange={(evento) => setFiltro(evento.target.value)}
                placeholder="Buscar norma, texto o identificador"
                aria-label="Buscar en el reglamento"
              />
              <button type="button" className="boton boton-secundario" onClick={anadirElemento}>
                + Añadir norma
              </button>
            </div>

            <section className="lista-normas-admin" aria-label="Elementos del reglamento">
              {elementosVisibles.map((elemento) => (
                <article
                  className={`elemento-norma-admin ${elemento.visible === false ? 'norma-oculta-admin' : ''}`}
                  key={elemento.id}
                >
                  <div className="cabecera-elemento-norma">
                    <strong>{elemento.id}</strong>
                    <div className="acciones-elemento-norma">
                      <button
                        type="button"
                        className={`boton-visibilidad-norma ${elemento.visible === false ? 'oculta' : 'visible'}`}
                        onClick={() => actualizarElemento(
                          elemento.id,
                          'visible',
                          elemento.visible === false
                        )}
                        aria-pressed={elemento.visible !== false}
                      >
                        {elemento.visible === false ? '🙈 Oculta' : '👁 Visible'}
                      </button>
                      <button
                        type="button"
                        className="boton-eliminar-norma"
                        onClick={() => eliminarElemento(elemento.id)}
                        aria-label={`Eliminar ${elemento.id}`}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  <div className="campos-elemento-norma">
                    <label>
                      <span>Sección</span>
                      <input
                        value={elemento.seccion || ''}
                        onChange={(evento) => actualizarElemento(elemento.id, 'seccion', evento.target.value)}
                      />
                    </label>
                    <label>
                      <span>Tipo</span>
                      <select
                        value={elemento.tipo || 'Párrafo'}
                        onChange={(evento) => actualizarElemento(elemento.id, 'tipo', evento.target.value)}
                      >
                        {TIPOS_ELEMENTO.map((tipo) => <option key={tipo}>{tipo}</option>)}
                      </select>
                    </label>
                    <label className="campo-icono-norma">
                      <span>Icono</span>
                      <input
                        value={elemento.icono || ''}
                        onChange={(evento) => actualizarElemento(elemento.id, 'icono', evento.target.value)}
                      />
                    </label>
                    <label>
                      <span>Orden sección</span>
                      <input
                        type="number"
                        value={elemento.orden_seccion ?? 0}
                        onChange={(evento) => actualizarElemento(elemento.id, 'orden_seccion', numero(evento.target.value))}
                      />
                    </label>
                    <label>
                      <span>Orden elemento</span>
                      <input
                        type="number"
                        value={elemento.orden_elemento ?? 0}
                        onChange={(evento) => actualizarElemento(elemento.id, 'orden_elemento', numero(evento.target.value))}
                      />
                    </label>
                    <label className="campo-texto-norma">
                      <span>Texto publicado</span>
                      <textarea
                        rows="3"
                        value={elemento.texto || ''}
                        onChange={(evento) => actualizarElemento(elemento.id, 'texto', evento.target.value)}
                      />
                    </label>
                  </div>
                </article>
              ))}
              {!elementosVisibles.length ? (
                <p className="estado">No hay normas que coincidan con el filtro.</p>
              ) : null}
            </section>

            <section className="bloque-puntuacion-admin">
              <div className="titulo-bloque-normas">
                <div>
                  <p className="etiqueta">PUNTUACIÓN</p>
                  <h3>Reglas por sistema</h3>
                </div>
                <button type="button" className="boton boton-secundario" onClick={anadirPuntuacion}>
                  + Añadir regla
                </button>
              </div>

              <div className="tabla-puntuacion-admin">
                {contenido.puntuacion.map((fila, indice) => (
                  <div className="fila-puntuacion-admin" key={`${fila.sistema}-${fila.situacion}-${indice}`}>
                    {['sistema', 'situacion', 'ganador', 'perdedor'].map((campo) => (
                      <label key={campo}>
                        <span>{campo === 'situacion' ? 'Situación' : campo[0].toUpperCase() + campo.slice(1)}</span>
                        <input
                          value={fila[campo] ?? ''}
                          onChange={(evento) => actualizarPuntuacion(indice, campo, evento.target.value)}
                        />
                      </label>
                    ))}
                    <button
                      type="button"
                      className="boton-eliminar-norma"
                      onClick={() => eliminarPuntuacion(indice)}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <footer className="acciones-guardar-normas">
              <p>Los cambios se publican para este campeonato y se verán en la página pública de Normas.</p>
              <div>
                <button type="button" className="boton boton-secundario" onClick={cargar} disabled={guardando}>
                  Descartar cambios
                </button>
                <button type="button" className="boton boton-principal" onClick={guardar} disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar y publicar'}
                </button>
              </div>
            </footer>
          </>
        ) : null}
      </section>
    </main>
  )
}

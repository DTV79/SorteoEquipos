import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabaseCampeonato } from './lib/supabaseCampeonato'
import './GastosCampeonato.css'

const formateadorEuro = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

function numero(valor) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

function euros(valor) {
  return formateadorEuro.format(numero(valor))
}

function fechaHoy() {
  return new Date().toISOString().slice(0, 10)
}

function etiquetaTipoPersona(tipo) {
  return {
    jugador: 'Jugador',
    invitado: 'Invitado',
    organizacion: 'Organización',
    otro: 'Otro',
  }[tipo] || tipo
}

function etiquetaTipoActividad(tipo) {
  return {
    campeonato: 'Campeonato',
    sorteo: 'Sorteo / pinchos',
    cena: 'Cena',
    otro: 'Otra actividad',
  }[tipo] || tipo
}

function repartoTexto(movimiento) {
  return {
    no_repartir: 'No repartir',
    jugadores: 'Jugadores del campeonato',
    actividad: 'Asistentes a la actividad',
    manual: 'Selección / reparto manual',
  }[movimiento.modo_reparto] || movimiento.modo_reparto
}

const movimientoVacio = () => ({
  id_movimiento: null,
  tipo: 'gasto',
  fecha: fechaHoy(),
  categoria: '',
  concepto: '',
  importe: '',
  id_actividad: '',
  pagado_por: '',
  forma_pago: '',
  modo_reparto: 'no_repartir',
  justificante: '',
  observaciones: '',
})

export default function GastosCampeonato({ codigo, onVolver }) {
  const [datos, setDatos] = useState({
    campeonato: null,
    actividades: [],
    personas: [],
    movimientos: [],
  })
  const [pestana, setPestana] = useState('resumen')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [movimiento, setMovimiento] = useState(movimientoVacio)
  const [nuevoInvitado, setNuevoInvitado] = useState({
    nombre: '',
    tipo: 'invitado',
    relacionado_con: '',
    observaciones: '',
  })

  const cargar = useCallback(async () => {
    if (!codigo) return
    setCargando(true)
    setError('')

    const { data: inicializacion, error: errorInicializacion } =
      await supabaseCampeonato.rpc('admin_inicializar_economia', {
        p_codigo: codigo,
      })

    if (errorInicializacion || inicializacion?.ok !== true) {
      setError(
        errorInicializacion?.message ||
          inicializacion?.error ||
          'No se pudo preparar la gestión económica.'
      )
      setCargando(false)
      return
    }

    const { data, error: errorConsulta } = await supabaseCampeonato.rpc(
      'admin_obtener_economia',
      { p_codigo: codigo }
    )

    if (errorConsulta || data?.ok !== true) {
      setError(
        errorConsulta?.message ||
          data?.error ||
          'No se pudieron cargar los gastos del campeonato.'
      )
      setCargando(false)
      return
    }

    setDatos({
      campeonato: data.campeonato ?? null,
      actividades: data.actividades ?? [],
      personas: data.personas ?? [],
      movimientos: data.movimientos ?? [],
    })
    setCargando(false)
  }, [codigo])

  useEffect(() => {
    cargar()
  }, [cargar])

  const actividadesActivas = useMemo(
    () =>
      [...datos.actividades]
        .filter((actividad) => actividad.activo)
        .sort(
          (a, b) =>
            numero(a.orden) - numero(b.orden) ||
            numero(a.id_actividad) - numero(b.id_actividad)
        ),
    [datos.actividades]
  )

  const personasActivas = useMemo(
    () => datos.personas.filter((persona) => persona.activo),
    [datos.personas]
  )

  function obtenerAsistencia(persona, idActividad) {
    return (
      persona.asistencias?.find(
        (asistencia) =>
          numero(asistencia.id_actividad) === numero(idActividad)
      ) || {
        id_actividad: idActividad,
        asiste: false,
        importe: null,
        pagado: 0,
        menu: '',
        observaciones: '',
      }
    )
  }

  function importePersonaActividad(persona, actividad) {
    const asistencia = obtenerAsistencia(persona, actividad.id_actividad)
    if (!asistencia.asiste || !actividad.cobrable) return 0
    if (asistencia.importe === '' || asistencia.importe == null) {
      return numero(actividad.precio_persona)
    }
    return numero(asistencia.importe)
  }

  function pagadoPersonaActividad(persona, actividad) {
    const asistencia = obtenerAsistencia(persona, actividad.id_actividad)
    return asistencia.asiste ? numero(asistencia.pagado) : 0
  }

  const resumen = useMemo(() => {
    let cobrosPrevistos = 0
    let cobradoPersonas = 0

    personasActivas.forEach((persona) => {
      actividadesActivas.forEach((actividad) => {
        cobrosPrevistos += importePersonaActividad(persona, actividad)
        cobradoPersonas += pagadoPersonaActividad(persona, actividad)
      })
    })

    const gastos = datos.movimientos
      .filter((item) => item.tipo === 'gasto')
      .reduce((total, item) => total + numero(item.importe), 0)
    const ingresosManuales = datos.movimientos
      .filter((item) => item.tipo === 'ingreso')
      .reduce((total, item) => total + numero(item.importe), 0)
    const jugadores = personasActivas.filter(
      (persona) => persona.tipo === 'jugador'
    ).length

    return {
      cobrosPrevistos,
      cobradoPersonas,
      gastos,
      ingresosManuales,
      ingresosPrevistos: cobrosPrevistos + ingresosManuales,
      cobradoTotal: cobradoPersonas + ingresosManuales,
      pendiente: Math.max(cobrosPrevistos - cobradoPersonas, 0),
      saldo: cobradoPersonas + ingresosManuales - gastos,
      jugadores,
      costePorJugador: jugadores ? gastos / jugadores : 0,
    }
  }, [actividadesActivas, datos.movimientos, personasActivas])

  const resumenActividades = useMemo(
    () =>
      actividadesActivas.map((actividad) => {
        const asistentes = personasActivas.filter((persona) =>
          obtenerAsistencia(persona, actividad.id_actividad).asiste
        )
        const previsto = asistentes.reduce(
          (total, persona) =>
            total + importePersonaActividad(persona, actividad),
          0
        )
        const cobrado = asistentes.reduce(
          (total, persona) =>
            total + pagadoPersonaActividad(persona, actividad),
          0
        )
        const gasto = datos.movimientos
          .filter(
            (item) =>
              item.tipo === 'gasto' &&
              numero(item.id_actividad) === numero(actividad.id_actividad)
          )
          .reduce((total, item) => total + numero(item.importe), 0)
        const menus = {}

        asistentes.forEach((persona) => {
          const menu = obtenerAsistencia(
            persona,
            actividad.id_actividad
          ).menu?.trim()
          if (menu) menus[menu] = (menus[menu] || 0) + 1
        })

        return {
          ...actividad,
          asistentes: asistentes.length,
          previsto,
          cobrado,
          pendiente: Math.max(previsto - cobrado, 0),
          gasto,
          costePorAsistente: asistentes.length ? gasto / asistentes.length : 0,
          menus: Object.entries(menus).sort((a, b) => b[1] - a[1]),
        }
      }),
    [actividadesActivas, datos.movimientos, personasActivas]
  )

  function cambiarAsistencia(idPersona, idActividad, campo, valor) {
    setDatos((actual) => ({
      ...actual,
      personas: actual.personas.map((persona) => {
        if (numero(persona.id_persona) !== numero(idPersona)) return persona

        const existe = persona.asistencias?.some(
          (asistencia) =>
            numero(asistencia.id_actividad) === numero(idActividad)
        )
        const asistencias = existe
          ? persona.asistencias.map((asistencia) =>
              numero(asistencia.id_actividad) === numero(idActividad)
                ? { ...asistencia, [campo]: valor }
                : asistencia
            )
          : [
              ...(persona.asistencias ?? []),
              {
                id_actividad: idActividad,
                asiste: false,
                importe: null,
                pagado: 0,
                menu: '',
                observaciones: '',
                [campo]: valor,
              },
            ]

        return { ...persona, asistencias }
      }),
    }))
  }

  async function guardarAsistencias() {
    setGuardando('asistencias')
    setMensaje(null)

    const filas = []
    personasActivas.forEach((persona) => {
      actividadesActivas.forEach((actividad) => {
        const asistencia = obtenerAsistencia(
          persona,
          actividad.id_actividad
        )
        filas.push({
          id_persona: persona.id_persona,
          id_actividad: actividad.id_actividad,
          asiste: Boolean(asistencia.asiste),
          importe:
            asistencia.importe === '' || asistencia.importe == null
              ? null
              : numero(asistencia.importe),
          pagado: Math.max(numero(asistencia.pagado), 0),
          menu: asistencia.menu || '',
          observaciones: asistencia.observaciones || '',
        })
      })
    })

    const { data, error: errorGuardado } = await supabaseCampeonato.rpc(
      'admin_economia_guardar_asistencias',
      { p_codigo: codigo, p_datos: filas }
    )

    if (errorGuardado || data?.ok !== true) {
      setMensaje({
        tipo: 'error',
        texto:
          errorGuardado?.message ||
          data?.error ||
          'No se pudieron guardar las asistencias.',
      })
      setGuardando('')
      return
    }

    setMensaje({
      tipo: 'correcto',
      texto: 'Asistencia, importes y pagos guardados.',
    })
    setGuardando('')
    await cargar()
  }

  async function guardarInvitado(evento) {
    evento.preventDefault()
    if (!nuevoInvitado.nombre.trim()) {
      setMensaje({ tipo: 'error', texto: 'Indica el nombre del asistente.' })
      return
    }

    setGuardando('invitado')
    setMensaje(null)
    const { data, error: errorGuardado } = await supabaseCampeonato.rpc(
      'admin_economia_guardar_persona',
      {
        p_codigo: codigo,
        p_id_persona: null,
        p_nombre: nuevoInvitado.nombre.trim(),
        p_tipo: nuevoInvitado.tipo,
        p_relacionado_con: nuevoInvitado.relacionado_con.trim() || null,
        p_observaciones: nuevoInvitado.observaciones.trim() || null,
        p_activo: true,
      }
    )

    if (errorGuardado || data?.ok !== true) {
      setMensaje({
        tipo: 'error',
        texto:
          errorGuardado?.message ||
          data?.error ||
          'No se pudo añadir el asistente.',
      })
      setGuardando('')
      return
    }

    setNuevoInvitado({
      nombre: '',
      tipo: 'invitado',
      relacionado_con: '',
      observaciones: '',
    })
    setMensaje({ tipo: 'correcto', texto: 'Asistente añadido.' })
    setGuardando('')
    await cargar()
  }

  async function desactivarPersona(persona) {
    if (
      !window.confirm(
        `¿Quitar a ${persona.nombre} de la gestión de asistentes de este campeonato?`
      )
    ) {
      return
    }

    setGuardando(`persona-${persona.id_persona}`)
    const { data, error: errorGuardado } = await supabaseCampeonato.rpc(
      'admin_economia_guardar_persona',
      {
        p_codigo: codigo,
        p_id_persona: persona.id_persona,
        p_nombre: persona.nombre,
        p_tipo: persona.tipo,
        p_relacionado_con: persona.relacionado_con || null,
        p_observaciones: persona.observaciones || null,
        p_activo: false,
      }
    )

    if (errorGuardado || data?.ok !== true) {
      setMensaje({
        tipo: 'error',
        texto:
          errorGuardado?.message || data?.error || 'No se pudo quitar.',
      })
      setGuardando('')
      return
    }

    setGuardando('')
    await cargar()
  }

  async function guardarMovimiento(evento) {
    evento.preventDefault()
    if (!movimiento.concepto.trim() || numero(movimiento.importe) <= 0) {
      setMensaje({
        tipo: 'error',
        texto: 'Indica un concepto y un importe mayor que cero.',
      })
      return
    }

    setGuardando('movimiento')
    setMensaje(null)
    const { data, error: errorGuardado } = await supabaseCampeonato.rpc(
      'admin_economia_guardar_movimiento',
      {
        p_codigo: codigo,
        p_id_movimiento: movimiento.id_movimiento,
        p_tipo: movimiento.tipo,
        p_fecha: movimiento.fecha || null,
        p_categoria: movimiento.categoria.trim() || null,
        p_concepto: movimiento.concepto.trim(),
        p_importe: numero(movimiento.importe),
        p_id_actividad: movimiento.id_actividad
          ? numero(movimiento.id_actividad)
          : null,
        p_pagado_por: movimiento.pagado_por.trim() || null,
        p_forma_pago: movimiento.forma_pago.trim() || null,
        p_modo_reparto: movimiento.modo_reparto,
        p_justificante: movimiento.justificante.trim() || null,
        p_observaciones: movimiento.observaciones.trim() || null,
      }
    )

    if (errorGuardado || data?.ok !== true) {
      setMensaje({
        tipo: 'error',
        texto:
          errorGuardado?.message ||
          data?.error ||
          'No se pudo guardar el movimiento.',
      })
      setGuardando('')
      return
    }

    setMovimiento(movimientoVacio())
    setMensaje({
      tipo: 'correcto',
      texto: movimiento.id_movimiento
        ? 'Movimiento actualizado.'
        : 'Movimiento añadido.',
    })
    setGuardando('')
    await cargar()
  }

  async function eliminarMovimiento(item) {
    if (!window.confirm(`¿Eliminar “${item.concepto}”?`)) return
    setGuardando(`movimiento-${item.id_movimiento}`)

    const { data, error: errorBorrado } = await supabaseCampeonato.rpc(
      'admin_economia_eliminar_movimiento',
      { p_codigo: codigo, p_id_movimiento: item.id_movimiento }
    )

    if (errorBorrado || data?.ok !== true) {
      setMensaje({
        tipo: 'error',
        texto:
          errorBorrado?.message || data?.error || 'No se pudo eliminar.',
      })
      setGuardando('')
      return
    }

    if (numero(movimiento.id_movimiento) === numero(item.id_movimiento)) {
      setMovimiento(movimientoVacio())
    }
    setGuardando('')
    await cargar()
  }

  function editarMovimiento(item) {
    setMovimiento({
      id_movimiento: item.id_movimiento,
      tipo: item.tipo || 'gasto',
      fecha: item.fecha || fechaHoy(),
      categoria: item.categoria || '',
      concepto: item.concepto || '',
      importe: item.importe ?? '',
      id_actividad: item.id_actividad ?? '',
      pagado_por: item.pagado_por || '',
      forma_pago: item.forma_pago || '',
      modo_reparto: item.modo_reparto || 'no_repartir',
      justificante: item.justificante || '',
      observaciones: item.observaciones || '',
    })
    setPestana('movimientos')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function guardarActividad(evento, actividad = null) {
    evento.preventDefault()
    const formulario = new FormData(evento.currentTarget)
    const nombre = formulario.get('nombre')?.trim()
    if (!nombre) {
      setMensaje({ tipo: 'error', texto: 'Indica el nombre de la actividad.' })
      return
    }

    const clave = actividad
      ? `actividad-${actividad.id_actividad}`
      : 'actividad-nueva'
    setGuardando(clave)
    setMensaje(null)

    const { data, error: errorGuardado } = await supabaseCampeonato.rpc(
      'admin_economia_guardar_actividad',
      {
        p_codigo: codigo,
        p_id_actividad: actividad?.id_actividad ?? null,
        p_nombre: nombre,
        p_tipo: formulario.get('tipo') || 'otro',
        p_fecha: formulario.get('fecha') || null,
        p_cobrable: formulario.has('cobrable'),
        p_precio_persona: numero(formulario.get('precio_persona')),
        p_activo: formulario.has('activo'),
        p_orden: numero(formulario.get('orden')) || 100,
      }
    )

    if (errorGuardado || data?.ok !== true) {
      setMensaje({
        tipo: 'error',
        texto:
          errorGuardado?.message ||
          data?.error ||
          'No se pudo guardar la actividad.',
      })
      setGuardando('')
      return
    }

    if (!actividad) evento.currentTarget.reset()
    setMensaje({ tipo: 'correcto', texto: 'Actividad guardada.' })
    setGuardando('')
    await cargar()
  }

  function personasReparto(item) {
    if (item.modo_reparto === 'jugadores') {
      return personasActivas.filter((persona) => persona.tipo === 'jugador')
        .length
    }
    if (item.modo_reparto === 'actividad' && item.id_actividad) {
      return personasActivas.filter((persona) =>
        obtenerAsistencia(persona, item.id_actividad).asiste
      ).length
    }
    return 0
  }

  if (cargando) {
    return (
      <main className="app app-admin app-campeonato gastos-campeonato">
        <section className="panel-admin panel-campeonato">
          <p className="estado">Preparando gastos del campeonato…</p>
        </section>
      </main>
    )
  }

  return (
    <main className="app app-admin app-campeonato gastos-campeonato">
      <section className="panel-admin panel-campeonato">
        <header className="cabecera-admin cabecera-campeonato">
          <div>
            <p className="etiqueta">CAMPEONATO · ECONOMÍA</p>
            <h2>Gastos, asistentes y cobros</h2>
            <p className="descripcion-admin">
              {datos.campeonato?.nombre || codigo} · {codigo}
            </p>
          </div>
          <div className="acciones-cabecera-configuracion">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={onVolver}
            >
              ← Gestión
            </button>
          </div>
        </header>

        <nav className="gastos-pestanas" aria-label="Secciones de gastos">
          <button
            type="button"
            className={pestana === 'resumen' ? 'activo' : ''}
            onClick={() => setPestana('resumen')}
          >
            Resumen
          </button>
          <button
            type="button"
            className={pestana === 'movimientos' ? 'activo' : ''}
            onClick={() => setPestana('movimientos')}
          >
            Gastos e ingresos
          </button>
          <button
            type="button"
            className={pestana === 'asistencia' ? 'activo' : ''}
            onClick={() => setPestana('asistencia')}
          >
            Asistencia y cobros
          </button>
          <button
            type="button"
            className={pestana === 'configuracion' ? 'activo' : ''}
            onClick={() => setPestana('configuracion')}
          >
            Configuración de eventos
          </button>
        </nav>

        {error && <p className="mensaje-economia error">{error}</p>}
        {mensaje && (
          <p className={`mensaje-economia ${mensaje.tipo}`}>{mensaje.texto}</p>
        )}

        {pestana === 'resumen' && (
          <>
            <section className="resumen-economia-grid">
              <article>
                <span>Ingresos previstos</span>
                <strong>{euros(resumen.ingresosPrevistos)}</strong>
                <small>Cobros a personas + otros ingresos</small>
              </article>
              <article>
                <span>Cobrado</span>
                <strong>{euros(resumen.cobradoTotal)}</strong>
                <small>Pagos registrados + ingresos</small>
              </article>
              <article className={resumen.pendiente > 0 ? 'pendiente' : ''}>
                <span>Pendiente de cobrar</span>
                <strong>{euros(resumen.pendiente)}</strong>
                <small>Solo cuotas de asistentes</small>
              </article>
              <article>
                <span>Gastos</span>
                <strong>{euros(resumen.gastos)}</strong>
                <small>Todos los gastos registrados</small>
              </article>
              <article className={resumen.saldo < 0 ? 'negativo' : 'positivo'}>
                <span>Saldo real</span>
                <strong>{euros(resumen.saldo)}</strong>
                <small>Dinero cobrado menos gastos</small>
              </article>
              <article>
                <span>Coste por jugador</span>
                <strong>{euros(resumen.costePorJugador)}</strong>
                <small>{resumen.jugadores} jugadores activos</small>
              </article>
            </section>

            <section className="bloque-economia">
              <div className="titulo-bloque-economia">
                <div>
                  <h3>Actividades</h3>
                  <p>
                    Cada actividad tiene sus propios asistentes, cuotas y gastos.
                  </p>
                </div>
              </div>

              <div className="actividad-resumen-grid">
                {resumenActividades.map((actividad) => (
                  <article
                    className="actividad-resumen"
                    key={actividad.id_actividad}
                  >
                    <header>
                      <div>
                        <span>{etiquetaTipoActividad(actividad.tipo)}</span>
                        <strong>{actividad.nombre}</strong>
                      </div>
                      <b>{actividad.asistentes} asistentes</b>
                    </header>
                    <div className="actividad-cifras">
                      <span>
                        Previsto <strong>{euros(actividad.previsto)}</strong>
                      </span>
                      <span>
                        Cobrado <strong>{euros(actividad.cobrado)}</strong>
                      </span>
                      <span>
                        Gastos <strong>{euros(actividad.gasto)}</strong>
                      </span>
                      <span>
                        Coste/asistente{' '}
                        <strong>{euros(actividad.costePorAsistente)}</strong>
                      </span>
                    </div>
                    {actividad.pendiente > 0 && (
                      <p className="actividad-pendiente">
                        Pendiente: {euros(actividad.pendiente)}
                      </p>
                    )}
                    {actividad.menus.length > 0 && (
                      <div className="resumen-menus">
                        <strong>Menús / opciones</strong>
                        {actividad.menus.map(([menu, cantidad]) => (
                          <span key={menu}>
                            {cantidad} × {menu}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className="bloque-economia">
              <div className="titulo-bloque-economia">
                <div>
                  <h3>Últimos movimientos</h3>
                  <p>Los cinco gastos o ingresos más recientes.</p>
                </div>
                <button
                  type="button"
                  className="boton boton-secundario"
                  onClick={() => setPestana('movimientos')}
                >
                  Ver todos
                </button>
              </div>
              <div className="lista-movimientos resumen">
                {datos.movimientos.slice(0, 5).map((item) => (
                  <article key={item.id_movimiento}>
                    <div>
                      <span className={`tipo-movimiento ${item.tipo}`}>
                        {item.tipo === 'gasto' ? 'Gasto' : 'Ingreso'}
                      </span>
                      <strong>{item.concepto}</strong>
                      <small>
                        {[item.fecha, item.actividad, item.categoria]
                          .filter(Boolean)
                          .join(' · ')}
                      </small>
                    </div>
                    <b className={item.tipo}>{
                      item.tipo === 'gasto' ? '−' : '+'
                    }{euros(item.importe)}</b>
                  </article>
                ))}
                {datos.movimientos.length === 0 && (
                  <p className="estado">Todavía no hay movimientos.</p>
                )}
              </div>
            </section>
          </>
        )}

        {pestana === 'movimientos' && (
          <>
            <section className="bloque-economia formulario-movimiento-bloque">
              <div className="titulo-bloque-economia">
                <div>
                  <h3>
                    {movimiento.id_movimiento
                      ? 'Editar movimiento'
                      : 'Nuevo gasto o ingreso'}
                  </h3>
                  <p>
                    Registra pistas, pelotas, comida, premios, patrocinios o
                    cualquier otro movimiento.
                  </p>
                </div>
                {movimiento.id_movimiento && (
                  <button
                    type="button"
                    className="boton boton-secundario"
                    onClick={() => setMovimiento(movimientoVacio())}
                  >
                    Cancelar edición
                  </button>
                )}
              </div>

              <form className="formulario-economia" onSubmit={guardarMovimiento}>
                <label>
                  <span>Tipo</span>
                  <select
                    value={movimiento.tipo}
                    onChange={(evento) =>
                      setMovimiento((actual) => ({
                        ...actual,
                        tipo: evento.target.value,
                      }))
                    }
                  >
                    <option value="gasto">Gasto</option>
                    <option value="ingreso">Ingreso</option>
                  </select>
                </label>
                <label>
                  <span>Fecha</span>
                  <input
                    type="date"
                    value={movimiento.fecha}
                    onChange={(evento) =>
                      setMovimiento((actual) => ({
                        ...actual,
                        fecha: evento.target.value,
                      }))
                    }
                  />
                </label>
                <label className="campo-ancho">
                  <span>Concepto</span>
                  <input
                    value={movimiento.concepto}
                    onChange={(evento) =>
                      setMovimiento((actual) => ({
                        ...actual,
                        concepto: evento.target.value,
                      }))
                    }
                    placeholder="Ej. Trofeos campeones"
                  />
                </label>
                <label>
                  <span>Importe</span>
                  <div className="input-euro">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={movimiento.importe}
                      onChange={(evento) =>
                        setMovimiento((actual) => ({
                          ...actual,
                          importe: evento.target.value,
                        }))
                      }
                    />
                    <b>€</b>
                  </div>
                </label>
                <label>
                  <span>Categoría</span>
                  <input
                    value={movimiento.categoria}
                    onChange={(evento) =>
                      setMovimiento((actual) => ({
                        ...actual,
                        categoria: evento.target.value,
                      }))
                    }
                    placeholder="Pistas, comida, premios…"
                  />
                </label>
                <label>
                  <span>Actividad</span>
                  <select
                    value={movimiento.id_actividad}
                    onChange={(evento) =>
                      setMovimiento((actual) => ({
                        ...actual,
                        id_actividad: evento.target.value,
                      }))
                    }
                  >
                    <option value="">General del campeonato</option>
                    {actividadesActivas.map((actividad) => (
                      <option
                        key={actividad.id_actividad}
                        value={actividad.id_actividad}
                      >
                        {actividad.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Repartir entre</span>
                  <select
                    value={movimiento.modo_reparto}
                    onChange={(evento) =>
                      setMovimiento((actual) => ({
                        ...actual,
                        modo_reparto: evento.target.value,
                      }))
                    }
                  >
                    <option value="no_repartir">No repartir</option>
                    <option value="jugadores">Jugadores del campeonato</option>
                    <option value="actividad">Asistentes a la actividad</option>
                    <option value="manual">Selección / reparto manual</option>
                  </select>
                </label>
                <label>
                  <span>Pagado por / adelantado por</span>
                  <input
                    value={movimiento.pagado_por}
                    onChange={(evento) =>
                      setMovimiento((actual) => ({
                        ...actual,
                        pagado_por: evento.target.value,
                      }))
                    }
                    placeholder="Ej. Diego"
                  />
                </label>
                <label>
                  <span>Forma de pago</span>
                  <input
                    value={movimiento.forma_pago}
                    onChange={(evento) =>
                      setMovimiento((actual) => ({
                        ...actual,
                        forma_pago: evento.target.value,
                      }))
                    }
                    placeholder="Efectivo, Bizum…"
                  />
                </label>
                <label className="campo-ancho">
                  <span>Justificante / referencia</span>
                  <input
                    value={movimiento.justificante}
                    onChange={(evento) =>
                      setMovimiento((actual) => ({
                        ...actual,
                        justificante: evento.target.value,
                      }))
                    }
                    placeholder="Ticket, factura o referencia"
                  />
                </label>
                <label className="campo-completo">
                  <span>Observaciones</span>
                  <textarea
                    value={movimiento.observaciones}
                    onChange={(evento) =>
                      setMovimiento((actual) => ({
                        ...actual,
                        observaciones: evento.target.value,
                      }))
                    }
                    rows="2"
                  />
                </label>
                <div className="acciones-formulario-economia campo-completo">
                  <button
                    type="submit"
                    className="boton boton-principal"
                    disabled={guardando === 'movimiento'}
                  >
                    {guardando === 'movimiento'
                      ? 'Guardando…'
                      : movimiento.id_movimiento
                        ? 'Guardar cambios'
                        : 'Añadir movimiento'}
                  </button>
                </div>
              </form>
            </section>

            <section className="bloque-economia">
              <div className="titulo-bloque-economia">
                <div>
                  <h3>Movimientos</h3>
                  <p>
                    {datos.movimientos.length} movimientos · Gastos{' '}
                    {euros(resumen.gastos)} · Otros ingresos{' '}
                    {euros(resumen.ingresosManuales)}
                  </p>
                </div>
              </div>

              <div className="lista-movimientos">
                {datos.movimientos.map((item) => {
                  const cantidadReparto = personasReparto(item)
                  return (
                    <article key={item.id_movimiento}>
                      <div className="movimiento-principal">
                        <span className={`tipo-movimiento ${item.tipo}`}>
                          {item.tipo === 'gasto' ? 'Gasto' : 'Ingreso'}
                        </span>
                        <strong>{item.concepto}</strong>
                        <small>
                          {[item.fecha, item.actividad, item.categoria]
                            .filter(Boolean)
                            .join(' · ')}
                        </small>
                        <div className="movimiento-detalles">
                          {item.pagado_por && (
                            <span>Pagado por: {item.pagado_por}</span>
                          )}
                          {item.forma_pago && <span>{item.forma_pago}</span>}
                          {item.tipo === 'gasto' && (
                            <span>{repartoTexto(item)}</span>
                          )}
                          {cantidadReparto > 0 && (
                            <span>
                              {euros(numero(item.importe) / cantidadReparto)} / persona
                              ({cantidadReparto})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="movimiento-importe-acciones">
                        <b className={item.tipo}>
                          {item.tipo === 'gasto' ? '−' : '+'}
                          {euros(item.importe)}
                        </b>
                        <div>
                          <button
                            type="button"
                            className="boton-enlace"
                            onClick={() => editarMovimiento(item)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="boton-enlace peligro"
                            disabled={
                              guardando === `movimiento-${item.id_movimiento}`
                            }
                            onClick={() => eliminarMovimiento(item)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
                {datos.movimientos.length === 0 && (
                  <p className="estado">Todavía no hay gastos ni ingresos.</p>
                )}
              </div>
            </section>
          </>
        )}

        {pestana === 'asistencia' && (
          <>
            <section className="bloque-economia">
              <div className="titulo-bloque-economia">
                <div>
                  <h3>Añadir asistente o invitado</h3>
                  <p>
                    Puede venir al sorteo o a la cena aunque no participe en el
                    campeonato.
                  </p>
                </div>
              </div>
              <form className="formulario-invitado" onSubmit={guardarInvitado}>
                <label>
                  <span>Nombre</span>
                  <input
                    value={nuevoInvitado.nombre}
                    onChange={(evento) =>
                      setNuevoInvitado((actual) => ({
                        ...actual,
                        nombre: evento.target.value,
                      }))
                    }
                    placeholder="Nombre o alias"
                  />
                </label>
                <label>
                  <span>Tipo</span>
                  <select
                    value={nuevoInvitado.tipo}
                    onChange={(evento) =>
                      setNuevoInvitado((actual) => ({
                        ...actual,
                        tipo: evento.target.value,
                      }))
                    }
                  >
                    <option value="invitado">Invitado</option>
                    <option value="organizacion">Organización</option>
                    <option value="otro">Otro</option>
                  </select>
                </label>
                <label>
                  <span>Relacionado con</span>
                  <input
                    value={nuevoInvitado.relacionado_con}
                    onChange={(evento) =>
                      setNuevoInvitado((actual) => ({
                        ...actual,
                        relacionado_con: evento.target.value,
                      }))
                    }
                    placeholder="Opcional · Ej. Diego"
                  />
                </label>
                <label>
                  <span>Observaciones</span>
                  <input
                    value={nuevoInvitado.observaciones}
                    onChange={(evento) =>
                      setNuevoInvitado((actual) => ({
                        ...actual,
                        observaciones: evento.target.value,
                      }))
                    }
                  />
                </label>
                <button
                  type="submit"
                  className="boton boton-principal"
                  disabled={guardando === 'invitado'}
                >
                  {guardando === 'invitado' ? 'Añadiendo…' : 'Añadir asistente'}
                </button>
              </form>
            </section>

            <section className="bloque-economia">
              <div className="titulo-bloque-economia">
                <div>
                  <h3>Asistencia y cobros</h3>
                  <p>
                    Marca a qué va cada persona. Un importe en blanco usa el
                    precio base configurado para esa actividad.
                  </p>
                </div>
                <button
                  type="button"
                  className="boton boton-principal"
                  disabled={guardando === 'asistencias'}
                  onClick={guardarAsistencias}
                >
                  {guardando === 'asistencias'
                    ? 'Guardando…'
                    : 'Guardar cambios'}
                </button>
              </div>

              <div className="lista-personas-economia">
                {personasActivas.map((persona) => (
                  <article className="persona-economia" key={persona.id_persona}>
                    <header>
                      <div>
                        <strong>{persona.nombre}</strong>
                        <span>
                          {etiquetaTipoPersona(persona.tipo)}
                          {persona.relacionado_con
                            ? ` · relacionado con ${persona.relacionado_con}`
                            : ''}
                        </span>
                      </div>
                      {persona.tipo !== 'jugador' && (
                        <button
                          type="button"
                          className="boton-enlace peligro"
                          disabled={
                            guardando === `persona-${persona.id_persona}`
                          }
                          onClick={() => desactivarPersona(persona)}
                        >
                          Quitar
                        </button>
                      )}
                    </header>

                    <div className="actividades-persona">
                      {actividadesActivas.map((actividad) => {
                        const asistencia = obtenerAsistencia(
                          persona,
                          actividad.id_actividad
                        )
                        const aCobrar = importePersonaActividad(
                          persona,
                          actividad
                        )
                        return (
                          <section
                            className={`actividad-persona ${
                              asistencia.asiste ? 'asiste' : ''
                            }`}
                            key={actividad.id_actividad}
                          >
                            <label className="check-asistencia">
                              <input
                                type="checkbox"
                                checked={Boolean(asistencia.asiste)}
                                onChange={(evento) =>
                                  cambiarAsistencia(
                                    persona.id_persona,
                                    actividad.id_actividad,
                                    'asiste',
                                    evento.target.checked
                                  )
                                }
                              />
                              <span>
                                <strong>{actividad.nombre}</strong>
                                <small>
                                  {actividad.cobrable
                                    ? `Base ${euros(actividad.precio_persona)}`
                                    : 'Sin cobro'}
                                </small>
                              </span>
                            </label>

                            {asistencia.asiste && actividad.cobrable && (
                              <div className="cobro-actividad-persona">
                                <label>
                                  <span>A cobrar</span>
                                  <div className="input-euro">
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      min="0"
                                      step="0.01"
                                      value={asistencia.importe ?? ''}
                                      placeholder={String(
                                        numero(actividad.precio_persona)
                                      )}
                                      onChange={(evento) =>
                                        cambiarAsistencia(
                                          persona.id_persona,
                                          actividad.id_actividad,
                                          'importe',
                                          evento.target.value
                                        )
                                      }
                                    />
                                    <b>€</b>
                                  </div>
                                </label>
                                <label>
                                  <span>Pagado</span>
                                  <div className="input-euro">
                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      min="0"
                                      step="0.01"
                                      value={asistencia.pagado ?? 0}
                                      onChange={(evento) =>
                                        cambiarAsistencia(
                                          persona.id_persona,
                                          actividad.id_actividad,
                                          'pagado',
                                          evento.target.value
                                        )
                                      }
                                    />
                                    <b>€</b>
                                  </div>
                                </label>
                                <button
                                  type="button"
                                  className="boton-pagado"
                                  onClick={() =>
                                    cambiarAsistencia(
                                      persona.id_persona,
                                      actividad.id_actividad,
                                      'pagado',
                                      aCobrar
                                    )
                                  }
                                >
                                  Marcar pagado
                                </button>
                              </div>
                            )}

                            {asistencia.asiste &&
                              ['cena', 'sorteo'].includes(actividad.tipo) && (
                                <label className="menu-persona">
                                  <span>
                                    {actividad.tipo === 'cena'
                                      ? 'Menú / plato'
                                      : 'Detalle / opción'}
                                  </span>
                                  <input
                                    value={asistencia.menu || ''}
                                    onChange={(evento) =>
                                      cambiarAsistencia(
                                        persona.id_persona,
                                        actividad.id_actividad,
                                        'menu',
                                        evento.target.value
                                      )
                                    }
                                    placeholder={
                                      actividad.tipo === 'cena'
                                        ? 'Ej. Solomillo cerdo pimienta'
                                        : 'Opcional'
                                    }
                                  />
                                </label>
                              )}
                          </section>
                        )
                      })}
                    </div>
                  </article>
                ))}
              </div>

              <div className="pie-guardar-asistencia">
                <button
                  type="button"
                  className="boton boton-principal"
                  disabled={guardando === 'asistencias'}
                  onClick={guardarAsistencias}
                >
                  {guardando === 'asistencias'
                    ? 'Guardando…'
                    : 'Guardar asistencia y cobros'}
                </button>
              </div>
            </section>
          </>
        )}

        {pestana === 'configuracion' && (
          <>
            <section className="bloque-economia">
              <div className="titulo-bloque-economia">
                <div>
                  <h3>Actividades del campeonato</h3>
                  <p>
                    El campeonato, los pinchos del sorteo y la cena funcionan
                    por separado. Puedes cambiar precios o añadir más actos.
                  </p>
                </div>
              </div>

              <div className="lista-config-actividades">
                {datos.actividades.map((actividad) => (
                  <form
                    className="config-actividad"
                    key={actividad.id_actividad}
                    onSubmit={(evento) =>
                      guardarActividad(evento, actividad)
                    }
                  >
                    <header>
                      <strong>{actividad.nombre}</strong>
                      <span>{actividad.codigo}</span>
                    </header>
                    <div className="campos-config-actividad">
                      <label>
                        <span>Nombre</span>
                        <input name="nombre" defaultValue={actividad.nombre} />
                      </label>
                      <label>
                        <span>Tipo</span>
                        <select name="tipo" defaultValue={actividad.tipo}>
                          <option value="campeonato">Campeonato</option>
                          <option value="sorteo">Sorteo / pinchos</option>
                          <option value="cena">Cena</option>
                          <option value="otro">Otra actividad</option>
                        </select>
                      </label>
                      <label>
                        <span>Fecha</span>
                        <input
                          name="fecha"
                          type="date"
                          defaultValue={actividad.fecha || ''}
                        />
                      </label>
                      <label>
                        <span>Precio base por persona</span>
                        <div className="input-euro">
                          <input
                            name="precio_persona"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={actividad.precio_persona ?? 0}
                          />
                          <b>€</b>
                        </div>
                      </label>
                      <label>
                        <span>Orden</span>
                        <input
                          name="orden"
                          type="number"
                          defaultValue={actividad.orden ?? 100}
                        />
                      </label>
                      <div className="checks-config-actividad">
                        <label>
                          <input
                            type="checkbox"
                            name="cobrable"
                            defaultChecked={actividad.cobrable}
                          />
                          Se cobra a los asistentes
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            name="activo"
                            defaultChecked={actividad.activo}
                          />
                          Actividad activa
                        </label>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="boton boton-secundario"
                      disabled={
                        guardando === `actividad-${actividad.id_actividad}`
                      }
                    >
                      {guardando === `actividad-${actividad.id_actividad}`
                        ? 'Guardando…'
                        : 'Guardar actividad'}
                    </button>
                  </form>
                ))}
              </div>
            </section>

            <section className="bloque-economia">
              <div className="titulo-bloque-economia">
                <div>
                  <h3>Añadir otra actividad</h3>
                  <p>
                    Por ejemplo una comida, una celebración o cualquier acto
                    adicional.
                  </p>
                </div>
              </div>
              <form
                className="formulario-economia nueva-actividad"
                onSubmit={(evento) => guardarActividad(evento, null)}
              >
                <label className="campo-ancho">
                  <span>Nombre</span>
                  <input name="nombre" placeholder="Nombre de la actividad" />
                </label>
                <label>
                  <span>Tipo</span>
                  <select name="tipo" defaultValue="otro">
                    <option value="otro">Otra actividad</option>
                    <option value="sorteo">Sorteo / pinchos</option>
                    <option value="cena">Cena</option>
                    <option value="campeonato">Campeonato</option>
                  </select>
                </label>
                <label>
                  <span>Fecha</span>
                  <input name="fecha" type="date" />
                </label>
                <label>
                  <span>Precio base</span>
                  <div className="input-euro">
                    <input
                      name="precio_persona"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue="0"
                    />
                    <b>€</b>
                  </div>
                </label>
                <label>
                  <span>Orden</span>
                  <input name="orden" type="number" defaultValue="100" />
                </label>
                <div className="checks-config-actividad">
                  <label>
                    <input type="checkbox" name="cobrable" defaultChecked />
                    Se cobra a los asistentes
                  </label>
                  <label>
                    <input type="checkbox" name="activo" defaultChecked />
                    Actividad activa
                  </label>
                </div>
                <div className="acciones-formulario-economia campo-completo">
                  <button
                    type="submit"
                    className="boton boton-principal"
                    disabled={guardando === 'actividad-nueva'}
                  >
                    {guardando === 'actividad-nueva'
                      ? 'Añadiendo…'
                      : 'Añadir actividad'}
                  </button>
                </div>
              </form>
            </section>
          </>
        )}
      </section>
    </main>
  )
}

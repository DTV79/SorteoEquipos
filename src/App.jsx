import { Fragment, useEffect, useRef, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabase'

/*
============================================================
VALORES POR DEFECTO DE LA PRESENTACIÓN
============================================================

Cada sorteo puede guardar sus propios tiempos en Supabase.
Estos valores actúan como respaldo para sorteos antiguos o
mientras todavía no se haya cargado la configuración.
*/

const CONFIG_PRESENTACION = {
  retrasoPrimerJugadorMs: 650,
  intervaloRevelacionMs: 2500,
  margenBloqueoAdminMs: 700,
  pausaEntreEquiposRepeticionMs: 1800,
  pausaAntesResumenRepeticionMs: 2500,
}


function limitarNumero(valor, minimo, maximo, respaldo) {
  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return respaldo
  }

  return Math.min(
    maximo,
    Math.max(
      minimo,
      Math.round(numero)
    )
  )
}

function formatearMilisegundosSegundos(valor) {
  const segundos =
    Number(valor) / 1000

  return Number.isInteger(segundos)
    ? String(segundos)
    : segundos.toFixed(1)
}

function formatearHuellaCorta(valor) {
  const huella =
    String(valor ?? '')
      .replace(/[^a-fA-F0-9]/g, '')
      .toUpperCase()

  if (!huella) {
    return 'Sin huella'
  }

  const visible =
    huella.slice(0, 24)

  const partes =
    visible.match(/.{1,4}/g) ?? []

  return (
    partes.join('-') +
    (
      huella.length > visible.length
        ? '…'
        : ''
    )
  )
}

function formatearFechaHoraPantalla(valor) {
  if (!valor) {
    return '—'
  }

  const fecha = new Date(valor)

  if (
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return String(valor)
  }

  return new Intl.DateTimeFormat(
    'es-ES',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }
  ).format(fecha)
}


function generarCodigoBomboAutomatico(indice) {
  let numero = Number(indice) + 1
  let codigo = ''

  while (numero > 0) {
    numero -= 1

    codigo =
      String.fromCharCode(
        65 + (numero % 26)
      ) + codigo

    numero =
      Math.floor(numero / 26)
  }

  return codigo
}

function formatearFechaPantalla(valor) {
  if (!valor) {
    return 'Sin fecha'
  }

  const texto = String(valor).trim()

  const coincidencia =
    texto.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (coincidencia) {
    const [, anio, mes, dia] = coincidencia
    return `${dia}/${mes}/${anio}`
  }

  return texto
}

function App() {
  /*
  ============================================================
  ESTADO GENERAL DE LA APLICACIÓN
  ============================================================
  */

  const [pantalla, setPantalla] = useState(() => {
    const parametros =
      new URLSearchParams(window.location.search)

    return parametros.get('control') === '1'
      ? 'control-movil-cargando'
      : 'inicio'
  })

  const [conexion, setConexion] = useState(
    'Comprobando conexión...'
  )

  const [detalle, setDetalle] = useState('')

  /*
  ============================================================
  LOGIN
  ============================================================
  */

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensajeLogin, setMensajeLogin] = useState('')
  const [cargandoLogin, setCargandoLogin] = useState(false)

  /*
  ============================================================
  SORTEOS
  ============================================================
  */

  const [sorteos, setSorteos] = useState([])
  const [cargandoSorteos, setCargandoSorteos] =
    useState(false)

  const [errorSorteos, setErrorSorteos] = useState('')

  const [sorteoSeleccionado, setSorteoSeleccionado] =
    useState(null)

  /*
  ============================================================
  BOMBOS
  ============================================================
  */

  const [bombos, setBombos] = useState([])
  const [cargandoBombos, setCargandoBombos] =
    useState(false)

  const [errorBombos, setErrorBombos] = useState('')

  const [
    creandoBombosAutomaticos,
    setCreandoBombosAutomaticos,
  ] = useState(false)

  const [
    mostrarCreadorBombos,
    setMostrarCreadorBombos,
  ] = useState(false)

  const [
    cantidadBombosObjetivo,
    setCantidadBombosObjetivo,
  ] = useState(4)

const [mensajeBombos, setMensajeBombos] = useState('')
  const [nuevoCodigoBombo, setNuevoCodigoBombo] = useState('')
  const [nuevoNombreBombo, setNuevoNombreBombo] = useState('')
  const [nuevoOrdenBombo, setNuevoOrdenBombo] = useState(1)
  const [nuevaDescripcionBombo, setNuevaDescripcionBombo] = useState('')

  const [guardandoBombo, setGuardandoBombo] = useState(false)
  const [mensajeNuevoBombo, setMensajeNuevoBombo] = useState('')

  /*
  ============================================================
  EDICIÓN / ELIMINACIÓN DE BOMBOS
  ============================================================
  */

  const [bomboEditando, setBomboEditando] = useState(null)
  const [codigoEditarBombo, setCodigoEditarBombo] = useState('')
  const [nombreEditarBombo, setNombreEditarBombo] = useState('')
  const [ordenEditarBombo, setOrdenEditarBombo] = useState(1)
  const [descripcionEditarBombo, setDescripcionEditarBombo] =
    useState('')
  const [guardandoEdicionBombo, setGuardandoEdicionBombo] =
    useState(false)
  const [mensajeEditarBombo, setMensajeEditarBombo] = useState('')

  const [bomboPendienteEliminar, setBomboPendienteEliminar] =
    useState(null)
  const [eliminandoBombo, setEliminandoBombo] = useState(false)

/*
============================================================
JUGADORES
============================================================
*/

const [participantes, setParticipantes] = useState([])
const [jugadores, setJugadores] = useState([])
const [cargandoJugadores, setCargandoJugadores] =
  useState(false)

const [errorJugadores, setErrorJugadores] = useState('')

const [codigoNuevoJugador, setCodigoNuevoJugador] =
  useState('')

const [nombreNuevoJugador, setNombreNuevoJugador] =
  useState('')

const [apellidosNuevoJugador, setApellidosNuevoJugador] =
  useState('')

const [aliasNuevoJugador, setAliasNuevoJugador] =
  useState('')

const [bomboNuevoJugador, setBomboNuevoJugador] =
  useState('')

const [guardandoJugador, setGuardandoJugador] =
  useState(false)

const [mensajeNuevoJugador, setMensajeNuevoJugador] =
  useState('')

const [fotoNuevoJugador, setFotoNuevoJugador] =
  useState(null)

const [previewFotoJugador, setPreviewFotoJugador] =
  useState('')

/*
============================================================
CATÁLOGO GENERAL DE JUGADORES
============================================================
*/

const [catalogoJugadores, setCatalogoJugadores] =
  useState([])

const [cargandoCatalogoJugadores, setCargandoCatalogoJugadores] =
  useState(false)

const [errorCatalogoJugadores, setErrorCatalogoJugadores] =
  useState('')

const [busquedaCatalogoJugadores, setBusquedaCatalogoJugadores] =
  useState('')

const [bomboCatalogoPorJugador, setBomboCatalogoPorJugador] =
  useState({})

const [jugadorCatalogoAñadiendo, setJugadorCatalogoAñadiendo] =
  useState(null)

const [mensajeCatalogoJugadores, setMensajeCatalogoJugadores] =
  useState('')

/*
============================================================
GESTIÓN DEL CATÁLOGO GENERAL
============================================================
*/

const [catalogoGestionCargando, setCatalogoGestionCargando] =
  useState(false)
const [catalogoGestionError, setCatalogoGestionError] =
  useState('')
const [catalogoGestionMensaje, setCatalogoGestionMensaje] =
  useState('')
const [catalogoGestionBusqueda, setCatalogoGestionBusqueda] =
  useState('')

const [catalogoNuevoCodigo, setCatalogoNuevoCodigo] =
  useState('')
const [catalogoNuevoNombre, setCatalogoNuevoNombre] =
  useState('')
const [catalogoNuevoApellidos, setCatalogoNuevoApellidos] =
  useState('')
const [catalogoNuevoAlias, setCatalogoNuevoAlias] =
  useState('')
const [catalogoNuevaFoto, setCatalogoNuevaFoto] =
  useState(null)
const [catalogoNuevaFotoPreview, setCatalogoNuevaFotoPreview] =
  useState('')
const [catalogoGuardandoNuevo, setCatalogoGuardandoNuevo] =
  useState(false)

const [
  jugadorCatalogoPendienteEliminar,
  setJugadorCatalogoPendienteEliminar,
] = useState(null)
const [eliminandoJugadorCatalogo, setEliminandoJugadorCatalogo] =
  useState(false)

/*
============================================================
ELIMINACIÓN DE SORTEOS
============================================================
*/

const [sorteoPendienteEliminar, setSorteoPendienteEliminar] =
  useState(null)
const [eliminandoSorteo, setEliminandoSorteo] =
  useState(false)
const [mensajeEliminarSorteo, setMensajeEliminarSorteo] =
  useState('')

/*
============================================================
EDICIÓN DE JUGADOR
============================================================
*/

const [jugadorEditando, setJugadorEditando] =
  useState(null)

const [nombreEditarJugador, setNombreEditarJugador] =
  useState('')

const [apellidosEditarJugador, setApellidosEditarJugador] =
  useState('')

const [aliasEditarJugador, setAliasEditarJugador] =
  useState('')

const [bomboEditarJugador, setBomboEditarJugador] =
  useState('')

const [fotoEditarJugador, setFotoEditarJugador] =
  useState(null)

const [previewFotoEditarJugador, setPreviewFotoEditarJugador] =
  useState('')

const [guardandoEdicionJugador, setGuardandoEdicionJugador] =
  useState(false)

const [mensajeEditarJugador, setMensajeEditarJugador] =
  useState('')


/*
============================================================
MÚSICA DE PRESENTACIÓN
============================================================
*/

function obtenerConfigMusicaPresentacion(origen = null) {
  const datos =
    origen ??
    sorteoSeleccionado ??
    {}

  return {
    esperaPath:
      datos.musica_espera_path ??
      null,

    esperaNombre:
      datos.musica_espera_nombre ??
      null,

    esperaVolumen:
      limitarNumero(
        datos.musica_espera_volumen,
        0,
        100,
        65
      ),

    sorteoPath:
      datos.musica_sorteo_path ??
      null,

    sorteoNombre:
      datos.musica_sorteo_nombre ??
      null,

    sorteoVolumen:
      limitarNumero(
        datos.musica_sorteo_volumen,
        0,
        100,
        55
      ),

    jugadorPath:
      datos.efecto_jugador_path ??
      null,

    jugadorNombre:
      datos.efecto_jugador_nombre ??
      null,

    jugadorActivo:
      datos.efecto_jugador_activo !== false,

    jugadorVolumen:
      limitarNumero(
        datos.efecto_jugador_volumen,
        0,
        100,
        88
      ),

    equipoPath:
      datos.efecto_equipo_path ??
      null,

    equipoNombre:
      datos.efecto_equipo_nombre ??
      null,

    equipoActivo:
      datos.efecto_equipo_activo !== false,

    equipoVolumen:
      limitarNumero(
        datos.efecto_equipo_volumen,
        0,
        100,
        96
      ),

    resumenPath:
      datos.efecto_resumen_path ??
      null,

    resumenNombre:
      datos.efecto_resumen_nombre ??
      null,

    resumenActivo:
      datos.efecto_resumen_activo !== false,

    resumenVolumen:
      limitarNumero(
        datos.efecto_resumen_volumen,
        0,
        100,
        92
      ),
  }
}


function abrirMusicaPresentacion() {
  if (!sorteoSeleccionado) {
    return
  }

  setMusicaPresentacion(
    obtenerConfigMusicaPresentacion(
      sorteoSeleccionado
    )
  )

  setMensajeMusicaPresentacion('')
  setPantalla('musica-presentacion')
}


function actualizarSorteoLocal(cambios) {
  if (!sorteoSeleccionado) {
    return
  }

  const actualizado = {
    ...sorteoSeleccionado,
    ...cambios,
  }

  setSorteoSeleccionado(
    actualizado
  )

  setSorteos(
    (actuales) =>
      actuales.map(
        (sorteo) =>
          sorteo.id === actualizado.id
            ? {
                ...sorteo,
                ...cambios,
              }
            : sorteo
      )
  )
}


async function subirMusicaPresentacion(
  evento,
  tipo
) {
  const archivo =
    evento.target.files?.[0]

  /*
  Permitimos volver a elegir el mismo fichero después.
  */
  evento.target.value = ''

  if (
    !archivo ||
    !sorteoSeleccionado
  ) {
    return
  }

  const extensionCorrecta =
    String(archivo.name)
      .toLowerCase()
      .endsWith('.mp3')

  const mimeCorrecto =
    ['audio/mpeg', 'audio/mp3', 'audio/x-mpeg']
      .includes(
        String(archivo.type ?? '')
          .toLowerCase()
      )

  if (
    !extensionCorrecta &&
    !mimeCorrecto
  ) {
    setMensajeMusicaPresentacion(
      'Selecciona un archivo MP3.'
    )
    return
  }

  const limiteBytes =
    25 * 1024 * 1024

  if (
    Number(archivo.size) >
    limiteBytes
  ) {
    setMensajeMusicaPresentacion(
      'El MP3 supera 25 MB. Conviene usar una versión más ligera para que la TV pueda precargarla con rapidez.'
    )
    return
  }

  const esEspera =
    tipo === 'espera'

  const pathAnterior =
    esEspera
      ? musicaPresentacion.esperaPath
      : musicaPresentacion.sorteoPath

  const nombreLimpio =
    limpiarNombreArchivoMusica(
      archivo.name
    )

  const nuevoPath =
    `${sorteoSeleccionado.id}/${tipo}-${Date.now()}-${nombreLimpio}`

  setSubiendoMusicaPresentacion(
    tipo
  )

  setMensajeMusicaPresentacion(
    `Subiendo ${
      esEspera
        ? 'música de espera'
        : 'música del sorteo'
    }...`
  )

  try {
    const {
      error: errorSubida,
    } = await supabase
      .storage
      .from('musica-sorteos')
      .upload(
        nuevoPath,
        archivo,
        {
          cacheControl: '3600',
          contentType:
            archivo.type ||
            'audio/mpeg',
          upsert: false,
        }
      )

    if (errorSubida) {
      throw errorSubida
    }

    const cambios =
      esEspera
        ? {
            musica_espera_path:
              nuevoPath,
            musica_espera_nombre:
              archivo.name,
          }
        : {
            musica_sorteo_path:
              nuevoPath,
            musica_sorteo_nombre:
              archivo.name,
          }

    const {
      error: errorGuardado,
    } = await supabase
      .from('sorteos')
      .update(cambios)
      .eq(
        'id',
        sorteoSeleccionado.id
      )

    if (errorGuardado) {
      await supabase
        .storage
        .from('musica-sorteos')
        .remove([nuevoPath])

      throw errorGuardado
    }

    actualizarSorteoLocal(
      cambios
    )

    setMusicaPresentacion(
      (actual) => ({
        ...actual,

        ...(esEspera
          ? {
              esperaPath:
                nuevoPath,
              esperaNombre:
                archivo.name,
            }
          : {
              sorteoPath:
                nuevoPath,
              sorteoNombre:
                archivo.name,
            }),
      })
    )

    /*
    Borramos la pista anterior solo cuando la nueva ya está
    correctamente vinculada al sorteo.
    */
    if (
      pathAnterior &&
      pathAnterior !== nuevoPath
    ) {
      await supabase
        .storage
        .from('musica-sorteos')
        .remove([
          pathAnterior,
        ])
    }

    setMensajeMusicaPresentacion(
      `✓ ${
        esEspera
          ? 'Música de espera'
          : 'Música del sorteo'
      } actualizada.`
    )
  } catch (error) {
    console.error(
      'Error subiendo música:',
      error
    )

    setMensajeMusicaPresentacion(
      `Error: ${error.message}`
    )
  } finally {
    setSubiendoMusicaPresentacion(
      ''
    )
  }
}


async function eliminarMusicaPresentacion(
  tipo
) {
  if (!sorteoSeleccionado) {
    return
  }

  const esEspera =
    tipo === 'espera'

  const pathActual =
    esEspera
      ? musicaPresentacion.esperaPath
      : musicaPresentacion.sorteoPath

  const cambios =
    esEspera
      ? {
          musica_espera_path: null,
          musica_espera_nombre: null,
        }
      : {
          musica_sorteo_path: null,
          musica_sorteo_nombre: null,
        }

  setSubiendoMusicaPresentacion(
    tipo
  )

  setMensajeMusicaPresentacion(
    'Eliminando música...'
  )

  try {
    const {
      error,
    } = await supabase
      .from('sorteos')
      .update(cambios)
      .eq(
        'id',
        sorteoSeleccionado.id
      )

    if (error) {
      throw error
    }

    if (pathActual) {
      await supabase
        .storage
        .from('musica-sorteos')
        .remove([
          pathActual,
        ])
    }

    actualizarSorteoLocal(
      cambios
    )

    setMusicaPresentacion(
      (actual) => ({
        ...actual,

        ...(esEspera
          ? {
              esperaPath: null,
              esperaNombre: null,
            }
          : {
              sorteoPath: null,
              sorteoNombre: null,
            }),
      })
    )

    setMensajeMusicaPresentacion(
      '✓ Música eliminada.'
    )
  } catch (error) {
    console.error(
      'Error eliminando música:',
      error
    )

    setMensajeMusicaPresentacion(
      `Error: ${error.message}`
    )
  } finally {
    setSubiendoMusicaPresentacion(
      ''
    )
  }
}



function configEfectoPresentacion(tipo) {
  const configuraciones = {
    jugador: {
      etiqueta: 'efecto de jugador',
      statePath: 'jugadorPath',
      stateNombre: 'jugadorNombre',
      stateVolumen: 'jugadorVolumen',
      dbPath: 'efecto_jugador_path',
      dbNombre: 'efecto_jugador_nombre',
      dbVolumen: 'efecto_jugador_volumen',
      volumenDefecto: 88,
    },

    equipo: {
      etiqueta: 'efecto de equipo completo',
      statePath: 'equipoPath',
      stateNombre: 'equipoNombre',
      stateVolumen: 'equipoVolumen',
      dbPath: 'efecto_equipo_path',
      dbNombre: 'efecto_equipo_nombre',
      dbVolumen: 'efecto_equipo_volumen',
      volumenDefecto: 96,
    },

    resumen: {
      etiqueta: 'efecto de resumen final',
      statePath: 'resumenPath',
      stateNombre: 'resumenNombre',
      stateVolumen: 'resumenVolumen',
      dbPath: 'efecto_resumen_path',
      dbNombre: 'efecto_resumen_nombre',
      dbVolumen: 'efecto_resumen_volumen',
      volumenDefecto: 92,
    },
  }

  return configuraciones[tipo] ?? null
}


async function subirEfectoPresentacion(
  evento,
  tipo
) {
  const archivo =
    evento.target.files?.[0]

  evento.target.value = ''

  if (
    !archivo ||
    !sorteoSeleccionado
  ) {
    return
  }

  const config =
    configEfectoPresentacion(tipo)

  if (!config) {
    return
  }

  const nombreMinusculas =
    String(archivo.name ?? '')
      .toLowerCase()

  const extensionCorrecta =
    nombreMinusculas.endsWith('.mp3') ||
    nombreMinusculas.endsWith('.wav')

  const mime =
    String(archivo.type ?? '')
      .toLowerCase()

  const mimeCorrecto = [
    'audio/mpeg',
    'audio/mp3',
    'audio/x-mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/wave',
    'audio/vnd.wave',
  ].includes(mime)

  if (
    !extensionCorrecta &&
    !mimeCorrecto
  ) {
    setMensajeMusicaPresentacion(
      'Para los efectos selecciona un archivo MP3 o WAV.'
    )
    return
  }

  const limiteBytes =
    5 * 1024 * 1024

  if (
    Number(archivo.size) >
    limiteBytes
  ) {
    setMensajeMusicaPresentacion(
      'El efecto supera 5 MB. Para un sonido corto conviene usar un archivo más pequeño.'
    )
    return
  }

  const pathAnterior =
    musicaPresentacion[
      config.statePath
    ]

  const nombreLimpio =
    limpiarNombreArchivoMusica(
      archivo.name
    )

  const nuevoPath =
    `${sorteoSeleccionado.id}/efecto-${tipo}-${Date.now()}-${nombreLimpio}`

  setSubiendoMusicaPresentacion(
    `efecto-${tipo}`
  )

  setMensajeMusicaPresentacion(
    `Subiendo ${config.etiqueta}...`
  )

  try {
    const {
      error: errorSubida,
    } = await supabase
      .storage
      .from('musica-sorteos')
      .upload(
        nuevoPath,
        archivo,
        {
          cacheControl: '3600',
          contentType:
            archivo.type ||
            (
              nombreMinusculas.endsWith('.wav')
                ? 'audio/wav'
                : 'audio/mpeg'
            ),
          upsert: false,
        }
      )

    if (errorSubida) {
      throw errorSubida
    }

    const cambios = {
      [config.dbPath]:
        nuevoPath,
      [config.dbNombre]:
        archivo.name,
    }

    const {
      error: errorGuardado,
    } = await supabase
      .from('sorteos')
      .update(cambios)
      .eq(
        'id',
        sorteoSeleccionado.id
      )

    if (errorGuardado) {
      await supabase
        .storage
        .from('musica-sorteos')
        .remove([nuevoPath])

      throw errorGuardado
    }

    actualizarSorteoLocal(
      cambios
    )

    setMusicaPresentacion(
      (actual) => ({
        ...actual,
        [config.statePath]:
          nuevoPath,
        [config.stateNombre]:
          archivo.name,
      })
    )

    if (
      pathAnterior &&
      pathAnterior !== nuevoPath
    ) {
      await supabase
        .storage
        .from('musica-sorteos')
        .remove([pathAnterior])
    }

    setMensajeMusicaPresentacion(
      `✓ ${config.etiqueta} actualizado.`
    )
  } catch (error) {
    console.error(
      'Error subiendo efecto:',
      error
    )

    setMensajeMusicaPresentacion(
      `Error: ${error.message}`
    )
  } finally {
    setSubiendoMusicaPresentacion(
      ''
    )
  }
}


async function restaurarEfectoPredeterminado(
  tipo
) {
  if (!sorteoSeleccionado) {
    return
  }

  const config =
    configEfectoPresentacion(tipo)

  if (!config) {
    return
  }

  const pathActual =
    musicaPresentacion[
      config.statePath
    ]

  setSubiendoMusicaPresentacion(
    `efecto-${tipo}`
  )

  setMensajeMusicaPresentacion(
    'Restaurando efecto predeterminado...'
  )

  try {
    const cambios = {
      [config.dbPath]: null,
      [config.dbNombre]: null,
    }

    const {
      error,
    } = await supabase
      .from('sorteos')
      .update(cambios)
      .eq(
        'id',
        sorteoSeleccionado.id
      )

    if (error) {
      throw error
    }

    if (pathActual) {
      await supabase
        .storage
        .from('musica-sorteos')
        .remove([pathActual])
    }

    actualizarSorteoLocal(
      cambios
    )

    setMusicaPresentacion(
      (actual) => ({
        ...actual,
        [config.statePath]: null,
        [config.stateNombre]: null,
      })
    )

    setMensajeMusicaPresentacion(
      '✓ Efecto predeterminado restaurado.'
    )
  } catch (error) {
    console.error(
      'Error restaurando efecto:',
      error
    )

    setMensajeMusicaPresentacion(
      `Error: ${error.message}`
    )
  } finally {
    setSubiendoMusicaPresentacion(
      ''
    )
  }
}


async function probarEfectoPredeterminado(
  tipo
) {
  try {
    const ConstructorAudio =
      window.AudioContext ||
      window.webkitAudioContext

    if (!ConstructorAudio) {
      return
    }

    if (!audioContextPublicoRef.current) {
      audioContextPublicoRef.current =
        new ConstructorAudio()
    }

    await audioContextPublicoRef.current.resume()

    const config =
      configEfectoPresentacion(tipo)

    const volumen =
      config
        ? limitarNumero(
            musicaPresentacion[
              config.stateVolumen
            ],
            0,
            100,
            config.volumenDefecto
          ) / 100
        : 1

    reproducirEfectoSintetico(
      tipo,
      volumen,
      true
    )
  } catch (error) {
    console.warn(
      'No se pudo probar el efecto:',
      error
    )
  }
}


async function guardarVolumenesMusicaPresentacion() {
  if (!sorteoSeleccionado) {
    return
  }

  const cambios = {
    musica_espera_volumen:
      limitarNumero(
        musicaPresentacion.esperaVolumen,
        0,
        100,
        65
      ),

    musica_sorteo_volumen:
      limitarNumero(
        musicaPresentacion.sorteoVolumen,
        0,
        100,
        55
      ),

    efecto_jugador_volumen:
      limitarNumero(
        musicaPresentacion.jugadorVolumen,
        0,
        100,
        88
      ),

    efecto_jugador_activo:
      Boolean(
        musicaPresentacion.jugadorActivo
      ),

    efecto_equipo_volumen:
      limitarNumero(
        musicaPresentacion.equipoVolumen,
        0,
        100,
        96
      ),

    efecto_equipo_activo:
      Boolean(
        musicaPresentacion.equipoActivo
      ),

    efecto_resumen_volumen:
      limitarNumero(
        musicaPresentacion.resumenVolumen,
        0,
        100,
        92
      ),

    efecto_resumen_activo:
      Boolean(
        musicaPresentacion.resumenActivo
      ),
  }

  setGuardandoMusicaPresentacion(
    true
  )

  setMensajeMusicaPresentacion(
    'Guardando música y sonidos...'
  )

  try {
    const {
      error,
    } = await supabase
      .from('sorteos')
      .update(cambios)
      .eq(
        'id',
        sorteoSeleccionado.id
      )

    if (error) {
      throw error
    }

    actualizarSorteoLocal(
      cambios
    )

    setMusicaPresentacion(
      (actual) => ({
        ...actual,
        esperaVolumen:
          cambios.musica_espera_volumen,
        sorteoVolumen:
          cambios.musica_sorteo_volumen,
        jugadorVolumen:
          cambios.efecto_jugador_volumen,
        jugadorActivo:
          cambios.efecto_jugador_activo,
        equipoVolumen:
          cambios.efecto_equipo_volumen,
        equipoActivo:
          cambios.efecto_equipo_activo,
        resumenVolumen:
          cambios.efecto_resumen_volumen,
        resumenActivo:
          cambios.efecto_resumen_activo,
      })
    )

    setMensajeMusicaPresentacion(
      '✓ Configuración de música y sonidos guardada.'
    )
  } catch (error) {
    console.error(
      'Error guardando volúmenes:',
      error
    )

    setMensajeMusicaPresentacion(
      `Error: ${error.message}`
    )
  } finally {
    setGuardandoMusicaPresentacion(
      false
    )
  }
}


/*
============================================================
EMPAREJAMIENTOS
============================================================
*/

const [reglasEmparejamiento, setReglasEmparejamiento] =
  useState([])

const [cargandoEmparejamientos, setCargandoEmparejamientos] =
  useState(false)

const [errorEmparejamientos, setErrorEmparejamientos] =
  useState('')

const [reglaEditandoId, setReglaEditandoId] =
  useState(null)


const [bombosRegla, setBombosRegla] =
  useState([])

const [nombreRegla, setNombreRegla] =
  useState('')

const [ordenRegla, setOrdenRegla] =
  useState(1)

const [activoRegla, setActivoRegla] =
  useState(true)

const [guardandoRegla, setGuardandoRegla] =
  useState(false)

const [mensajeReglas, setMensajeReglas] =
  useState('')

/*
============================================================
EQUIPOS FIJOS
============================================================
*/

const [equiposFijos, setEquiposFijos] = useState([])
const [miembrosEquiposFijos, setMiembrosEquiposFijos] = useState([])
const [reglasEquiposFijos, setReglasEquiposFijos] = useState([])
const [cargandoEquiposFijos, setCargandoEquiposFijos] = useState(false)
const [errorEquiposFijos, setErrorEquiposFijos] = useState('')
const [mensajeEquiposFijos, setMensajeEquiposFijos] = useState('')

const [reglaEquipoFijoId, setReglaEquipoFijoId] = useState('')
const [participantesEquipoFijo, setParticipantesEquipoFijo] = useState([])
const [busquedasEquipoFijo, setBusquedasEquipoFijo] = useState([])


const [guardandoEquipoFijo, setGuardandoEquipoFijo] = useState(false)
const [equipoFijoPendienteEliminar, setEquipoFijoPendienteEliminar] =
  useState(null)
const [eliminandoEquipoFijo, setEliminandoEquipoFijo] = useState(false)


/*
============================================================
GRUPOS
============================================================
*/

const [grupos, setGrupos] = useState([])
const [cargandoGrupos, setCargandoGrupos] = useState(false)
const [errorGrupos, setErrorGrupos] = useState('')

const [grupoEditandoId, setGrupoEditandoId] = useState(null)
const [codigoGrupo, setCodigoGrupo] = useState('')
const [nombreGrupo, setNombreGrupo] = useState('')
const [ordenGrupo, setOrdenGrupo] = useState(1)
const [descripcionGrupo, setDescripcionGrupo] = useState('')
const [activoGrupo, setActivoGrupo] = useState(true)

const [guardandoGrupo, setGuardandoGrupo] = useState(false)
const [creandoGruposAutomaticos, setCreandoGruposAutomaticos] =
  useState(false)
const [mensajeGrupos, setMensajeGrupos] = useState('')

const [
  distribucionGrupos,
  setDistribucionGrupos,
] = useState('equilibrada')

const [
  guardandoDistribucionGrupos,
  setGuardandoDistribucionGrupos,
] = useState(false)

/*
============================================================
PREPARAR / VALIDAR SORTEO
============================================================
*/

const [validacionesSorteo, setValidacionesSorteo] = useState([])
const [resumenPreparacion, setResumenPreparacion] = useState({
  bombos: 0,
  jugadores: 0,
  reglas: 0,
  grupos: 0,
  equiposFijos: 0,
})

const [cargandoValidacion, setCargandoValidacion] = useState(false)
const [errorValidacion, setErrorValidacion] = useState('')
const [generandoSorteo, setGenerandoSorteo] = useState(false)
const [mensajeGeneracion, setMensajeGeneracion] = useState('')
const [ejecucionGenerada, setEjecucionGenerada] = useState(null)
const [mostrarConfirmacionGenerar, setMostrarConfirmacionGenerar] =
  useState(false)

/*
============================================================
TIEMPOS DE PRESENTACIÓN
============================================================
*/

const [
  tiemposPresentacion,
  setTiemposPresentacion,
] = useState({
  retrasoPrimerJugadorMs:
    CONFIG_PRESENTACION.retrasoPrimerJugadorMs,
  intervaloRevelacionMs:
    CONFIG_PRESENTACION.intervaloRevelacionMs,
  pausaEntreEquiposRepeticionMs:
    CONFIG_PRESENTACION.pausaEntreEquiposRepeticionMs,
  pausaAntesResumenRepeticionMs:
    CONFIG_PRESENTACION.pausaAntesResumenRepeticionMs,

  estiloEntrada:
    'destello',
})

const [
  guardandoTiemposPresentacion,
  setGuardandoTiemposPresentacion,
] = useState(false)

const [
  mensajeTiemposPresentacion,
  setMensajeTiemposPresentacion,
] = useState('')

/*
============================================================
MÚSICA DE PRESENTACIÓN
============================================================
*/

const [
  musicaPresentacion,
  setMusicaPresentacion,
] = useState({
  esperaPath: null,
  esperaNombre: null,
  esperaVolumen: 65,
  sorteoPath: null,
  sorteoNombre: null,
  sorteoVolumen: 55,

  jugadorPath: null,
  jugadorNombre: null,
  jugadorActivo: true,
  jugadorVolumen: 88,

  equipoPath: null,
  equipoNombre: null,
  equipoActivo: true,
  equipoVolumen: 96,

  resumenPath: null,
  resumenNombre: null,
  resumenActivo: true,
  resumenVolumen: 92,
})

const [
  subiendoMusicaPresentacion,
  setSubiendoMusicaPresentacion,
] = useState('')

const [
  guardandoMusicaPresentacion,
  setGuardandoMusicaPresentacion,
] = useState(false)

const [
  mensajeMusicaPresentacion,
  setMensajeMusicaPresentacion,
] = useState('')

/*
============================================================
EJECUCIÓN OFICIAL
============================================================
*/

const [ejecucionOficialSorteo, setEjecucionOficialSorteo] =
  useState(null)

const [confirmacionOficialidad, setConfirmacionOficialidad] =
  useState(null)

const [accionOficialidad, setAccionOficialidad] =
  useState(false)

const [mensajeOficialidad, setMensajeOficialidad] =
  useState('')

/*
============================================================
RESULTADO GENERADO
============================================================
*/

const [equiposResultado, setEquiposResultado] = useState([])
const [ejecucionResultado, setEjecucionResultado] = useState(null)
const [fotosResultado, setFotosResultado] = useState({})
const [cargandoResultado, setCargandoResultado] = useState(false)
const [errorResultado, setErrorResultado] = useState('')

const [
  auditoriaResultado,
  setAuditoriaResultado,
] = useState(null)

/*
============================================================
CONTROL DE PRESENTACIÓN
============================================================
*/

const [estadoPresentacion, setEstadoPresentacion] = useState(null)
const [equiposReveladosControl, setEquiposReveladosControl] = useState([])
const [fotosControlPresentacion, setFotosControlPresentacion] = useState({})
const [cargandoControlPresentacion, setCargandoControlPresentacion] =
  useState(false)
const [errorControlPresentacion, setErrorControlPresentacion] =
  useState('')
const [accionPresentacion, setAccionPresentacion] = useState(false)
const [mensajePresentacion, setMensajePresentacion] = useState('')
const [resumenFinalEnviado, setResumenFinalEnviado] = useState(false)
const [repeticionEnCursoControl, setRepeticionEnCursoControl] =
  useState(false)
const [
  mostrarConfirmacionInicioPresentacion,
  setMostrarConfirmacionInicioPresentacion,
] = useState(false)

/*
============================================================
CONTROL MÓVIL
============================================================
*/

const [modoControlMovil] = useState(() => {
  const parametros =
    new URLSearchParams(window.location.search)

  return parametros.get('control') === '1'
})

const [sorteoControlMovilId] = useState(() => {
  const parametros =
    new URLSearchParams(window.location.search)

  return parametros.get('sorteo') ?? ''
})

const [ejecucionControlMovilId] = useState(() => {
  const parametros =
    new URLSearchParams(window.location.search)

  return parametros.get('ejecucion') ?? ''
})

const [cargandoControlMovil, setCargandoControlMovil] =
  useState(false)

const [errorControlMovil, setErrorControlMovil] =
  useState('')

const [enlaceControlMovilCopiado, setEnlaceControlMovilCopiado] =
  useState(false)

/*
============================================================
PANTALLA PÚBLICA / TV
============================================================
*/

const [modoPublico] = useState(() => {
  const parametros =
    new URLSearchParams(window.location.search)

  return parametros.get('publico') === '1'
})

const [sorteoPublicoId] = useState(() => {
  const parametros =
    new URLSearchParams(window.location.search)

  return parametros.get('sorteo') ?? ''
})

const [ejecucionPublicaId] = useState(() => {
  const parametros =
    new URLSearchParams(window.location.search)

  return parametros.get('ejecucion') ?? ''
})

const [presentacionPublica, setPresentacionPublica] =
  useState(null)

const [equipoDestacadoPublico, setEquipoDestacadoPublico] =
  useState(null)

const [cargandoPublico, setCargandoPublico] =
  useState(false)

const [errorPublico, setErrorPublico] =
  useState('')

const [animacionPublica, setAnimacionPublica] =
  useState(0)

const [mostrarResumenFinalPublico, setMostrarResumenFinalPublico] =
  useState(false)

const [miembrosSecuenciaPublica, setMiembrosSecuenciaPublica] =
  useState([])

const [miembrosVisiblesPublico, setMiembrosVisiblesPublico] =
  useState(0)

const [equipoCompletoPublico, setEquipoCompletoPublico] =
  useState(false)

const [sonidoPublicoActivo, setSonidoPublicoActivo] =
  useState(false)

const [
  musicaPublica,
  setMusicaPublica,
] = useState(null)

const [
  estadoPrecargaMusicaPublica,
  setEstadoPrecargaMusicaPublica,
] = useState({
  espera: 'pendiente',
  sorteo: 'pendiente',
})

const [
  detallePrecargaMusicaPublica,
  setDetallePrecargaMusicaPublica,
] = useState({
  espera: '',
  sorteo: '',
})

const [bloqueoSecuenciaPresentacion, setBloqueoSecuenciaPresentacion] =
  useState(false)

const [reproduciendoRepeticionPublica, setReproduciendoRepeticionPublica] =
  useState(false)

const [
  resumenAutomaticoRepeticionPublica,
  setResumenAutomaticoRepeticionPublica,
] = useState(false)

const [
  equiposAvanceRepeticionPublica,
  setEquiposAvanceRepeticionPublica,
] = useState([])

const ultimoOrdenPublicoRef = useRef(0)
const primeraCargaPublicaRef = useRef(true)
const repeticionVersionPublicaRef = useRef(0)

/*
La misma ventana pública puede reutilizarse entre varias ejecuciones
del mismo sorteo. Guardamos qué ejecución está mostrando para evitar
arrastrar visualmente el último equipo de una ejecución anterior.
*/
const ejecucionPublicaRef = useRef(null)
const audioContextPublicoRef = useRef(null)
const sonidoPublicoActivoRef = useRef(false)

/*
La presentación pública se actualiza mediante un intervalo creado
cuando abre la TV. Ese intervalo puede conservar un cierre de React
anterior a la carga de la configuración de sonido.

Guardamos por ello la configuración audiovisual también en una ref:
los efectos siempre consultarán el valor MÁS RECIENTE recibido de
Supabase, independientemente del render desde el que se haya iniciado
la revelación.
*/
const musicaPublicaRef = useRef(null)

const audioEsperaPublicoRef = useRef(null)
const audioSorteoPublicoRef = useRef(null)
const blobUrlEsperaPublicoRef = useRef(null)
const blobUrlSorteoPublicoRef = useRef(null)
const pistaMusicaActivaPublicoRef = useRef(null)
const temporizadorFadeMusicaPublicoRef = useRef(null)
const temporizadorDuckingMusicaPublicoRef = useRef(null)

const audioEfectosPublicosRef = useRef({
  jugador: null,
  equipo: null,
  resumen: null,
})

const blobUrlsEfectosPublicosRef = useRef({
  jugador: null,
  equipo: null,
  resumen: null,
})

const resumenSonidoPublicoRef = useRef(false)

const temporizadoresPublicosRef = useRef([])
const temporizadoresRepeticionPublicaRef = useRef([])
const temporizadorBloqueoAdminRef = useRef(null)
const temporizadorRepeticionAdminRef = useRef(null)

  /*
  ============================================================
  NUEVO SORTEO
  ============================================================
  */

  const [nuevoNombre, setNuevoNombre] = useState('')

  const [nuevaDescripcion, setNuevaDescripcion] =
    useState('')

  const [nuevaFecha, setNuevaFecha] = useState('')

  const [nuevoFormatoSorteo, setNuevoFormatoSorteo] =
    useState('grupos')

  const [nuevosGrupos, setNuevosGrupos] =
    useState(2)

  const [nuevosJugadoresPorEquipo, setNuevosJugadoresPorEquipo] =
    useState(2)

  const [
    nuevaDistribucionGrupos,
    setNuevaDistribucionGrupos,
  ] = useState('equilibrada')

  const [guardandoSorteo, setGuardandoSorteo] =
    useState(false)

  const [
    mensajeNuevoSorteo,
    setMensajeNuevoSorteo,
  ] = useState('')

  /*
  ============================================================
  COMPROBAR CONEXIÓN PÚBLICA
  ============================================================
  */

  useEffect(() => {
    async function comprobarConexion() {
      const { data, error } = await supabase.rpc(
        'obtener_presentacion_publica',
        {
          p_sorteo_id:
            '4844145b-b7e1-4db6-8c26-dcd75e0d80de',
        }
      )

      if (error) {
        console.error(error)

        setConexion('Error de conexión')
        setDetalle(error.message)

        return
      }

      setConexion(
        'Conexión con Supabase correcta'
      )

      if (data) {
        setDetalle(
          `${data.sorteo ?? 'Sorteo'} · Estado: ${data.estado}`
        )
      }
    }

    comprobarConexion()
  }, [])

  /*
  ============================================================
  CARGAR SORTEOS AL ENTRAR EN ADMINISTRACIÓN
  ============================================================
  */

  useEffect(() => {
    if (pantalla === 'admin') {
      cargarSorteos()
    }
  }, [pantalla])

  /*
  ============================================================
  ACTUALIZACIÓN AUTOMÁTICA DE LA PANTALLA PÚBLICA
  ============================================================
  */

  useEffect(() => {
    if (
      !modoPublico ||
      !sorteoPublicoId ||
      !ejecucionPublicaId
    ) {
      return undefined
    }

    cargarPresentacionPublica()

    /*
    Consultamos Supabase cada segundo.
    Es suficientemente rápido para una presentación en directo
    y evita que la TV necesite recargarse manualmente.
    */
    const intervalo = window.setInterval(
      cargarPresentacionPublica,
      1000
    )

    return () => {
      window.clearInterval(intervalo)
    }
  }, [
    modoPublico,
    sorteoPublicoId,
    ejecucionPublicaId,
  ])


  /*
  ============================================================
  PRECARGA DE MÚSICA EN LA TV
  ============================================================

  Las dos pistas se descargan completas al abrir la pantalla pública.
  No se espera al momento de comenzar el sorteo.
  */
  useEffect(() => {
    if (
      !modoPublico ||
      !sorteoPublicoId
    ) {
      return undefined
    }

    cargarConfiguracionMusicaPublica()

    return () => {
      detenerMusicaPublica()
      limpiarPistaMusicaPublica(
        'espera'
      )
      limpiarPistaMusicaPublica(
        'sorteo'
      )
    }
  }, [
    modoPublico,
    sorteoPublicoId,
  ])


  /*
  Al cambiar el estado remoto de GENERADA a EN_CURSO,
  la TV hace automáticamente el fundido entre la música
  de espera y la música principal.
  */
  useEffect(() => {
    if (
      !modoPublico ||
      !sonidoPublicoActivo
    ) {
      return
    }

    sincronizarMusicaPublica()
  }, [
    modoPublico,
    sonidoPublicoActivo,
    presentacionPublica?.estado,
    estadoPrecargaMusicaPublica.espera,
    estadoPrecargaMusicaPublica.sorteo,
  ])


  /*
  El resumen final YA NO aparece automáticamente.
  La TV espera a que el administrador pulse el botón
  "Mostrar resumen final" después de completar la última pareja.
  */
  useEffect(() => {
    if (!modoPublico) {
      return
    }

    const debeMostrarResumen =
      (
        Boolean(
          presentacionPublica?.mostrar_resumen_final
        ) ||
        resumenAutomaticoRepeticionPublica
      ) &&
      String(
        presentacionPublica?.estado ?? ''
      ).toLowerCase() === 'finalizada' &&
      equipoCompletoPublico

    setMostrarResumenFinalPublico(
      debeMostrarResumen
    )
  }, [
    modoPublico,
    presentacionPublica?.estado,
    presentacionPublica?.mostrar_resumen_final,
    resumenAutomaticoRepeticionPublica,
    equipoCompletoPublico,
  ])


  useEffect(() => {
    if (!modoPublico) {
      return
    }

    if (
      mostrarResumenFinalPublico &&
      !resumenSonidoPublicoRef.current
    ) {
      resumenSonidoPublicoRef.current =
        true

      reproducirEfectoPublico(
        'resumen'
      )
    }

    if (!mostrarResumenFinalPublico) {
      resumenSonidoPublicoRef.current =
        false
    }
  }, [
    modoPublico,
    mostrarResumenFinalPublico,
  ])

  /*
  Limpieza de temporizadores y del AudioContext al desmontar.
  */
  useEffect(() => {
    return () => {
      for (const temporizador of temporizadoresPublicosRef.current) {
        window.clearTimeout(temporizador)
      }

      for (const temporizador of temporizadoresRepeticionPublicaRef.current) {
        window.clearTimeout(temporizador)
      }

      if (temporizadorBloqueoAdminRef.current) {
        window.clearTimeout(temporizadorBloqueoAdminRef.current)
      }

      if (temporizadorRepeticionAdminRef.current) {
        window.clearTimeout(temporizadorRepeticionAdminRef.current)
      }

      detenerMusicaPublica()
      limpiarPistaMusicaPublica(
        'espera'
      )
      limpiarPistaMusicaPublica(
        'sorteo'
      )

      limpiarEfectoPersonalizadoPublico(
        'jugador'
      )
      limpiarEfectoPersonalizadoPublico(
        'equipo'
      )
      limpiarEfectoPersonalizadoPublico(
        'resumen'
      )

      if (audioContextPublicoRef.current) {
        audioContextPublicoRef.current.close().catch(() => {})
      }
    }
  }, [])

  /*
  ============================================================
  ACCESO DIRECTO AL CONTROL MÓVIL
  ============================================================
  */

  useEffect(() => {
    if (!modoControlMovil) {
      return
    }

    let cancelado = false

    async function prepararControlMovil() {
      setCargandoControlMovil(true)
      setErrorControlMovil('')

      try {
        const {
          data: sesionData,
          error: errorSesion,
        } = await supabase.auth.getSession()

        if (errorSesion) {
          throw errorSesion
        }

        if (
          !sesionData?.session
        ) {
          if (!cancelado) {
            setPantalla('login')
          }

          return
        }

        const {
          data: esAdmin,
          error: errorAdmin,
        } = await supabase.rpc(
          'es_administrador'
        )

        if (errorAdmin) {
          throw errorAdmin
        }

        if (esAdmin !== true) {
          await supabase.auth.signOut()

          if (!cancelado) {
            setMensajeLogin(
              'La sesión abierta no tiene permisos de administrador.'
            )
            setPantalla('login')
          }

          return
        }

        if (!cancelado) {
          await cargarControlMovilDesdeUrl()
        }
      } catch (error) {
        console.error(
          'Error preparando el acceso móvil:',
          error
        )

        if (!cancelado) {
          setErrorControlMovil(
            error.message
          )
          setPantalla('login')
        }
      } finally {
        if (!cancelado) {
          setCargandoControlMovil(false)
        }
      }
    }

    prepararControlMovil()

    return () => {
      cancelado = true
    }
  }, [
    modoControlMovil,
    sorteoControlMovilId,
    ejecucionControlMovilId,
  ])


  /*
  Cuando el control móvil ya está abierto, refrescamos el estado
  cada pocos segundos. Así sigue sincronizado aunque otra persona
  pulse un botón desde otro dispositivo.
  */
  useEffect(() => {
    if (
      pantalla !== 'control-movil' ||
      !sorteoSeleccionado ||
      !ejecucionControlMovilId ||
      accionPresentacion
    ) {
      return
    }

    const intervalo =
      window.setInterval(
        () => {
          cargarEstadoControlPresentacion(
            ejecucionControlMovilId
          )
        },
        5000
      )

    return () =>
      window.clearInterval(
        intervalo
      )
  }, [
    pantalla,
    sorteoSeleccionado?.id,
    ejecucionControlMovilId,
    accionPresentacion,
  ])


  /*
  ============================================================
  LOGIN ADMINISTRADOR
  ============================================================
  */

  async function iniciarSesion(evento) {
    evento.preventDefault()

    setCargandoLogin(true)

    setMensajeLogin(
      '1/2 · Comprobando correo y contraseña...'
    )

    try {
      const {
        data: loginData,
        error: errorLogin,
      } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (errorLogin) {
        console.error(
          'Error login:',
          errorLogin
        )

        setMensajeLogin(
          `Error de acceso: ${errorLogin.message}`
        )

        setCargandoLogin(false)

        return
      }

      console.log(
        'Login correcto:',
        loginData
      )

      setMensajeLogin(
        '2/2 · Usuario identificado. Comprobando permisos...'
      )

      const {
        data: esAdmin,
        error: errorAdmin,
      } = await supabase.rpc(
        'es_administrador'
      )

      if (errorAdmin) {
        console.error(
          'Error comprobando administrador:',
          errorAdmin
        )

        setMensajeLogin(
          `Error comprobando permisos: ${errorAdmin.message}`
        )

        setCargandoLogin(false)

        return
      }

      console.log(
        '¿Es administrador?:',
        esAdmin
      )

      if (esAdmin !== true) {
        await supabase.auth.signOut()

        setMensajeLogin(
          'El usuario existe, pero no tiene permisos de administrador.'
        )

        setCargandoLogin(false)

        return
      }

      setMensajeLogin('')
      setPassword('')

      if (modoControlMovil) {
        await cargarControlMovilDesdeUrl()
      } else {
        setPantalla('admin')
      }

      setCargandoLogin(false)
    } catch (error) {
      console.error(
        'Error inesperado:',
        error
      )

      setMensajeLogin(
        `Error inesperado: ${error.message}`
      )

      setCargandoLogin(false)
    }
  }

  /*
  ============================================================
  CAMBIO DE SORTEO · LIMPIAR CONTEXTO DE EJECUCIÓN
  ============================================================

  Cada sorteo debe trabajar únicamente con sus propias ejecuciones.
  Antes de entrar en otro sorteo eliminamos cualquier referencia a
  resultados/presentaciones del sorteo anterior.
  */

  function limpiarContextoEjecucionSeleccionada() {
    setEjecucionGenerada(null)

    setEquiposResultado([])
    setEjecucionResultado(null)
    setFotosResultado({})
    setCargandoResultado(false)
    setErrorResultado('')
    setAuditoriaResultado(null)

    setEstadoPresentacion(null)
    setEquiposReveladosControl([])
    setFotosControlPresentacion({})
    setCargandoControlPresentacion(false)
    setErrorControlPresentacion('')
    setAccionPresentacion(false)
    setMensajePresentacion('')
    setResumenFinalEnviado(false)
    setRepeticionEnCursoControl(false)
    setBloqueoSecuenciaPresentacion(false)
    setMostrarConfirmacionInicioPresentacion(false)
  }

  function gestionarSorteo(sorteo) {
    limpiarContextoEjecucionSeleccionada()

    setEquiposFijos([])
    setMiembrosEquiposFijos([])
    setReglasEquiposFijos([])
    setReglaEquipoFijoId('')
    setParticipantesEquipoFijo([])
    setBusquedasEquipoFijo([])
    setErrorEquiposFijos('')
    setMensajeEquiposFijos('')

    setEjecucionOficialSorteo(null)
    setConfirmacionOficialidad(null)
    setMensajeOficialidad('')
    setMensajeTiemposPresentacion('')
    setMensajeMusicaPresentacion('')

    setSorteoSeleccionado(sorteo)
    setPantalla('gestionar-sorteo')
  }

  /*
  ============================================================
  CARGAR SORTEOS
  ============================================================
  */

  async function cargarSorteos() {
    setCargandoSorteos(true)
    setErrorSorteos('')

    const { data, error } =
      await supabase
        .from('sorteos')
        .select(`
          id,
          nombre,
          descripcion,
          fecha_evento,
          formato_sorteo,
          numero_grupos,
          distribucion_grupos,
          jugadores_por_equipo,
          presentacion_retraso_primer_ms,
          presentacion_intervalo_jugador_ms,
          presentacion_pausa_entre_equipos_ms,
          presentacion_pausa_resumen_ms,
          presentacion_estilo_entrada,
          musica_espera_path,
          musica_espera_nombre,
          musica_espera_volumen,
          musica_sorteo_path,
          musica_sorteo_nombre,
          musica_sorteo_volumen,
          efecto_jugador_path,
          efecto_jugador_nombre,
          efecto_jugador_volumen,
          efecto_jugador_activo,
          efecto_equipo_path,
          efecto_equipo_nombre,
          efecto_equipo_volumen,
          efecto_equipo_activo,
          efecto_resumen_path,
          efecto_resumen_nombre,
          efecto_resumen_volumen,
          efecto_resumen_activo,
          estado,
          creado_en
        `)
        .order(
          'creado_en',
          { ascending: false }
        )

    if (error) {
      console.error(
        'Error cargando sorteos:',
        error
      )

      setErrorSorteos(
        error.message
      )

      setCargandoSorteos(false)

      return
    }

    setSorteos(
      data ?? []
    )

    setCargandoSorteos(false)
  }

  /*
  ============================================================
  GUARDAR NUEVO SORTEO
  ============================================================
  */

  async function guardarNuevoSorteo(
    evento
  ) {
    evento.preventDefault()

    setGuardandoSorteo(true)

    setMensajeNuevoSorteo(
      'Guardando sorteo...'
    )

    const { error } =
      await supabase
        .from('sorteos')
        .insert([
          {
            nombre:
              nuevoNombre.trim(),

            descripcion:
              nuevaDescripcion.trim() ||
              null,

            fecha_evento:
              nuevaFecha ||
              null,

            formato_sorteo:
              nuevoFormatoSorteo,

            numero_grupos:
              nuevoFormatoSorteo === 'grupos'
                ? Number(
                    nuevosGrupos
                  )
                : null,

            distribucion_grupos:
              nuevoFormatoSorteo === 'grupos'
                ? nuevaDistribucionGrupos
                : null,

            jugadores_por_equipo:
              Number(nuevosJugadoresPorEquipo),
          },
        ])

    if (error) {
      console.error(
        'Error creando sorteo:',
        error
      )

      setMensajeNuevoSorteo(
        `Error: ${error.message}`
      )

      setGuardandoSorteo(false)

      return
    }

    setNuevoNombre('')
    setNuevaDescripcion('')
    setNuevaFecha('')
    setNuevoFormatoSorteo('grupos')
    setNuevosGrupos(2)
    setNuevosJugadoresPorEquipo(2)
    setNuevaDistribucionGrupos('equilibrada')

    setMensajeNuevoSorteo('')

    await cargarSorteos()

    setGuardandoSorteo(false)

    setPantalla('admin')
  }

  /*
  ============================================================
  ABRIR BOMBOS
  ============================================================
  */

  async function abrirBombos() {
    if (!sorteoSeleccionado) {
      return
    }

    setPantalla('bombos')
    setCargandoBombos(true)
    setErrorBombos('')

    const { data, error } = await supabase
      .from('bombos')
      .select(`
        id,
        codigo,
        nombre,
        orden,
        descripcion,
        creado_en
      `)
      .eq(
        'sorteo_id',
        sorteoSeleccionado.id
      )
      .order(
        'orden',
        { ascending: true }
      )

    if (error) {
      console.error(
        'Error cargando bombos:',
        error
      )

      setErrorBombos(
        error.message
      )

      setCargandoBombos(false)

      return
    }

    const listaBombos =
      data ?? []

    setBombos(
      listaBombos
    )

    setCantidadBombosObjetivo(
      listaBombos.length > 0
        ? listaBombos.length
        : 4
    )

    setCargandoBombos(false)
  }

function obtenerUrlFoto(fotoPath) {
  if (!fotoPath) {
    return null
  }

  const { data } = supabase
    .storage
    .from('jugadores')
    .getPublicUrl(fotoPath)

  return data.publicUrl
}


function obtenerUrlMusica(musicaPath) {
  if (!musicaPath) {
    return null
  }

  const { data } = supabase
    .storage
    .from('musica-sorteos')
    .getPublicUrl(musicaPath)

  return data.publicUrl
}


function limpiarNombreArchivoMusica(nombre) {
  return String(nombre ?? 'cancion.mp3')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}


function seleccionarFotoJugador(evento) {
const archivo =
  evento.target.files?.[0]

if (!archivo) {
  setFotoNuevoJugador(null)
  setPreviewFotoJugador('')
  return
}

if (!archivo.type.startsWith('image/')) {
  setMensajeNuevoJugador(
    'El archivo seleccionado no es una imagen.'
  )

  evento.target.value = ''
  return
}

const limite = 5 * 1024 * 1024

if (archivo.size > limite) {
  setMensajeNuevoJugador(
    'La imagen no puede superar los 5 MB.'
  )

  evento.target.value = ''
  return
}

setFotoNuevoJugador(archivo)

setPreviewFotoJugador(
  URL.createObjectURL(archivo)
)

setMensajeNuevoJugador('')
}

function seleccionarFotoEditarJugador(evento) {
  const archivo =
    evento.target.files?.[0]

  if (!archivo) {
    setFotoEditarJugador(null)
    return
  }

  if (!archivo.type.startsWith('image/')) {
    setMensajeEditarJugador(
      'El archivo seleccionado no es una imagen.'
    )

    evento.target.value = ''
    return
  }

  const limite = 5 * 1024 * 1024

  if (archivo.size > limite) {
    setMensajeEditarJugador(
      'La imagen no puede superar los 5 MB.'
    )

    evento.target.value = ''
    return
  }

  setFotoEditarJugador(archivo)

  setPreviewFotoEditarJugador(
    URL.createObjectURL(archivo)
  )

  setMensajeEditarJugador('')
}

function abrirEditarJugador(participante, jugador) {
  setJugadorEditando({
    participanteId: participante.id,
    jugadorId: jugador.id,
    codigoJugador: jugador.codigo_jugador,
    bomboId: participante.bombo_id ?? '',
    fotoPath: jugador.foto_path ?? null,
  })

  setNombreEditarJugador(
    jugador.nombre ?? ''
  )

  setApellidosEditarJugador(
    jugador.apellidos ?? ''
  )

  setAliasEditarJugador(
    jugador.alias ?? ''
  )

  setBomboEditarJugador(
    participante.bombo_id ?? ''
  )

  setFotoEditarJugador(null)

  setPreviewFotoEditarJugador(
    jugador.foto_path
      ? obtenerUrlFoto(jugador.foto_path)
      : ''
  )

  setMensajeEditarJugador('')
  setPantalla('editar-jugador')
}

async function quitarJugadorDelSorteo(participante, jugador) {
  const nombreVisible =
    jugador.alias ||
    [jugador.nombre, jugador.apellidos]
      .filter(Boolean)
      .join(' ')

  const confirmar = window.confirm(
    `¿Quitar a ${nombreVisible} de este sorteo?\n\n` +
    'Su ficha general y su foto NO se borrarán.'
  )

  if (!confirmar) {
    return
  }

  setErrorJugadores('')

  const {
    data: miembroFijo,
    error: errorComprobarFijo,
  } = await supabase
    .from('miembros_equipo_fijo')
    .select('equipo_fijo_id')
    .eq('participante_id', participante.id)
    .maybeSingle()

  if (errorComprobarFijo) {
    setErrorJugadores(errorComprobarFijo.message)
    return
  }

  if (miembroFijo) {
    setErrorJugadores(
      `${nombreVisible} forma parte de un equipo fijo. Elimina primero ese equipo fijo.`
    )
    return
  }

  const { error } = await supabase
    .from('participantes_sorteo')
    .delete()
    .eq('id', participante.id)

  if (error) {
    console.error(
      'Error quitando jugador del sorteo:',
      error
    )

    setErrorJugadores(error.message)
    return
  }

  await abrirJugadores()
}

async function guardarEdicionJugador(evento) {
  evento.preventDefault()

  if (!jugadorEditando) {
    return
  }

  if (!bomboEditarJugador) {
    setMensajeEditarJugador(
      'Debes seleccionar un bombo.'
    )
    return
  }

  setGuardandoEdicionJugador(true)
  setMensajeEditarJugador(
    'Guardando cambios...'
  )

  try {
    let nuevaFotoPath =
      jugadorEditando.fotoPath ?? null

    /*
    ============================================================
    1. SUBIR NUEVA FOTO, SI SE HA SELECCIONADO
    ============================================================
    */

    if (fotoEditarJugador) {
      const extension =
        fotoEditarJugador.name
          .split('.')
          .pop()
          ?.toLowerCase() || 'jpg'

      nuevaFotoPath =
        `${jugadorEditando.jugadorId}/${crypto.randomUUID()}.${extension}`

      const { error: errorSubida } =
        await supabase
          .storage
          .from('jugadores')
          .upload(
            nuevaFotoPath,
            fotoEditarJugador,
            {
              cacheControl: '3600',
              upsert: false,
            }
          )

      if (errorSubida) {
        throw errorSubida
      }
    }

    /*
    ============================================================
    2. ACTUALIZAR LA FICHA GENERAL DEL JUGADOR
    ============================================================
    */

    const {
      error: errorActualizarJugador,
    } = await supabase
      .from('jugadores')
      .update({
        nombre:
          nombreEditarJugador.trim(),
        apellidos:
          apellidosEditarJugador.trim() || null,
        alias:
          aliasEditarJugador.trim() || null,
        foto_path:
          nuevaFotoPath,
      })
      .eq(
        'id',
        jugadorEditando.jugadorId
      )

    if (errorActualizarJugador) {
      throw errorActualizarJugador
    }

    /*
    ============================================================
    3. ACTUALIZAR EL BOMBO SOLO PARA ESTE SORTEO
    ============================================================

    Si el jugador forma parte de un equipo fijo, el bombo determina
    la regla que valida esa pareja. Para no dejar una pareja incoherente,
    pedimos eliminar primero el equipo fijo.
    */

    if (
      jugadorEditando.bomboId !==
      bomboEditarJugador
    ) {
      const {
        data: miembroFijo,
        error: errorComprobarFijo,
      } = await supabase
        .from('miembros_equipo_fijo')
        .select('equipo_fijo_id')
        .eq(
          'participante_id',
          jugadorEditando.participanteId
        )
        .maybeSingle()

      if (errorComprobarFijo) {
        throw errorComprobarFijo
      }

      if (miembroFijo) {
        throw new Error(
          'Este jugador forma parte de un equipo fijo. Elimina primero ese equipo fijo para cambiarlo de bombo.'
        )
      }
    }

    const {
      error: errorActualizarParticipacion,
    } = await supabase
      .from('participantes_sorteo')
      .update({
        bombo_id:
          bomboEditarJugador,
      })
      .eq(
        'id',
        jugadorEditando.participanteId
      )

    if (errorActualizarParticipacion) {
      throw errorActualizarParticipacion
    }

    /*
    Si se sustituyó la foto, intentamos borrar la anterior.
    Un fallo aquí no impide guardar los cambios.
    */

    if (
      fotoEditarJugador &&
      jugadorEditando.fotoPath &&
      jugadorEditando.fotoPath !== nuevaFotoPath
    ) {
      const { error: errorBorrarFotoAnterior } =
        await supabase
          .storage
          .from('jugadores')
          .remove([
            jugadorEditando.fotoPath,
          ])

      if (errorBorrarFotoAnterior) {
        console.warn(
          'No se pudo borrar la foto anterior:',
          errorBorrarFotoAnterior
        )
      }
    }

    setJugadorEditando(null)
    setFotoEditarJugador(null)
    setPreviewFotoEditarJugador('')
    setMensajeEditarJugador('')

    await abrirJugadores()
  } catch (error) {
    console.error(
      'Error editando jugador:',
      error
    )

    setMensajeEditarJugador(
      `Error: ${error.message}`
    )
  } finally {
    setGuardandoEdicionJugador(false)
  }
}

async function abrirJugadores() {
  if (!sorteoSeleccionado) {
    return
  }

  setPantalla('jugadores')
  setCargandoJugadores(true)
  setErrorJugadores('')


  /*
  ============================================================
  1. CARGAR LOS BOMBOS DEL SORTEO
  ============================================================
  */

  const {
    data: datosBombos,
    error: errorDatosBombos,
  } = await supabase
    .from('bombos')
    .select(`
      id,
      codigo,
      nombre,
      orden
    `)
    .eq(
      'sorteo_id',
      sorteoSeleccionado.id
    )
    .order(
      'orden',
      { ascending: true }
    )

  if (errorDatosBombos) {
    console.error(
      'Error cargando bombos:',
      errorDatosBombos
    )

    setErrorJugadores(
      errorDatosBombos.message
    )

    setCargandoJugadores(false)

    return
  }

  setBombos(
    datosBombos ?? []
  )

  /*
  ============================================================
  2. CARGAR PARTICIPANTES DEL SORTEO
  ============================================================
  */

  const {
    data: datosParticipantes,
    error: errorParticipantes,
  } = await supabase
    .from('participantes_sorteo')
    .select(`
      id,
      jugador_id,
      bombo_id,
      estado
    `)
    .eq(
      'sorteo_id',
      sorteoSeleccionado.id
    )

  if (errorParticipantes) {
    console.error(
      'Error cargando participantes:',
      errorParticipantes
    )

    setErrorJugadores(
      errorParticipantes.message
    )

    setCargandoJugadores(false)

    return
  }

  const listaParticipantes =
    datosParticipantes ?? []

  setParticipantes(
    listaParticipantes
  )

  /*
  Si no hay participantes todavía,
  terminamos aquí.
  Los bombos ya están cargados.
  */

  if (listaParticipantes.length === 0) {
    setJugadores([])
    setCargandoJugadores(false)

    return
  }

  /*
  ============================================================
  3. CARGAR DATOS DE LOS JUGADORES
  ============================================================
  */

  const idsJugadores =
    listaParticipantes.map(
      (participante) =>
        participante.jugador_id
    )

  const {
    data: datosJugadores,
    error: errorDatosJugadores,
  } = await supabase
    .from('jugadores')
    .select(`
  id,
  codigo_jugador,
  nombre,
  apellidos,
  alias,
  foto_path,
  activo
`)
    .in(
      'id',
      idsJugadores
    )

  if (errorDatosJugadores) {
    console.error(
      'Error cargando jugadores:',
      errorDatosJugadores
    )

    setErrorJugadores(
      errorDatosJugadores.message
    )

    setCargandoJugadores(false)

    return
  }

  setJugadores(
    datosJugadores ?? []
  )

  setCargandoJugadores(false)
}


  async function guardarNuevoBombo(evento) {
  evento.preventDefault()

  if (!sorteoSeleccionado) {
    return
  }

  setGuardandoBombo(true)
  setMensajeNuevoBombo('Guardando bombo...')

  const { error } = await supabase
    .from('bombos')
    .insert([
      {
        sorteo_id: sorteoSeleccionado.id,
        codigo: nuevoCodigoBombo.trim().toUpperCase(),
        nombre: nuevoNombreBombo.trim(),
        orden: Number(nuevoOrdenBombo),
        descripcion:
          nuevaDescripcionBombo.trim() || null,
      },
    ])

  if (error) {
    console.error('Error creando bombo:', error)

    setMensajeNuevoBombo(
      `Error: ${error.message}`
    )

    setGuardandoBombo(false)
    return
  }

  setNuevoCodigoBombo('')
  setNuevoNombreBombo('')
  setNuevaDescripcionBombo('')

  setMensajeNuevoBombo('')

  await abrirBombos()

  setGuardandoBombo(false)
  setPantalla('bombos')
}


function abrirEditarBombo(bombo) {
  setBomboEditando(bombo)

  setCodigoEditarBombo(
    bombo.codigo ?? ''
  )

  setNombreEditarBombo(
    bombo.nombre ?? ''
  )

  setOrdenEditarBombo(
    Number(bombo.orden ?? 1)
  )

  setDescripcionEditarBombo(
    bombo.descripcion ?? ''
  )

  setMensajeEditarBombo('')
  setPantalla('editar-bombo')
}

async function guardarEdicionBombo(evento) {
  evento.preventDefault()

  if (
    !sorteoSeleccionado ||
    !bomboEditando
  ) {
    return
  }

  const codigo =
    codigoEditarBombo
      .trim()
      .toUpperCase()

  const nombre =
    nombreEditarBombo.trim()

  const orden =
    Number(ordenEditarBombo)

  if (!codigo || !nombre) {
    setMensajeEditarBombo(
      'Código y nombre son obligatorios.'
    )
    return
  }

  if (
    !Number.isInteger(orden) ||
    orden < 1
  ) {
    setMensajeEditarBombo(
      'El orden debe ser un número entero mayor que 0.'
    )
    return
  }

  /*
  Evitamos esperar al error de la base de datos cuando otro
  bombo del mismo sorteo ya usa ese código u orden.
  */
  const codigoDuplicado =
    bombos.some(
      (bombo) =>
        bombo.id !== bomboEditando.id &&
        String(bombo.codigo)
          .trim()
          .toUpperCase() === codigo
    )

  if (codigoDuplicado) {
    setMensajeEditarBombo(
      `Ya existe otro bombo con el código ${codigo}.`
    )
    return
  }

  const ordenDuplicado =
    bombos.some(
      (bombo) =>
        bombo.id !== bomboEditando.id &&
        Number(bombo.orden) === orden
    )

  if (ordenDuplicado) {
    setMensajeEditarBombo(
      `Ya existe otro bombo con el orden ${orden}.`
    )
    return
  }

  setGuardandoEdicionBombo(true)
  setMensajeEditarBombo(
    'Guardando cambios...'
  )

  try {
    const {
      error,
    } = await supabase
      .from('bombos')
      .update({
        codigo,
        nombre,
        orden,
        descripcion:
          descripcionEditarBombo.trim() ||
          null,
      })
      .eq(
        'id',
        bomboEditando.id
      )
      .eq(
        'sorteo_id',
        sorteoSeleccionado.id
      )

    if (error) {
      throw error
    }

    setMensajeBombos(
      `Bombo ${codigo} actualizado correctamente.`
    )

    setBomboEditando(null)
    setMensajeEditarBombo('')

    await abrirBombos()

    setPantalla('bombos')
  } catch (error) {
    console.error(
      'Error actualizando bombo:',
      error
    )

    setMensajeEditarBombo(
      `Error: ${error.message}`
    )
  } finally {
    setGuardandoEdicionBombo(false)
  }
}

async function confirmarEliminarBombo() {
  if (
    !sorteoSeleccionado ||
    !bomboPendienteEliminar
  ) {
    return
  }

  setEliminandoBombo(true)
  setMensajeBombos('')

  try {
    /*
    Un bombo no se borra si está siendo utilizado.
    Así evitamos dejar participantes o reglas apuntando a nada.
    */
    const [
      respuestaParticipantes,
      respuestaReglas,
    ] = await Promise.all([
      supabase
        .from('participantes_sorteo')
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          }
        )
        .eq(
          'sorteo_id',
          sorteoSeleccionado.id
        )
        .eq(
          'bombo_id',
          bomboPendienteEliminar.id
        ),

      supabase
        .from('regla_emparejamiento_bombos')
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          }
        )
        .eq(
          'sorteo_id',
          sorteoSeleccionado.id
        )
        .eq(
          'bombo_id',
          bomboPendienteEliminar.id
        ),
    ])

    if (respuestaParticipantes.error) {
      throw respuestaParticipantes.error
    }

    if (respuestaReglas.error) {
      throw respuestaReglas.error
    }

    const participantesAsignados =
      respuestaParticipantes.count ?? 0

    const reglasAsignadas =
      respuestaReglas.count ?? 0

    if (
      participantesAsignados > 0 ||
      reglasAsignadas > 0
    ) {
      const motivos = []

      if (participantesAsignados > 0) {
        motivos.push(
          `${participantesAsignados} participante${
            participantesAsignados === 1
              ? ''
              : 's'
          }`
        )
      }

      if (reglasAsignadas > 0) {
        motivos.push(
          `${reglasAsignadas} regla${
            reglasAsignadas === 1
              ? ''
              : 's'
          } de emparejamiento`
        )
      }

      setMensajeBombos(
        `No se puede eliminar el bombo ${bomboPendienteEliminar.codigo}: está siendo usado por ${motivos.join(
          ' y '
        )}.`
      )

      setBomboPendienteEliminar(null)
      return
    }

    const {
      error: errorEliminar,
    } = await supabase
      .from('bombos')
      .delete()
      .eq(
        'id',
        bomboPendienteEliminar.id
      )
      .eq(
        'sorteo_id',
        sorteoSeleccionado.id
      )

    if (errorEliminar) {
      throw errorEliminar
    }

    const codigo =
      bomboPendienteEliminar.codigo

    setBombos(
      (actuales) =>
        actuales.filter(
          (bombo) =>
            bombo.id !==
            bomboPendienteEliminar.id
        )
    )

    setBomboPendienteEliminar(null)

    setMensajeBombos(
      `Bombo ${codigo} eliminado correctamente.`
    )
  } catch (error) {
    console.error(
      'Error eliminando bombo:',
      error
    )

    setMensajeBombos(
      `Error: ${error.message}`
    )
  } finally {
    setEliminandoBombo(false)
  }
}


async function crearBombosAutomaticos() {
  if (!sorteoSeleccionado) {
    return
  }

  const objetivo =
    Number(cantidadBombosObjetivo)

  if (
    !Number.isInteger(objetivo) ||
    objetivo < 1
  ) {
    setMensajeBombos(
      'Indica un número válido de bombos.'
    )
    return
  }

  const cantidadActual =
    bombos.length

  if (objetivo <= cantidadActual) {
    setMensajeBombos(
      objetivo === cantidadActual
        ? `El sorteo ya tiene ${cantidadActual} bombos.`
        : `El sorteo ya tiene ${cantidadActual} bombos. La creación automática no elimina bombos existentes.`
    )
    return
  }

  setCreandoBombosAutomaticos(true)
  setMensajeBombos(
    'Creando bombos automáticamente...'
  )

  try {
    const codigosExistentes =
      new Set(
        bombos.map(
          (bombo) =>
            String(
              bombo.codigo ?? ''
            )
              .trim()
              .toUpperCase()
        )
      )

    const cantidadACrear =
      objetivo - cantidadActual

    const nuevos = []
    let indiceCodigo = 0

    const ordenInicial =
      bombos.reduce(
        (maximo, bombo) =>
          Math.max(
            maximo,
            Number(bombo.orden) || 0
          ),
        0
      )

    while (
      nuevos.length <
      cantidadACrear
    ) {
      const codigo =
        generarCodigoBomboAutomatico(
          indiceCodigo
        )

      indiceCodigo += 1

      if (
        codigosExistentes.has(
          codigo
        )
      ) {
        continue
      }

      codigosExistentes.add(
        codigo
      )

      nuevos.push({
        sorteo_id:
          sorteoSeleccionado.id,

        codigo,

        nombre:
          `Bombo ${codigo}`,

        orden:
          ordenInicial +
          nuevos.length +
          1,

        descripcion:
          null,
      })
    }

    const {
      error,
    } = await supabase
      .from('bombos')
      .insert(nuevos)

    if (error) {
      throw error
    }

    const {
      data,
      error: errorRecarga,
    } = await supabase
      .from('bombos')
      .select(`
        id,
        codigo,
        nombre,
        orden,
        descripcion,
        creado_en
      `)
      .eq(
        'sorteo_id',
        sorteoSeleccionado.id
      )
      .order(
        'orden',
        { ascending: true }
      )

    if (errorRecarga) {
      throw errorRecarga
    }

    setBombos(
      data ?? []
    )

    setCantidadBombosObjetivo(
      objetivo
    )

    setMostrarCreadorBombos(
      false
    )

    setMensajeBombos(
      `${cantidadACrear} ${
        cantidadACrear === 1
          ? 'bombo creado'
          : 'bombos creados'
      }. El sorteo tiene ahora ${objetivo} bombos.`
    )
  } catch (error) {
    console.error(
      'Error creando bombos automáticamente:',
      error
    )

    setMensajeBombos(
      `Error: ${error.message}`
    )
  } finally {
    setCreandoBombosAutomaticos(
      false
    )
  }
}


async function cargarCatalogoGeneral() {
  const {
    data,
    error,
  } = await supabase
    .from('jugadores')
    .select(`
      id,
      codigo_jugador,
      nombre,
      apellidos,
      alias,
      foto_path,
      activo
    `)
    .eq('activo', true)
    .order(
      'nombre',
      { ascending: true }
    )

  if (error) {
    throw error
  }

  setCatalogoJugadores(
    data ?? []
  )

  return data ?? []
}

async function abrirGestionCatalogo() {
  setPantalla('gestion-catalogo')
  setCatalogoGestionCargando(true)
  setCatalogoGestionError('')
  setCatalogoGestionMensaje('')
  setCatalogoGestionBusqueda('')

  try {
    await cargarCatalogoGeneral()
  } catch (error) {
    console.error(
      'Error cargando catálogo general:',
      error
    )

    setCatalogoGestionError(
      error.message
    )
  } finally {
    setCatalogoGestionCargando(false)
  }
}

async function crearJugadorSoloCatalogo(evento) {
  evento.preventDefault()

  const codigo =
    catalogoNuevoCodigo
      .trim()
      .toUpperCase()

  const nombre =
    catalogoNuevoNombre.trim()

  if (!codigo || !nombre) {
    setCatalogoGestionMensaje(
      'Código y nombre son obligatorios.'
    )
    return
  }

  setCatalogoGuardandoNuevo(true)
  setCatalogoGestionMensaje(
    'Guardando jugador...'
  )

  try {
    const {
      data: existente,
      error: errorBuscar,
    } = await supabase
      .from('jugadores')
      .select('id')
      .eq(
        'codigo_jugador',
        codigo
      )
      .maybeSingle()

    if (errorBuscar) {
      throw errorBuscar
    }

    if (existente) {
      setCatalogoGestionMensaje(
        'Ese código ya existe en el catálogo.'
      )
      return
    }

    const {
      data: creado,
      error: errorCrear,
    } = await supabase
      .from('jugadores')
      .insert([
        {
          codigo_jugador: codigo,
          nombre,
          apellidos:
            catalogoNuevoApellidos.trim() ||
            null,
          alias:
            catalogoNuevoAlias.trim() ||
            null,
          activo: true,
        },
      ])
      .select(`
        id,
        codigo_jugador,
        nombre,
        apellidos,
        alias,
        foto_path,
        activo
      `)
      .single()

    if (errorCrear) {
      throw errorCrear
    }

    let fotoPath = null

    if (catalogoNuevaFoto) {
      const extension =
        catalogoNuevaFoto.name
          .split('.')
          .pop()
          ?.toLowerCase() || 'jpg'

      const nombreArchivo =
        `${creado.id}/${crypto.randomUUID()}.${extension}`

      const {
        error: errorSubida,
      } = await supabase
        .storage
        .from('jugadores')
        .upload(
          nombreArchivo,
          catalogoNuevaFoto,
          {
            cacheControl: '3600',
            upsert: false,
          }
        )

      if (errorSubida) {
        throw errorSubida
      }

      fotoPath =
        nombreArchivo

      const {
        error: errorFoto,
      } = await supabase
        .from('jugadores')
        .update({
          foto_path:
            nombreArchivo,
        })
        .eq(
          'id',
          creado.id
        )

      if (errorFoto) {
        throw errorFoto
      }
    }

    setCatalogoJugadores(
      (actuales) => [
        ...actuales,
        {
          ...creado,
          foto_path:
            fotoPath,
        },
      ].sort(
        (a, b) =>
          String(a.nombre).localeCompare(
            String(b.nombre),
            'es'
          )
      )
    )

    setCatalogoNuevoCodigo('')
    setCatalogoNuevoNombre('')
    setCatalogoNuevoApellidos('')
    setCatalogoNuevoAlias('')
    setCatalogoNuevaFoto(null)
    setCatalogoNuevaFotoPreview('')

    setCatalogoGestionMensaje(
      'Jugador añadido al catálogo general.'
    )
  } catch (error) {
    console.error(
      'Error creando jugador en catálogo:',
      error
    )

    setCatalogoGestionMensaje(
      `Error: ${error.message}`
    )
  } finally {
    setCatalogoGuardandoNuevo(false)
  }
}

async function confirmarEliminarJugadorCatalogo() {
  if (!jugadorCatalogoPendienteEliminar) {
    return
  }

  setEliminandoJugadorCatalogo(true)
  setCatalogoGestionMensaje('')

  try {
    const {
      data,
      error,
    } = await supabase.rpc(
      'eliminar_jugador_catalogo',
      {
        p_jugador_id:
          jugadorCatalogoPendienteEliminar.id,
      }
    )

    if (error) {
      throw error
    }

    const fotoPath =
      data?.foto_path ??
      jugadorCatalogoPendienteEliminar.foto_path ??
      null

    if (fotoPath) {
      const {
        error: errorStorage,
      } = await supabase
        .storage
        .from('jugadores')
        .remove([
          fotoPath,
        ])

      if (errorStorage) {
        console.warn(
          'La ficha se eliminó, pero no se pudo borrar la foto:',
          errorStorage
        )
      }
    }

    setCatalogoJugadores(
      (actuales) =>
        actuales.filter(
          (jugador) =>
            jugador.id !==
            jugadorCatalogoPendienteEliminar.id
        )
    )

    setCatalogoGestionMensaje(
      'Jugador eliminado del catálogo.'
    )

    setJugadorCatalogoPendienteEliminar(
      null
    )
  } catch (error) {
    console.error(
      'Error eliminando jugador del catálogo:',
      error
    )

    setCatalogoGestionMensaje(
      `No se puede eliminar: ${error.message}`
    )
  } finally {
    setEliminandoJugadorCatalogo(false)
  }
}

async function confirmarEliminarSorteo() {
  if (!sorteoPendienteEliminar) {
    return
  }

  setEliminandoSorteo(true)
  setMensajeEliminarSorteo('')

  try {
    const {
      error,
    } = await supabase.rpc(
      'eliminar_sorteo_completo',
      {
        p_sorteo_id:
          sorteoPendienteEliminar.id,
      }
    )

    if (error) {
      throw error
    }

    setSorteos(
      (actuales) =>
        actuales.filter(
          (sorteo) =>
            sorteo.id !==
            sorteoPendienteEliminar.id
        )
    )

    if (
      sorteoSeleccionado?.id ===
      sorteoPendienteEliminar.id
    ) {
      setSorteoSeleccionado(null)
    }

    setMensajeEliminarSorteo(
      `Sorteo "${sorteoPendienteEliminar.nombre}" eliminado completamente.`
    )

    setSorteoPendienteEliminar(
      null
    )
  } catch (error) {
    console.error(
      'Error eliminando sorteo:',
      error
    )

    setMensajeEliminarSorteo(
      `Error: ${error.message}`
    )
  } finally {
    setEliminandoSorteo(false)
  }
}

async function abrirCatalogoJugadores() {
  if (!sorteoSeleccionado) {
    return
  }

  setPantalla('catalogo-jugadores')
  setCargandoCatalogoJugadores(true)
  setErrorCatalogoJugadores('')
  setMensajeCatalogoJugadores('')
  setBusquedaCatalogoJugadores('')
  setBomboCatalogoPorJugador({})

  try {
    /*
    El catálogo vive en la tabla global "jugadores".
    Aquí no creamos copias por sorteo: simplemente seleccionamos
    qué fichas globales participan en esta edición.
    */
    await cargarCatalogoGeneral()
  } catch (error) {
    console.error(
      'Error cargando catálogo general:',
      error
    )

    setErrorCatalogoJugadores(
      error.message
    )
  } finally {
    setCargandoCatalogoJugadores(false)
  }
}

async function añadirJugadorExistenteAlSorteo(jugador) {
  if (!sorteoSeleccionado) {
    return
  }

  const bomboId =
    bomboCatalogoPorJugador[
      jugador.id
    ]

  if (!bomboId) {
    setMensajeCatalogoJugadores(
      'Selecciona primero el bombo del jugador.'
    )
    return
  }

  const yaParticipa =
    participantes.some(
      (participante) =>
        participante.jugador_id ===
        jugador.id
    )

  if (yaParticipa) {
    setMensajeCatalogoJugadores(
      'Ese jugador ya participa en este sorteo.'
    )
    return
  }

  setJugadorCatalogoAñadiendo(
    jugador.id
  )
  setMensajeCatalogoJugadores('')

  try {
    const {
      data: participanteCreado,
      error,
    } = await supabase
      .from('participantes_sorteo')
      .insert([
        {
          sorteo_id:
            sorteoSeleccionado.id,
          jugador_id:
            jugador.id,
          bombo_id:
            bomboId,
          estado:
            'incluido',
        },
      ])
      .select(`
        id,
        jugador_id,
        bombo_id,
        estado
      `)
      .single()

    if (error) {
      throw error
    }

    /*
    Actualizamos el estado local para que la fila cambie a
    "Ya participa" inmediatamente sin abandonar el catálogo.
    */
    setParticipantes(
      (actuales) => [
        ...actuales,
        participanteCreado,
      ]
    )

    setBomboCatalogoPorJugador(
      (actual) => ({
        ...actual,
        [jugador.id]: '',
      })
    )

    const nombreVisible =
      jugador.alias ||
      [
        jugador.nombre,
        jugador.apellidos,
      ]
        .filter(Boolean)
        .join(' ')

    setMensajeCatalogoJugadores(
      `${nombreVisible} añadido al sorteo.`
    )
  } catch (error) {
    console.error(
      'Error añadiendo jugador existente:',
      error
    )

    setMensajeCatalogoJugadores(
      `Error: ${error.message}`
    )
  } finally {
    setJugadorCatalogoAñadiendo(
      null
    )
  }
}

async function guardarNuevoJugador(evento) {
  evento.preventDefault()

  if (!sorteoSeleccionado) {
    return
  }

  if (!bomboNuevoJugador) {
    setMensajeNuevoJugador(
      'Debes seleccionar un bombo.'
    )
    return
  }

  setGuardandoJugador(true)
  setMensajeNuevoJugador(
    'Guardando jugador...'
  )

  try {
    const codigo =
      codigoNuevoJugador
        .trim()
        .toUpperCase()

    /*
    ============================================================
    1. COMPROBAR SI EL JUGADOR YA EXISTE
    ============================================================
    */

    const {
      data: jugadorExistente,
      error: errorBuscar,
    } = await supabase
      .from('jugadores')
      .select(`
        id,
        codigo_jugador,
        foto_path
      `)
      .eq(
        'codigo_jugador',
        codigo
      )
      .maybeSingle()

    if (errorBuscar) {
      throw errorBuscar
    }

    if (jugadorExistente) {
      setMensajeNuevoJugador(
        'Ese código ya existe en el catálogo general. Vuelve a Jugadores y selecciónalo desde «Añadir desde catálogo».'
      )

      setGuardandoJugador(false)
      return
    }

    let jugadorId
    let fotoPath = null

    /*
    ============================================================
    2. CREAR NUEVA FICHA GLOBAL
    ============================================================
    */

    const {
      data: jugadorCreado,
      error: errorCrear,
    } = await supabase
      .from('jugadores')
      .insert([
        {
          codigo_jugador: codigo,
          nombre:
            nombreNuevoJugador.trim(),
          apellidos:
            apellidosNuevoJugador.trim() ||
            null,
          alias:
            aliasNuevoJugador.trim() ||
            null,
          activo: true,
        },
      ])
      .select('id')
      .single()

    if (errorCrear) {
      throw errorCrear
    }

    jugadorId =
      jugadorCreado.id

    /*
    ============================================================
    3. SUBIR FOTO, SI SE HA SELECCIONADO
    ============================================================
    */

    if (fotoNuevoJugador) {
      const extension =
        fotoNuevoJugador.name
          .split('.')
          .pop()
          ?.toLowerCase() || 'jpg'

      const nombreArchivo =
        `${jugadorId}/${crypto.randomUUID()}.${extension}`

      const {
        error: errorFoto,
      } = await supabase
        .storage
        .from('jugadores')
        .upload(
          nombreArchivo,
          fotoNuevoJugador,
          {
            cacheControl: '3600',
            upsert: false,
          }
        )

      if (errorFoto) {
        throw errorFoto
      }

      fotoPath =
        nombreArchivo

      const {
        error: errorActualizarFoto,
      } = await supabase
        .from('jugadores')
        .update({
          foto_path: fotoPath,
        })
        .eq(
          'id',
          jugadorId
        )

      if (errorActualizarFoto) {
        throw errorActualizarFoto
      }
    }

    /*
    ============================================================
    4. COMPROBAR SI YA PARTICIPA EN ESTE SORTEO
    ============================================================
    */

    const {
      data: participacionExistente,
      error: errorParticipacion,
    } = await supabase
      .from('participantes_sorteo')
      .select('id')
      .eq(
        'sorteo_id',
        sorteoSeleccionado.id
      )
      .eq(
        'jugador_id',
        jugadorId
      )
      .maybeSingle()

    if (errorParticipacion) {
      throw errorParticipacion
    }

    if (participacionExistente) {
      setMensajeNuevoJugador(
        'Este jugador ya participa en este sorteo.'
      )

      setGuardandoJugador(false)
      return
    }

    /*
    ============================================================
    5. AÑADIRLO AL SORTEO
    ============================================================
    */

    const {
      error: errorAñadir,
    } = await supabase
      .from('participantes_sorteo')
      .insert([
        {
          sorteo_id:
            sorteoSeleccionado.id,

          jugador_id:
            jugadorId,

          bombo_id:
            bomboNuevoJugador,

          estado:
            'incluido',
        },
      ])

    if (errorAñadir) {
      throw errorAñadir
    }

    /*
    ============================================================
    6. LIMPIAR Y VOLVER AL LISTADO
    ============================================================
    */

    setCodigoNuevoJugador('')
    setNombreNuevoJugador('')
    setApellidosNuevoJugador('')
    setAliasNuevoJugador('')
    setBomboNuevoJugador('')
    setFotoNuevoJugador(null)
    setPreviewFotoJugador('')
    setMensajeNuevoJugador('')

    await abrirJugadores()

    setPantalla('jugadores')
  } catch (error) {
    console.error(
      'Error guardando jugador:',
      error
    )

    setMensajeNuevoJugador(
      `Error: ${error.message}`
    )
  } finally {
    setGuardandoJugador(false)
  }
}


/*
============================================================
CONFIGURACIÓN DE TIEMPOS DE PRESENTACIÓN
============================================================
*/

function obtenerConfigPresentacion(origen = null) {
  const datos =
    origen ??
    (
      modoPublico
        ? presentacionPublica
        : sorteoSeleccionado
    ) ??
    {}

  return {
    retrasoPrimerJugadorMs:
      limitarNumero(
        datos.presentacion_retraso_primer_ms,
        0,
        5000,
        CONFIG_PRESENTACION.retrasoPrimerJugadorMs
      ),

    intervaloRevelacionMs:
      limitarNumero(
        datos.presentacion_intervalo_jugador_ms,
        500,
        10000,
        CONFIG_PRESENTACION.intervaloRevelacionMs
      ),

    pausaEntreEquiposRepeticionMs:
      limitarNumero(
        datos.presentacion_pausa_entre_equipos_ms,
        0,
        10000,
        CONFIG_PRESENTACION.pausaEntreEquiposRepeticionMs
      ),

    pausaAntesResumenRepeticionMs:
      limitarNumero(
        datos.presentacion_pausa_resumen_ms,
        0,
        15000,
        CONFIG_PRESENTACION.pausaAntesResumenRepeticionMs
      ),

    estiloEntrada:
      ['destello', 'giro_zoom'].includes(
        String(
          datos.presentacion_estilo_entrada ??
          'destello'
        ).toLowerCase()
      )
        ? String(
            datos.presentacion_estilo_entrada ??
            'destello'
          ).toLowerCase()
        : 'destello',

    margenBloqueoAdminMs:
      CONFIG_PRESENTACION.margenBloqueoAdminMs,
  }
}


function abrirTiemposPresentacion() {
  if (!sorteoSeleccionado) {
    return
  }

  setTiemposPresentacion(
    obtenerConfigPresentacion(
      sorteoSeleccionado
    )
  )

  setMensajeTiemposPresentacion('')
  setPantalla('tiempos-presentacion')
}


function actualizarTiempoPresentacion(
  campo,
  segundos,
  minimoMs,
  maximoMs
) {
  const milisegundos =
    limitarNumero(
      Number(segundos) * 1000,
      minimoMs,
      maximoMs,
      tiemposPresentacion[campo]
    )

  setTiemposPresentacion(
    (actual) => ({
      ...actual,
      [campo]: milisegundos,
    })
  )

  setMensajeTiemposPresentacion('')
}


async function guardarTiemposPresentacion() {
  if (!sorteoSeleccionado) {
    return
  }

  const config = {
    retrasoPrimerJugadorMs:
      limitarNumero(
        tiemposPresentacion.retrasoPrimerJugadorMs,
        0,
        5000,
        CONFIG_PRESENTACION.retrasoPrimerJugadorMs
      ),

    intervaloRevelacionMs:
      limitarNumero(
        tiemposPresentacion.intervaloRevelacionMs,
        500,
        10000,
        CONFIG_PRESENTACION.intervaloRevelacionMs
      ),

    pausaEntreEquiposRepeticionMs:
      limitarNumero(
        tiemposPresentacion.pausaEntreEquiposRepeticionMs,
        0,
        10000,
        CONFIG_PRESENTACION.pausaEntreEquiposRepeticionMs
      ),

    pausaAntesResumenRepeticionMs:
      limitarNumero(
        tiemposPresentacion.pausaAntesResumenRepeticionMs,
        0,
        15000,
        CONFIG_PRESENTACION.pausaAntesResumenRepeticionMs
      ),

    estiloEntrada:
      ['destello', 'giro_zoom'].includes(
        String(
          tiemposPresentacion.estiloEntrada ??
          'destello'
        ).toLowerCase()
      )
        ? String(
            tiemposPresentacion.estiloEntrada ??
            'destello'
          ).toLowerCase()
        : 'destello',
  }

  setGuardandoTiemposPresentacion(true)
  setMensajeTiemposPresentacion(
    'Guardando tiempos...'
  )

  try {
    const cambios = {
      presentacion_retraso_primer_ms:
        config.retrasoPrimerJugadorMs,

      presentacion_intervalo_jugador_ms:
        config.intervaloRevelacionMs,

      presentacion_pausa_entre_equipos_ms:
        config.pausaEntreEquiposRepeticionMs,

      presentacion_pausa_resumen_ms:
        config.pausaAntesResumenRepeticionMs,

      presentacion_estilo_entrada:
        config.estiloEntrada,
    }

    const {
      error,
    } = await supabase
      .from('sorteos')
      .update(cambios)
      .eq(
        'id',
        sorteoSeleccionado.id
      )

    if (error) {
      throw error
    }

    const actualizado = {
      ...sorteoSeleccionado,
      ...cambios,
    }

    setSorteoSeleccionado(
      actualizado
    )

    setSorteos(
      (actuales) =>
        actuales.map(
          (sorteo) =>
            sorteo.id === actualizado.id
              ? {
                  ...sorteo,
                  ...cambios,
                }
              : sorteo
        )
    )

    setTiemposPresentacion(
      config
    )

    setMensajeTiemposPresentacion(
      '✓ Tiempos y estilo guardados. Se aplicarán a la presentación y a las repeticiones.'
    )
  } catch (error) {
    console.error(
      'Error guardando tiempos de presentación:',
      error
    )

    setMensajeTiemposPresentacion(
      `Error: ${error.message}`
    )
  } finally {
    setGuardandoTiemposPresentacion(false)
  }
}


/*
============================================================
EMPAREJAMIENTOS
============================================================
*/

function cantidadJugadoresEquipoActual(origen = null) {
  const datos =
    origen ??
    (
      modoPublico
        ? presentacionPublica
        : sorteoSeleccionado
    )

  return Math.max(
    2,
    Number(
      datos?.jugadores_por_equipo ?? 2
    )
  )
}

function limpiarFormularioRegla() {
  const cantidad = cantidadJugadoresEquipoActual()
  setReglaEditandoId(null)
  setBombosRegla(Array(cantidad).fill(''))
  setNombreRegla('')
  setOrdenRegla(reglasEmparejamiento.length + 1)
  setActivoRegla(true)
  setMensajeReglas('')
}

async function abrirEmparejamientos() {
  if (!sorteoSeleccionado) return

  setPantalla('emparejamientos')
  setCargandoEmparejamientos(true)
  setErrorEmparejamientos('')
  setMensajeReglas('')

  try {
    const [respuestaBombos, respuestaReglas, respuestaPosiciones] =
      await Promise.all([
        supabase
          .from('bombos')
          .select('id,codigo,nombre,orden')
          .eq('sorteo_id', sorteoSeleccionado.id)
          .order('orden', { ascending: true }),
        supabase
          .from('reglas_emparejamiento')
          .select('id,sorteo_id,orden,nombre,activo,creado_en')
          .eq('sorteo_id', sorteoSeleccionado.id)
          .order('orden', { ascending: true }),
        supabase
          .from('regla_emparejamiento_bombos')
          .select('id,regla_id,bombo_id,orden_en_equipo')
          .eq('sorteo_id', sorteoSeleccionado.id)
          .order('orden_en_equipo', { ascending: true }),
      ])

    const error =
      respuestaBombos.error ||
      respuestaReglas.error ||
      respuestaPosiciones.error

    if (error) throw error

    const posiciones = respuestaPosiciones.data ?? []
    const listaReglas = (respuestaReglas.data ?? []).map((regla) => ({
      ...regla,
      bombos: posiciones
        .filter((posicion) => posicion.regla_id === regla.id)
        .sort(
          (a, b) =>
            Number(a.orden_en_equipo) -
            Number(b.orden_en_equipo)
        ),
    }))

    setBombos(respuestaBombos.data ?? [])
    setReglasEmparejamiento(listaReglas)

    if (!reglaEditandoId) {
      setBombosRegla(
        Array(cantidadJugadoresEquipoActual()).fill('')
      )
      setOrdenRegla(
        listaReglas.length > 0
          ? Math.max(...listaReglas.map((r) => Number(r.orden))) + 1
          : 1
      )
    }
  } catch (error) {
    console.error('Error cargando emparejamientos:', error)
    setErrorEmparejamientos(error.message)
  } finally {
    setCargandoEmparejamientos(false)
  }
}

function editarReglaEmparejamiento(regla) {
  const cantidad = cantidadJugadoresEquipoActual()
  const ids = (regla.bombos ?? [])
    .slice()
    .sort(
      (a, b) =>
        Number(a.orden_en_equipo) - Number(b.orden_en_equipo)
    )
    .map((posicion) => posicion.bombo_id)

  while (ids.length < cantidad) ids.push('')

  setReglaEditandoId(regla.id)
  setBombosRegla(ids.slice(0, cantidad))
  setNombreRegla(regla.nombre ?? '')
  setOrdenRegla(regla.orden)
  setActivoRegla(regla.activo)
  setMensajeReglas('')
}

async function guardarReglaEmparejamiento(evento) {
  evento.preventDefault()
  if (!sorteoSeleccionado) return

  const cantidad = cantidadJugadoresEquipoActual()
  const seleccion = Array.from(
    { length: cantidad },
    (_, indice) => bombosRegla[indice] ?? ''
  )

  if (seleccion.some((id) => !id)) {
    setMensajeReglas(
      `Debes seleccionar los ${cantidad} bombos que compondrán cada equipo.`
    )
    return
  }

  const firma = [...seleccion].sort().join('|')
  const duplicada = reglasEmparejamiento.some((regla) => {
    if (regla.id === reglaEditandoId) return false
    const firmaRegla = (regla.bombos ?? [])
      .map((posicion) => posicion.bombo_id)
      .sort()
      .join('|')
    return firmaRegla === firma
  })

  if (duplicada) {
    setMensajeReglas('Ya existe una regla con esa composición de bombos.')
    return
  }

  const nombreAutomatico = seleccion
    .map((id) => bombos.find((b) => b.id === id)?.codigo ?? '?')
    .join(' + ')

  setGuardandoRegla(true)
  setMensajeReglas(reglaEditandoId ? 'Guardando cambios...' : 'Creando regla...')

  try {
    const { error } = await supabase.rpc(
      'guardar_regla_emparejamiento_v2',
      {
        p_sorteo_id: sorteoSeleccionado.id,
        p_regla_id: reglaEditandoId,
        p_nombre: nombreRegla.trim() || nombreAutomatico,
        p_orden: Number(ordenRegla),
        p_activo: activoRegla,
        p_bombo_ids: seleccion,
      }
    )

    if (error) throw error

    const eraEdicion = Boolean(reglaEditandoId)
    setReglaEditandoId(null)
    setBombosRegla(Array(cantidad).fill(''))
    setNombreRegla('')
    setActivoRegla(true)

    await abrirEmparejamientos()
    setMensajeReglas(
      eraEdicion
        ? 'Regla actualizada correctamente.'
        : 'Regla creada correctamente.'
    )
  } catch (error) {
    console.error('Error guardando regla:', error)
    setMensajeReglas(`Error: ${error.message}`)
  } finally {
    setGuardandoRegla(false)
  }
}

async function eliminarReglaEmparejamiento(regla) {
  const confirmar = window.confirm(
    `¿Eliminar la regla "${regla.nombre}"? Los equipos fijos asociados también se eliminarán.`
  )
  if (!confirmar) return

  setErrorEmparejamientos('')
  setMensajeReglas('')

  const { error } = await supabase
    .from('reglas_emparejamiento')
    .delete()
    .eq('id', regla.id)
    .eq('sorteo_id', sorteoSeleccionado.id)

  if (error) {
    setErrorEmparejamientos(error.message)
    return
  }

  if (reglaEditandoId === regla.id) limpiarFormularioRegla()
  await abrirEmparejamientos()
  setMensajeReglas('Regla eliminada correctamente.')
}


/*
============================================================
EQUIPOS FIJOS
============================================================
*/

function reiniciarConstructorEquipoFijo() {
  setReglaEquipoFijoId('')
  setParticipantesEquipoFijo([])
  setBusquedasEquipoFijo([])
}

async function abrirEquiposFijos() {
  if (!sorteoSeleccionado) return

  setPantalla('equipos-fijos')
  setCargandoEquiposFijos(true)
  setErrorEquiposFijos('')
  setMensajeEquiposFijos('')
  reiniciarConstructorEquipoFijo()

  try {
    const [
      respuestaParticipantes,
      respuestaBombos,
      respuestaReglas,
      respuestaPosiciones,
      respuestaEquipos,
      respuestaMiembros,
    ] = await Promise.all([
      supabase
        .from('participantes_sorteo')
        .select('id,jugador_id,bombo_id,estado')
        .eq('sorteo_id', sorteoSeleccionado.id),
      supabase
        .from('bombos')
        .select('id,codigo,nombre,orden')
        .eq('sorteo_id', sorteoSeleccionado.id)
        .order('orden', { ascending: true }),
      supabase
        .from('reglas_emparejamiento')
        .select('id,nombre,orden,activo')
        .eq('sorteo_id', sorteoSeleccionado.id)
        .eq('activo', true)
        .order('orden', { ascending: true }),
      supabase
        .from('regla_emparejamiento_bombos')
        .select('id,regla_id,bombo_id,orden_en_equipo')
        .eq('sorteo_id', sorteoSeleccionado.id)
        .order('orden_en_equipo', { ascending: true }),
      supabase
        .from('equipos_fijos')
        .select('id,sorteo_id,regla_id,creado_en')
        .eq('sorteo_id', sorteoSeleccionado.id)
        .order('creado_en', { ascending: true }),
      supabase
        .from('miembros_equipo_fijo')
        .select('id,equipo_fijo_id,participante_id,orden_en_equipo')
        .eq('sorteo_id', sorteoSeleccionado.id)
        .order('orden_en_equipo', { ascending: true }),
    ])

    const errorCarga =
      respuestaParticipantes.error || respuestaBombos.error ||
      respuestaReglas.error || respuestaPosiciones.error ||
      respuestaEquipos.error || respuestaMiembros.error
    if (errorCarga) throw errorCarga

    const listaParticipantes = respuestaParticipantes.data ?? []
    const posiciones = respuestaPosiciones.data ?? []
    const reglasConBombos = (respuestaReglas.data ?? []).map((regla) => ({
      ...regla,
      bombos: posiciones
        .filter((p) => p.regla_id === regla.id)
        .sort((a, b) => Number(a.orden_en_equipo) - Number(b.orden_en_equipo)),
    }))

    setParticipantes(listaParticipantes)
    setBombos(respuestaBombos.data ?? [])
    setReglasEquiposFijos(reglasConBombos)
    setEquiposFijos(respuestaEquipos.data ?? [])
    setMiembrosEquiposFijos(respuestaMiembros.data ?? [])

    const idsJugadores = [...new Set(listaParticipantes.map((p) => p.jugador_id))]
    if (idsJugadores.length === 0) {
      setJugadores([])
    } else {
      const { data, error } = await supabase
        .from('jugadores')
        .select('id,codigo_jugador,nombre,apellidos,alias,foto_path,activo')
        .in('id', idsJugadores)
      if (error) throw error
      setJugadores(data ?? [])
    }
  } catch (error) {
    console.error('Error cargando equipos fijos:', error)
    setErrorEquiposFijos(error.message)
  } finally {
    setCargandoEquiposFijos(false)
  }
}

async function crearEquipoFijo(evento) {
  evento.preventDefault()
  if (!sorteoSeleccionado || !reglaEquipoFijoId) {
    setMensajeEquiposFijos('Selecciona primero una regla de composición.')
    return
  }

  const regla = reglasEquiposFijos.find((r) => r.id === reglaEquipoFijoId)
  const cantidad = regla?.bombos?.length ?? 0
  const seleccion = participantesEquipoFijo.slice(0, cantidad)

  if (cantidad === 0 || seleccion.length !== cantidad || seleccion.some((id) => !id)) {
    setMensajeEquiposFijos(`Selecciona los ${cantidad || cantidadJugadoresEquipoActual()} jugadores del equipo fijo.`)
    return
  }

  if (new Set(seleccion).size !== seleccion.length) {
    setMensajeEquiposFijos('Un mismo jugador no puede ocupar dos posiciones.')
    return
  }

  setGuardandoEquipoFijo(true)
  setMensajeEquiposFijos('Guardando equipo fijo...')

  try {
    const { error } = await supabase.rpc('crear_equipo_fijo_v2', {
      p_sorteo_id: sorteoSeleccionado.id,
      p_regla_id: reglaEquipoFijoId,
      p_participante_ids: seleccion,
    })
    if (error) throw error
    await abrirEquiposFijos()
    setMensajeEquiposFijos('Equipo fijo creado correctamente. Sus integrantes ya no entrarán en la mezcla aleatoria.')
  } catch (error) {
    console.error('Error creando equipo fijo:', error)
    setMensajeEquiposFijos(`Error: ${error.message}`)
  } finally {
    setGuardandoEquipoFijo(false)
  }
}

async function confirmarEliminarEquipoFijo() {
  if (!equipoFijoPendienteEliminar) return
  setEliminandoEquipoFijo(true)
  setMensajeEquiposFijos('')
  try {
    const { error } = await supabase.rpc('eliminar_equipo_fijo', {
      p_equipo_fijo_id: equipoFijoPendienteEliminar.id,
    })
    if (error) throw error
    setEquipoFijoPendienteEliminar(null)
    await abrirEquiposFijos()
    setMensajeEquiposFijos('Equipo fijo eliminado. Sus jugadores volverán a entrar en la mezcla aleatoria.')
  } catch (error) {
    console.error('Error eliminando equipo fijo:', error)
    setMensajeEquiposFijos(`Error: ${error.message}`)
  } finally {
    setEliminandoEquipoFijo(false)
  }
}


/*
============================================================
GRUPOS
============================================================
*/

function obtenerSiguienteOrdenGrupo(lista = grupos) {
  if (!lista.length) {
    return 1
  }

  return Math.max(
    ...lista.map((grupo) => Number(grupo.orden) || 0)
  ) + 1
}

function limpiarFormularioGrupo(lista = grupos) {
  setGrupoEditandoId(null)
  setCodigoGrupo('')
  setNombreGrupo('')
  setOrdenGrupo(obtenerSiguienteOrdenGrupo(lista))
  setDescripcionGrupo('')
  setActivoGrupo(true)
  setMensajeGrupos('')
}

async function abrirGrupos() {
  if (!sorteoSeleccionado) {
    return
  }

  if (
    String(
      sorteoSeleccionado.formato_sorteo ?? 'grupos'
    ).toLowerCase() === 'liga_unica'
  ) {
    return
  }

  setPantalla('grupos')
  setCargandoGrupos(true)
  setErrorGrupos('')
  setMensajeGrupos('')

  setDistribucionGrupos(
    String(
      sorteoSeleccionado.distribucion_grupos ??
      'equilibrada'
    ).toLowerCase()
  )

  const { data, error } = await supabase
    .from('grupos')
    .select(`
      id,
      sorteo_id,
      codigo,
      nombre,
      orden,
      descripcion,
      activo,
      creado_en
    `)
    .eq('sorteo_id', sorteoSeleccionado.id)
    .order('orden', { ascending: true })

  if (error) {
    console.error('Error cargando grupos:', error)
    setErrorGrupos(error.message)
    setCargandoGrupos(false)
    return
  }

  const listaGrupos = data ?? []

  setGrupos(listaGrupos)

  setOrdenGrupo(
    obtenerSiguienteOrdenGrupo(listaGrupos)
  )

  setCargandoGrupos(false)
}


async function guardarDistribucionGrupos() {
  if (!sorteoSeleccionado) {
    return
  }

  const valor =
    String(distribucionGrupos).toLowerCase()

  if (
    !['aleatoria', 'equilibrada'].includes(valor)
  ) {
    setMensajeGrupos(
      'Selecciona un modo de reparto válido.'
    )
    return
  }

  setGuardandoDistribucionGrupos(true)
  setMensajeGrupos(
    'Guardando modo de reparto...'
  )

  const { error } = await supabase
    .from('sorteos')
    .update({
      distribucion_grupos: valor,
    })
    .eq('id', sorteoSeleccionado.id)

  if (error) {
    console.error(
      'Error guardando distribución de grupos:',
      error
    )

    setMensajeGrupos(
      `Error: ${error.message}`
    )

    setGuardandoDistribucionGrupos(false)
    return
  }

  const sorteoActualizado = {
    ...sorteoSeleccionado,
    distribucion_grupos: valor,
  }

  setSorteoSeleccionado(
    sorteoActualizado
  )

  setSorteos(
    (actuales) =>
      actuales.map(
        (sorteo) =>
          sorteo.id === sorteoSeleccionado.id
            ? sorteoActualizado
            : sorteo
      )
  )

  setMensajeGrupos(
    valor === 'equilibrada'
      ? 'Reparto equilibrado guardado. Se aplicará en la próxima generación.'
      : 'Reparto aleatorio guardado. Se aplicará en la próxima generación.'
  )

  setGuardandoDistribucionGrupos(false)
}


async function crearGruposAutomaticos() {
  if (!sorteoSeleccionado) {
    return
  }

  const objetivo = Number(
    sorteoSeleccionado.numero_grupos
  )

  if (!objetivo || objetivo < 1) {
    setMensajeGrupos(
      'El sorteo no tiene un número de grupos válido.'
    )
    return
  }

  const cantidadFaltante = objetivo - grupos.length

  if (cantidadFaltante <= 0) {
    setMensajeGrupos(
      grupos.length === objetivo
        ? 'Ya están creados todos los grupos previstos.'
        : `Hay ${grupos.length} grupos creados y el sorteo está configurado para ${objetivo}.`
    )
    return
  }

  setCreandoGruposAutomaticos(true)
  setMensajeGrupos('Creando grupos...')
  setErrorGrupos('')

  const codigosUsados = new Set(
    grupos.map((grupo) =>
      grupo.codigo.toUpperCase()
    )
  )

  const ordenesUsados = new Set(
    grupos.map((grupo) => Number(grupo.orden))
  )

  const gruposPendientes = []
  let indiceCodigo = 1
  let ordenDisponible = 1

  for (let i = 0; i < cantidadFaltante; i += 1) {
    while (
      codigosUsados.has(`G${indiceCodigo}`)
    ) {
      indiceCodigo += 1
    }

    while (
      ordenesUsados.has(ordenDisponible)
    ) {
      ordenDisponible += 1
    }

    const codigo = `G${indiceCodigo}`

    gruposPendientes.push({
      sorteo_id: sorteoSeleccionado.id,
      codigo,
      nombre: `Grupo ${indiceCodigo}`,
      orden: ordenDisponible,
      descripcion: null,
      activo: true,
    })

    codigosUsados.add(codigo)
    ordenesUsados.add(ordenDisponible)
    indiceCodigo += 1
    ordenDisponible += 1
  }

  const { error } = await supabase
    .from('grupos')
    .insert(gruposPendientes)

  if (error) {
    console.error(
      'Error creando grupos automáticamente:',
      error
    )

    setMensajeGrupos(
      `Error: ${error.message}`
    )
    setCreandoGruposAutomaticos(false)
    return
  }

  await abrirGrupos()

  setMensajeGrupos(
    gruposPendientes.length === 1
      ? 'Grupo creado correctamente.'
      : `${gruposPendientes.length} grupos creados correctamente.`
  )

  setCreandoGruposAutomaticos(false)
}

function editarGrupo(grupo) {
  setGrupoEditandoId(grupo.id)
  setCodigoGrupo(grupo.codigo ?? '')
  setNombreGrupo(grupo.nombre ?? '')
  setOrdenGrupo(grupo.orden ?? 1)
  setDescripcionGrupo(grupo.descripcion ?? '')
  setActivoGrupo(grupo.activo)
  setMensajeGrupos('')

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

async function guardarGrupo(evento) {
  evento.preventDefault()

  if (!sorteoSeleccionado) {
    return
  }

  const codigo = codigoGrupo.trim().toUpperCase()
  const nombre = nombreGrupo.trim()
  const orden = Number(ordenGrupo)

  if (!codigo || !nombre) {
    setMensajeGrupos(
      'Código y nombre son obligatorios.'
    )
    return
  }

  const codigoDuplicado = grupos.some(
    (grupo) =>
      grupo.id !== grupoEditandoId &&
      grupo.codigo.toUpperCase() === codigo
  )

  if (codigoDuplicado) {
    setMensajeGrupos(
      `Ya existe un grupo con el código ${codigo}.`
    )
    return
  }

  const ordenDuplicado = grupos.some(
    (grupo) =>
      grupo.id !== grupoEditandoId &&
      Number(grupo.orden) === orden
  )

  if (ordenDuplicado) {
    setMensajeGrupos(
      `Ya existe un grupo con el orden ${orden}.`
    )
    return
  }

  const datosGrupo = {
    sorteo_id: sorteoSeleccionado.id,
    codigo,
    nombre,
    orden,
    descripcion:
      descripcionGrupo.trim() || null,
    activo: activoGrupo,
  }

  const estabaEditando = Boolean(grupoEditandoId)

  setGuardandoGrupo(true)
  setMensajeGrupos(
    estabaEditando
      ? 'Guardando cambios...'
      : 'Creando grupo...'
  )

  let error

  if (estabaEditando) {
    const resultado = await supabase
      .from('grupos')
      .update(datosGrupo)
      .eq('id', grupoEditandoId)
      .eq('sorteo_id', sorteoSeleccionado.id)

    error = resultado.error
  } else {
    const resultado = await supabase
      .from('grupos')
      .insert([datosGrupo])

    error = resultado.error
  }

  if (error) {
    console.error('Error guardando grupo:', error)
    setMensajeGrupos(`Error: ${error.message}`)
    setGuardandoGrupo(false)
    return
  }

  setGrupoEditandoId(null)
  setCodigoGrupo('')
  setNombreGrupo('')
  setDescripcionGrupo('')
  setActivoGrupo(true)

  await abrirGrupos()

  setMensajeGrupos(
    estabaEditando
      ? 'Grupo actualizado correctamente.'
      : 'Grupo creado correctamente.'
  )

  setGuardandoGrupo(false)
}

async function eliminarGrupo(grupo) {
  const confirmar = window.confirm(
    `¿Eliminar "${grupo.nombre}"?\n\n` +
    'Si el sorteo ya utiliza este grupo en una ejecución, la base de datos puede impedir su eliminación para proteger los resultados.'
  )

  if (!confirmar) {
    return
  }

  setErrorGrupos('')
  setMensajeGrupos('')

  const { error } = await supabase
    .from('grupos')
    .delete()
    .eq('id', grupo.id)
    .eq('sorteo_id', sorteoSeleccionado.id)

  if (error) {
    console.error('Error eliminando grupo:', error)
    setErrorGrupos(error.message)
    return
  }

  if (grupoEditandoId === grupo.id) {
    setGrupoEditandoId(null)
    setCodigoGrupo('')
    setNombreGrupo('')
    setDescripcionGrupo('')
    setActivoGrupo(true)
  }

  await abrirGrupos()
  setMensajeGrupos('Grupo eliminado correctamente.')
}


/*
============================================================
PREPARAR / VALIDAR SORTEO
============================================================
*/

function nivelValidacionClase(nivel) {
  const valor = String(nivel ?? '').toUpperCase()

  if (valor === 'ERROR') {
    return 'error'
  }

  if (
    valor === 'AVISO' ||
    valor === 'WARNING' ||
    valor === 'WARN'
  ) {
    return 'aviso'
  }

  return 'ok'
}

function hayErroresDeValidacion(lista = validacionesSorteo) {
  return lista.some(
    (item) =>
      String(item.nivel ?? '').toUpperCase() === 'ERROR'
  )
}

async function validarSorteo() {
  if (!sorteoSeleccionado) {
    return
  }

  setCargandoValidacion(true)
  setErrorValidacion('')
  setMensajeGeneracion('')
  setEjecucionGenerada(null)

  try {
    /*
    La función de Supabase es la autoridad:
    si devuelve alguna fila con nivel ERROR,
    no permitimos generar el sorteo.
    */
    const {
      data: datosValidacion,
      error: errorRpc,
    } = await supabase.rpc(
      'validar_configuracion_sorteo',
      {
        p_sorteo_id: sorteoSeleccionado.id,
      }
    )

    if (errorRpc) {
      throw errorRpc
    }

    const listaValidaciones =
      Array.isArray(datosValidacion)
        ? datosValidacion
        : datosValidacion
          ? [datosValidacion]
          : []

    setValidacionesSorteo(listaValidaciones)

    /*
    Contadores informativos. La decisión final de si el
    sorteo está preparado la toma validar_configuracion_sorteo().
    */
    const [
      resultadoBombos,
      resultadoJugadores,
      resultadoReglas,
      resultadoGrupos,
      resultadoEquiposFijos,
    ] = await Promise.all([
      supabase
        .from('bombos')
        .select('id')
        .eq('sorteo_id', sorteoSeleccionado.id),

      supabase
        .from('participantes_sorteo')
        .select('id')
        .eq('sorteo_id', sorteoSeleccionado.id)
        .eq('estado', 'incluido'),

      supabase
        .from('reglas_emparejamiento')
        .select('id')
        .eq('sorteo_id', sorteoSeleccionado.id)
        .eq('activo', true),

      supabase
        .from('grupos')
        .select('id')
        .eq('sorteo_id', sorteoSeleccionado.id)
        .eq('activo', true),

      supabase
        .from('equipos_fijos')
        .select('id')
        .eq('sorteo_id', sorteoSeleccionado.id),
    ])

    const errorResumen =
      resultadoBombos.error ||
      resultadoJugadores.error ||
      resultadoReglas.error ||
      resultadoGrupos.error ||
      resultadoEquiposFijos.error

    if (errorResumen) {
      console.warn(
        'No se pudo completar el resumen de preparación:',
        errorResumen
      )
    }

    setResumenPreparacion({
      bombos:
        resultadoBombos.data?.length ?? 0,
      jugadores:
        resultadoJugadores.data?.length ?? 0,
      reglas:
        resultadoReglas.data?.length ?? 0,
      grupos:
        resultadoGrupos.data?.length ?? 0,
      equiposFijos:
        resultadoEquiposFijos.data?.length ?? 0,
    })
  } catch (error) {
    console.error(
      'Error validando la configuración:',
      error
    )

    setValidacionesSorteo([])
    setErrorValidacion(error.message)
  } finally {
    setCargandoValidacion(false)
  }
}


async function cargarEjecucionOficialSorteo() {
  if (!sorteoSeleccionado) {
    setEjecucionOficialSorteo(null)
    return null
  }

  const { data, error } = await supabase
    .from('ejecuciones_sorteo')
    .select(`
      id,
      sorteo_id,
      numero_ejecucion,
      estado,
      es_oficial
    `)
    .eq('sorteo_id', sorteoSeleccionado.id)
    .eq('es_oficial', true)
    .maybeSingle()

  if (error) {
    throw error
  }

  setEjecucionOficialSorteo(data ?? null)
  return data ?? null
}


async function refrescarPreparacionSorteo() {
  setMensajeOficialidad('')

  try {
    await Promise.all([
      validarSorteo(),
      cargarEjecucionOficialSorteo(),
    ])
  } catch (error) {
    console.error(
      'Error comprobando ejecución oficial:',
      error
    )
    setMensajeOficialidad(
      `Error: ${error.message}`
    )
  }
}


function solicitarCambioOficialidad(tipo, ejecucion) {
  if (!ejecucion) {
    return
  }

  const id =
    ejecucion.id ??
    ejecucion.ejecucion_id

  const numero =
    ejecucion.numero ??
    ejecucion.numero_ejecucion ??
    '—'

  if (!id) {
    return
  }

  setMensajeOficialidad('')
  setConfirmacionOficialidad({
    tipo,
    id,
    numero,
  })
}


async function confirmarCambioOficialidad() {
  if (!confirmacionOficialidad) {
    return
  }

  const { tipo, id, numero } =
    confirmacionOficialidad

  setAccionOficialidad(true)
  setMensajeOficialidad('')

  try {
    const funcion =
      tipo === 'marcar'
        ? 'marcar_ejecucion_oficial'
        : 'quitar_oficialidad_ejecucion'

    const { error } = await supabase.rpc(
      funcion,
      {
        p_ejecucion_id: id,
      }
    )

    if (error) {
      throw error
    }

    const esOficial =
      tipo === 'marcar'

    setEjecucionResultado((actual) =>
      actual?.id === id
        ? {
            ...actual,
            oficial: esOficial,
          }
        : actual
    )

    setEstadoPresentacion((actual) =>
      actual?.ejecucion_id === id
        ? {
            ...actual,
            es_oficial: esOficial,
          }
        : actual
    )

    setEquiposResultado((actuales) =>
      actuales.map((equipo) =>
        equipo.ejecucion_id === id
          ? {
              ...equipo,
              es_oficial: esOficial,
            }
          : equipo
      )
    )

    if (esOficial) {
      setEjecucionOficialSorteo({
        id,
        sorteo_id:
          sorteoSeleccionado?.id,
        numero_ejecucion: numero,
        es_oficial: true,
      })

      setMensajeOficialidad(
        `🏆 La ejecución ${numero} ya es OFICIAL. Mientras conserve la oficialidad no se podrán generar nuevas combinaciones.`
      )
    } else {
      setEjecucionOficialSorteo(null)

      setMensajeOficialidad(
        `La ejecución ${numero} ha dejado de ser oficial. Ya puedes generar una nueva combinación si lo necesitas.`
      )
    }

    setConfirmacionOficialidad(null)
    await cargarEjecucionOficialSorteo()
  } catch (error) {
    console.error(
      'Error cambiando oficialidad:',
      error
    )
    setMensajeOficialidad(
      `Error: ${error.message}`
    )
  } finally {
    setAccionOficialidad(false)
  }
}


function renderModalOficialidad() {
  if (!confirmacionOficialidad) {
    return null
  }

  const esMarcar =
    confirmacionOficialidad.tipo === 'marcar'

  return (
    <div
      className="modal-fondo"
      onClick={() => {
        if (!accionOficialidad) {
          setConfirmacionOficialidad(null)
        }
      }}
    >
      <div
        className="modal-confirmacion modal-oficialidad"
        role="dialog"
        aria-modal="true"
        onClick={(evento) =>
          evento.stopPropagation()
        }
      >
        <div className="modal-icono">
          {esMarcar ? '🏆' : '🔓'}
        </div>

        <h3>
          {esMarcar
            ? '¿Marcar esta ejecución como OFICIAL?'
            : '¿Quitar la oficialidad?'}
        </h3>

        <p>
          {esMarcar
            ? `La ejecución ${confirmacionOficialidad.numero} quedará protegida como resultado definitivo. Mientras sea oficial no se podrá generar otra combinación para este sorteo.`
            : `La ejecución ${confirmacionOficialidad.numero} conservará exactamente sus equipos, pero dejará de estar protegida como oficial y volverás a poder generar otras combinaciones.`}
        </p>

        {esMarcar && (
          <div className="aviso-modal-oficial">
            Esta acción no cambia ningún equipo. Solo declara esta
            combinación como la válida y la protege frente a cambios
            accidentales.
          </div>
        )}

        <div className="modal-acciones">
          <button
            type="button"
            className="boton boton-secundario"
            disabled={accionOficialidad}
            onClick={() =>
              setConfirmacionOficialidad(null)
            }
          >
            Cancelar
          </button>

          <button
            type="button"
            className={
              esMarcar
                ? 'boton boton-principal'
                : 'boton boton-peligro-suave'
            }
            disabled={accionOficialidad}
            onClick={confirmarCambioOficialidad}
          >
            {accionOficialidad
              ? 'Guardando...'
              : esMarcar
                ? '🏆 Sí, hacer oficial'
                : '🔓 Quitar oficialidad'}
          </button>
        </div>
      </div>
    </div>
  )
}


async function abrirPrepararSorteo() {
  if (!sorteoSeleccionado) {
    return
  }

  setMostrarConfirmacionGenerar(false)
  setMensajeOficialidad('')
  setPantalla('preparar-sorteo')
  await refrescarPreparacionSorteo()
}

function generarSorteo() {
  if (!sorteoSeleccionado) {
    return
  }

  if (ejecucionOficialSorteo) {
    setMensajeGeneracion(
      `La ejecución ${ejecucionOficialSorteo.numero_ejecucion} es OFICIAL. Quita primero su oficialidad si realmente necesitas generar otra combinación.`
    )
    return
  }

  if (hayErroresDeValidacion()) {
    setMensajeGeneracion(
      'No se puede generar el sorteo mientras existan errores de configuración.'
    )
    return
  }

  setMostrarConfirmacionGenerar(true)
}

async function confirmarGeneracionSorteo() {
  if (!sorteoSeleccionado) {
    return
  }

  setMostrarConfirmacionGenerar(false)
  setGenerandoSorteo(true)
  setMensajeGeneracion('Generando sorteo...')
  setEjecucionGenerada(null)

  // Evitamos mostrar datos de una ejecución anterior.
  setEquiposResultado([])
  setEjecucionResultado(null)
  setFotosResultado({})
  setErrorResultado('')

  // Una ejecución nueva no debe heredar el estado visual de la anterior.
  setEstadoPresentacion(null)
  setEquiposReveladosControl([])
  setFotosControlPresentacion({})
  setErrorControlPresentacion('')
  setMensajePresentacion('')
  setResumenFinalEnviado(false)
  setRepeticionEnCursoControl(false)

  try {
    const oficialActual =
      await cargarEjecucionOficialSorteo()

    if (oficialActual) {
      setMensajeGeneracion(
        `La ejecución ${oficialActual.numero_ejecucion} es OFICIAL. No se ha generado ninguna combinación nueva.`
      )
      return
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      'generar_sorteo_aleatorio',
      {
        p_sorteo_id:
          sorteoSeleccionado.id,
      }
    )

    if (error) {
      throw error
    }

    setEjecucionGenerada(data)

    setMensajeGeneracion(
      'Sorteo generado correctamente. La ejecución ya está guardada en Supabase.'
    )
  } catch (error) {
    console.error(
      'Error generando el sorteo:',
      error
    )

    setMensajeGeneracion(
      `Error: ${error.message}`
    )
  } finally {
    setGenerandoSorteo(false)
  }
}

/*
============================================================
RESULTADO GENERADO
============================================================
*/

function obtenerIniciales(nombre) {
  const partes = String(nombre ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (partes.length === 0) {
    return '?'
  }

  return partes
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('')
}

async function abrirResultadoGenerado() {
  if (!sorteoSeleccionado) {
    return
  }

  setPantalla('resultado-sorteo')
  setCargandoResultado(true)
  setErrorResultado('')
  setEquiposResultado([])
  setEjecucionResultado(null)
  setFotosResultado({})
  setAuditoriaResultado(null)

  try {
    /*
    1. Si existe una ejecución OFICIAL, esa tiene prioridad.
       Si no existe, usamos la ejecución más reciente.
    */
    const {
      data: ejecucionPreferida,
      error: errorEjecucionPreferida,
    } = await supabase
      .from('ejecuciones_sorteo')
      .select(`
        id,
        numero_ejecucion,
        es_oficial,
        huella_resultado,
        huella_generada_en
      `)
      .eq(
        'sorteo_id',
        sorteoSeleccionado.id
      )
      .order(
        'es_oficial',
        { ascending: false }
      )
      .order(
        'numero_ejecucion',
        { ascending: false }
      )
      .limit(1)
      .maybeSingle()

    if (errorEjecucionPreferida) {
      throw errorEjecucionPreferida
    }

    if (!ejecucionPreferida) {
      setErrorResultado(
        'Todavía no hay ninguna ejecución generada para este sorteo.'
      )
      setCargandoResultado(false)
      return
    }

    setEjecucionOficialSorteo(
      ejecucionPreferida.es_oficial
        ? {
            ...ejecucionPreferida,
            sorteo_id:
              sorteoSeleccionado.id,
          }
        : null
    )

    /*
    2. Cargamos todos los equipos de esa ejecución.
    */
    const {
      data: datosEquipos,
      error: errorEquipos,
    } = await supabase
      .from('v_equipos_sorteados')
      .select(`
        sorteo_id,
        sorteo,
        ejecucion_id,
        numero_ejecucion,
        es_oficial,
        equipo_id,
        numero_equipo,
        orden_revelacion,
        regla,
        codigo_grupo,
        grupo,
        miembros,
        nombre_equipo,
        estado_revelacion,
        creado_en,
        revelado_en
      `)
      .eq(
        'ejecucion_id',
        ejecucionPreferida.id
      )
      .order(
        'orden_revelacion',
        { ascending: true }
      )

    if (errorEquipos) {
      throw errorEquipos
    }

    const listaEquipos =
      datosEquipos ?? []

    setEquiposResultado(listaEquipos)

    setEjecucionResultado({
      id: ejecucionPreferida.id,
      numero:
        ejecucionPreferida.numero_ejecucion,
      oficial:
        ejecucionPreferida.es_oficial,
      huella:
        ejecucionPreferida.huella_resultado ??
        null,
      huellaGeneradaEn:
        ejecucionPreferida.huella_generada_en ??
        null,
    })

    const {
      data: auditoria,
      error: errorAuditoria,
    } = await supabase.rpc(
      'verificar_huella_ejecucion',
      {
        p_ejecucion_id:
          ejecucionPreferida.id,
      }
    )

    if (errorAuditoria) {
      console.warn(
        'No se pudo verificar la huella:',
        errorAuditoria
      )

      setAuditoriaResultado(null)
    } else {
      setAuditoriaResultado(
        auditoria ?? null
      )
    }

    /*
    3. La vista no contiene foto_path.
    Cargamos las fotos mediante el código de jugador.
    */
    const codigosJugadores = [
      ...new Set(
        listaEquipos
          .flatMap((equipo) =>
            obtenerMiembrosEquipoPublico(equipo).map(
              (miembro) => miembro.codigo_jugador
            )
          )
          .filter(Boolean)
      ),
    ]

    if (codigosJugadores.length > 0) {
      const {
        data: datosFotos,
        error: errorFotos,
      } = await supabase
        .from('jugadores')
        .select(`
          codigo_jugador,
          foto_path
        `)
        .in(
          'codigo_jugador',
          codigosJugadores
        )

      if (errorFotos) {
        console.warn(
          'No se pudieron cargar las fotos del resultado:',
          errorFotos
        )
      } else {
        const mapaFotos = {}

        for (const jugador of datosFotos ?? []) {
          mapaFotos[jugador.codigo_jugador] =
            jugador.foto_path ?? null
        }

        setFotosResultado(mapaFotos)
      }
    }
  } catch (error) {
    console.error(
      'Error cargando el resultado generado:',
      error
    )

    setErrorResultado(error.message)
  } finally {
    setCargandoResultado(false)
  }
}


/*
============================================================
CONTROL DE PRESENTACIÓN
============================================================
*/

async function obtenerUltimaEjecucionDelSorteo() {
  if (!sorteoSeleccionado) {
    return null
  }

  /*
  Si existe una ejecución oficial, Control de presentación
  la prioriza. Sin oficial, utiliza la más reciente.
  */
  const { data, error } = await supabase
    .from('ejecuciones_sorteo')
    .select(`
      id,
      numero_ejecucion,
      es_oficial
    `)
    .eq(
      'sorteo_id',
      sorteoSeleccionado.id
    )
    .order(
      'es_oficial',
      { ascending: false }
    )
    .order(
      'numero_ejecucion',
      { ascending: false }
    )
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  if (data.es_oficial) {
    setEjecucionOficialSorteo({
      ...data,
      sorteo_id:
        sorteoSeleccionado.id,
    })
  }

  return {
    ejecucion_id: data.id,
    numero_ejecucion:
      data.numero_ejecucion,
    es_oficial:
      data.es_oficial,
  }
}

async function cargarFotosControlPresentacion(equipos) {
  const codigos = [
    ...new Set(
      (equipos ?? [])
        .flatMap((equipo) =>
          obtenerMiembrosEquipoPublico(equipo).map(
            (miembro) => miembro.codigo_jugador
          )
        )
        .filter(Boolean)
    ),
  ]

  if (codigos.length === 0) {
    setFotosControlPresentacion({})
    return
  }

  const {
    data,
    error,
  } = await supabase
    .from('jugadores')
    .select(`
      codigo_jugador,
      foto_path
    `)
    .in(
      'codigo_jugador',
      codigos
    )

  if (error) {
    console.warn(
      'No se pudieron cargar las fotos del control:',
      error
    )

    setFotosControlPresentacion({})
    return
  }

  const mapa = {}

  for (const jugador of data ?? []) {
    mapa[jugador.codigo_jugador] =
      jugador.foto_path ?? null
  }

  setFotosControlPresentacion(mapa)
}


function sincronizarEstadoLocalSorteoDesdePresentacion(estado) {
  if (!sorteoSeleccionado || !estado) {
    return
  }

  const estadoEjecucion =
    String(estado.estado ?? '')
      .toLowerCase()

  let nuevoEstadoSorteo = null

  if (estadoEjecucion === 'en_curso') {
    nuevoEstadoSorteo = 'en_curso'
  }

  if (estadoEjecucion === 'finalizada') {
    nuevoEstadoSorteo = 'finalizado'
  }

  if (!nuevoEstadoSorteo) {
    return
  }

  /*
  Supabase se actualiza mediante el trigger SQL.
  Aquí actualizamos también el estado de React para que,
  al volver al sorteo, no siga apareciendo el valor antiguo.
  */
  setSorteoSeleccionado(
    (actual) =>
      actual
        ? {
            ...actual,
            estado: nuevoEstadoSorteo,
          }
        : actual
  )

  setSorteos(
    (actuales) =>
      actuales.map(
        (sorteo) =>
          sorteo.id === sorteoSeleccionado.id
            ? {
                ...sorteo,
                estado: nuevoEstadoSorteo,
              }
            : sorteo
      )
  )
}


async function cargarEstadoControlPresentacion(
  ejecucionIdForzada = null
) {
  if (!sorteoSeleccionado) {
    return
  }

  setCargandoControlPresentacion(true)
  setErrorControlPresentacion('')

  try {
    /*
    Nunca reutilizamos estadoPresentacion ni ejecucionResultado como
    fallback. Esos estados pueden pertenecer al sorteo que se gestionó
    anteriormente. Si no se fuerza una ejecución concreta, buscamos
    SIEMPRE la última ejecución del sorteo actualmente seleccionado.
    */
    let ejecucionId =
      ejecucionIdForzada || null

    if (ejecucionId) {
      /*
      Protección extra: una ejecución forzada solo es válida si realmente
      pertenece al sorteo que estamos gestionando.
      */
      const {
        data: ejecucionValida,
        error: errorEjecucionValida,
      } = await supabase
        .from('ejecuciones_sorteo')
        .select(`
          id,
          sorteo_id
        `)
        .eq('id', ejecucionId)
        .eq('sorteo_id', sorteoSeleccionado.id)
        .maybeSingle()

      if (errorEjecucionValida) {
        throw errorEjecucionValida
      }

      if (!ejecucionValida) {
        throw new Error(
          'La ejecución seleccionada no pertenece a este sorteo.'
        )
      }
    } else {
      const ultimaEjecucion =
        await obtenerUltimaEjecucionDelSorteo()

      if (!ultimaEjecucion) {
        setEstadoPresentacion(null)
        setEquiposReveladosControl([])
        setErrorControlPresentacion(
          'Todavía no hay una ejecución generada para este sorteo.'
        )
        setCargandoControlPresentacion(false)
        return
      }

      ejecucionId =
        ultimaEjecucion.ejecucion_id
    }

    /*
    Esta función permite reconstruir el estado real desde
    Supabase aunque salgamos y volvamos a entrar en la pantalla.
    */
    const {
      data: estado,
      error: errorEstado,
    } = await supabase.rpc(
      'obtener_estado_presentacion',
      {
        p_ejecucion_id: ejecucionId,
      }
    )

    if (errorEstado) {
      throw errorEstado
    }

    setEstadoPresentacion(estado)
    sincronizarEstadoLocalSorteoDesdePresentacion(
      estado
    )

    /*
    La función de estado solo expone equipos ya revelados.
    Para el panel de administración los cargamos desde la vista
    y así podemos mostrar nombres, bombos, grupo y fotos.
    */
    const {
      data: revelados,
      error: errorRevelados,
    } = await supabase
      .from('v_equipos_sorteados')
      .select(`
        equipo_id,
        numero_equipo,
        orden_revelacion,
        regla,
        codigo_grupo,
        grupo,
        miembros,
        nombre_equipo,
        estado_revelacion,
        revelado_en
      `)
      .eq(
        'ejecucion_id',
        ejecucionId
      )
      .eq(
        'estado_revelacion',
        'revelado'
      )
      .order(
        'orden_revelacion',
        { ascending: true }
      )

    if (errorRevelados) {
      throw errorRevelados
    }

    const listaRevelados =
      revelados ?? []

    setEquiposReveladosControl(
      listaRevelados
    )

    await cargarFotosControlPresentacion(
      listaRevelados
    )
  } catch (error) {
    console.error(
      'Error cargando el estado de la presentación:',
      error
    )

    setErrorControlPresentacion(
      error.message
    )
  } finally {
    setCargandoControlPresentacion(false)
  }
}


function obtenerIdEjecucionGenerada() {
  const valor =
    ejecucionGenerada

  if (!valor) {
    return null
  }

  if (typeof valor === 'string') {
    return valor
  }

  if (Array.isArray(valor)) {
    const primero =
      valor[0]

    if (!primero) {
      return null
    }

    if (typeof primero === 'string') {
      return primero
    }

    return (
      primero.ejecucion_id ??
      primero.id ??
      null
    )
  }

  if (typeof valor === 'object') {
    return (
      valor.ejecucion_id ??
      valor.id ??
      null
    )
  }

  return null
}

async function abrirPresentacionSinVerResultado() {
  const ejecucionId =
    obtenerIdEjecucionGenerada()

  if (!ejecucionId) {
    setMensajeGeneracion(
      'No se ha podido identificar la ejecución recién generada.'
    )
    return
  }

  /*
  IMPORTANTE:
  Entramos exactamente en la ejecución que acabamos de generar.
  No buscamos "la última" porque podría existir otra ejecución
  anterior finalizada del mismo sorteo.
  */
  setEstadoPresentacion(null)
  setEquiposReveladosControl([])
  setFotosControlPresentacion({})
  setErrorControlPresentacion('')
  setMensajePresentacion('')
  setResumenFinalEnviado(false)
  setRepeticionEnCursoControl(false)
  setMostrarConfirmacionInicioPresentacion(false)

  setPantalla('control-presentacion')

  await cargarEstadoControlPresentacion(
    ejecucionId
  )
}

async function abrirControlPresentacion() {
  if (!sorteoSeleccionado) {
    return
  }

  /*
  Si venimos desde "Ver resultado generado", mantenemos exactamente esa
  ejecución. Si venimos desde la ficha del sorteo, buscamos su última
  ejecución y no reutilizamos nunca la de otro sorteo.
  */
  const ejecucionIdObjetivo =
    pantalla === 'resultado-sorteo'
      ? ejecucionResultado?.id ?? null
      : null

  setEstadoPresentacion(null)
  setEquiposReveladosControl([])
  setFotosControlPresentacion({})
  setErrorControlPresentacion('')
  setMensajePresentacion('')
  setResumenFinalEnviado(false)
  setRepeticionEnCursoControl(false)
  setMostrarConfirmacionInicioPresentacion(false)

  setPantalla('control-presentacion')

  await cargarEstadoControlPresentacion(
    ejecucionIdObjetivo
  )
}

function solicitarInicioPresentacion() {
  if (!estadoPresentacion) {
    return
  }

  setMostrarConfirmacionInicioPresentacion(true)
}

async function confirmarInicioPresentacion() {
  if (!estadoPresentacion?.ejecucion_id) {
    return
  }

  setMostrarConfirmacionInicioPresentacion(false)
  setAccionPresentacion(true)
  setMensajePresentacion(
    'Iniciando presentación...'
  )

  try {
    const { error } = await supabase.rpc(
      'iniciar_presentacion_sorteo',
      {
        p_ejecucion_id:
          estadoPresentacion.ejecucion_id,
      }
    )

    if (error) {
      throw error
    }

    await cargarEstadoControlPresentacion(
      estadoPresentacion.ejecucion_id
    )

    setMensajePresentacion(
      'Presentación iniciada. La pantalla pública ya está preparada para recibir equipos.'
    )
  } catch (error) {
    console.error(
      'Error iniciando la presentación:',
      error
    )

    setMensajePresentacion(
      `Error: ${error.message}`
    )
  } finally {
    setAccionPresentacion(false)
  }
}

async function revelarSiguienteEquipo() {
  if (!estadoPresentacion?.ejecucion_id) {
    return
  }

  if (bloqueoSecuenciaPresentacion) {
    return
  }

  if (
    String(estadoPresentacion.estado).toLowerCase() !==
    'en_curso'
  ) {
    return
  }

  setAccionPresentacion(true)
  setMensajePresentacion(
    'Revelando siguiente equipo...'
  )

  try {
    const { error } = await supabase.rpc(
      'revelar_siguiente_equipo',
      {
        p_ejecucion_id:
          estadoPresentacion.ejecucion_id,
      }
    )

    if (error) {
      throw error
    }

    await cargarEstadoControlPresentacion(
      estadoPresentacion.ejecucion_id
    )

    /*
    Bloqueamos temporalmente el siguiente clic mientras la TV
    enseña cada jugador por separado y, al final, el equipo completo.
    */
    setBloqueoSecuenciaPresentacion(true)

    if (temporizadorBloqueoAdminRef.current) {
      window.clearTimeout(temporizadorBloqueoAdminRef.current)
    }

    const configPresentacion =
      obtenerConfigPresentacion()

    const duracionSecuenciaAdmin =
      configPresentacion.retrasoPrimerJugadorMs +
      cantidadJugadoresEquipoActual() *
        configPresentacion.intervaloRevelacionMs +
      configPresentacion.margenBloqueoAdminMs

    temporizadorBloqueoAdminRef.current =
      window.setTimeout(
        () => {
          setBloqueoSecuenciaPresentacion(false)
        },
        duracionSecuenciaAdmin
      )

    setMensajePresentacion(
      'Equipo enviado a la TV. Espera a que termine la animación antes de revelar el siguiente.'
    )
  } catch (error) {
    console.error(
      'Error revelando el siguiente equipo:',
      error
    )

    setMensajePresentacion(
      `Error: ${error.message}`
    )
  } finally {
    setAccionPresentacion(false)
  }
}


async function repetirPresentacionEnTv() {
  if (!estadoPresentacion?.ejecucion_id) {
    return
  }

  if (
    String(
      estadoPresentacion.estado ?? ''
    ).toLowerCase() !== 'finalizada'
  ) {
    setMensajePresentacion(
      'La presentación solo puede repetirse cuando la ejecución está finalizada.'
    )
    return
  }

  setAccionPresentacion(true)
  setMensajePresentacion(
    'Preparando la repetición completa en la pantalla pública...'
  )

  try {
    const {
      data,
      error,
    } = await supabase.rpc(
      'repetir_presentacion_publica',
      {
        p_ejecucion_id:
          estadoPresentacion.ejecucion_id,
      }
    )

    if (error) {
      throw error
    }

    /*
    La repetición es únicamente audiovisual:
    no cambia equipos, grupos, orden ni horas originales.
    También ocultamos de nuevo el resumen para que la TV
    empiece mostrando los equipos desde el principio.
    */
    setResumenFinalEnviado(false)
    setRepeticionEnCursoControl(true)

    if (temporizadorRepeticionAdminRef.current) {
      window.clearTimeout(
        temporizadorRepeticionAdminRef.current
      )
    }

    const totalEquipos =
      Number(
        estadoPresentacion.total_equipos ??
        equiposReveladosControl.length ??
        0
      )

    const configPresentacion =
      obtenerConfigPresentacion()

    const duracionEquipo =
      configPresentacion.retrasoPrimerJugadorMs +
      cantidadJugadoresEquipoActual() *
        configPresentacion.intervaloRevelacionMs

    const duracionTotal =
      Math.max(1, totalEquipos) *
        (
          duracionEquipo +
          configPresentacion.pausaEntreEquiposRepeticionMs
        ) -
      configPresentacion.pausaEntreEquiposRepeticionMs +
      configPresentacion.pausaAntesResumenRepeticionMs +
      configPresentacion.margenBloqueoAdminMs

    temporizadorRepeticionAdminRef.current =
      window.setTimeout(
        async () => {
          /*
          La TV ya muestra el resumen automáticamente.
          Además dejamos persistida la señal en Supabase para que,
          si la pantalla pública se recarga después, siga mostrando
          el resultado final.
          */
          try {
            const { error: errorResumen } =
              await supabase.rpc(
                'mostrar_resumen_final_presentacion',
                {
                  p_ejecucion_id:
                    estadoPresentacion.ejecucion_id,
                }
              )

            if (errorResumen) {
              throw errorResumen
            }

            setResumenFinalEnviado(true)
          } catch (error) {
            console.error(
              'Error persistiendo el resumen tras la repetición:',
              error
            )
          }

          setRepeticionEnCursoControl(false)

          setMensajePresentacion(
            'Repetición completada. El resumen final se ha mostrado automáticamente en la TV.'
          )
        },
        Math.max(1000, duracionTotal)
      )

    setMensajePresentacion(
      `Repetición iniciada en la TV${
        data?.repeticion_version
          ? ` · repetición ${data.repeticion_version}`
          : ''
      }.`
    )
  } catch (error) {
    console.error(
      'Error repitiendo la presentación:',
      error
    )

    setRepeticionEnCursoControl(false)

    setMensajePresentacion(
      `Error: ${error.message}`
    )
  } finally {
    setAccionPresentacion(false)
  }
}


async function mostrarResumenFinalEnTv() {
  if (!estadoPresentacion?.ejecucion_id) {
    return
  }

  setAccionPresentacion(true)
  setMensajePresentacion(
    'Enviando el resumen final a la pantalla pública...'
  )

  try {
    const { error } = await supabase.rpc(
      'mostrar_resumen_final_presentacion',
      {
        p_ejecucion_id:
          estadoPresentacion.ejecucion_id,
      }
    )

    if (error) {
      throw error
    }

    setResumenFinalEnviado(true)

    setMensajePresentacion(
      'Resumen final mostrado en la pantalla pública.'
    )
  } catch (error) {
    console.error(
      'Error mostrando el resumen final:',
      error
    )

    setMensajePresentacion(
      `Error: ${error.message}`
    )
  } finally {
    setAccionPresentacion(false)
  }
}


/*
============================================================
PANTALLA PÚBLICA / TV
============================================================
*/

function obtenerMiembrosEquipoPublico(equipo) {
  if (!Array.isArray(equipo?.miembros)) {
    return []
  }

  return equipo.miembros.filter(
    (miembro) => miembro?.nombre
  )
}


function hashTextoPublico(texto) {
  let hash = 2166136261

  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function ordenarMiembrosParaPresentacion(equipo) {
  const miembros =
    obtenerMiembrosEquipoPublico(equipo)
      .map((miembro, indice) => ({
        ...miembro,
        _indiceOriginal: indice,
      }))

  const semilla =
    `${equipo?.ejecucion_id ?? ''}-${equipo?.numero_equipo ?? ''}-${equipo?.orden_revelacion ?? ''}`

  return miembros
    .map((miembro) => ({
      miembro,
      clave: hashTextoPublico(
        `${semilla}-${miembro.codigo_jugador || miembro.nombre}`
      ),
    }))
    .sort((a, b) => a.clave - b.clave)
    .map(({ miembro }) => miembro)
}


function limpiarTemporizadoresRepeticionPublica() {
  for (
    const temporizador of
    temporizadoresRepeticionPublicaRef.current
  ) {
    window.clearTimeout(temporizador)
  }

  temporizadoresRepeticionPublicaRef.current = []
}

function limpiarTemporizadoresPublicos() {
  for (const temporizador of temporizadoresPublicosRef.current) {
    window.clearTimeout(temporizador)
  }

  temporizadoresPublicosRef.current = []
}

function crearTonoPublico({
  frecuencia,
  frecuenciaFinal = null,
  inicio = 0,
  duracion = 0.18,
  volumen = 0.045,
  tipo = 'sine',
  forzar = false,
}) {
  if (
    !forzar &&
    !sonidoPublicoActivoRef.current
  ) {
    return
  }

  const contexto =
    audioContextPublicoRef.current

  if (!contexto) {
    return
  }

  const oscilador =
    contexto.createOscillator()

  const ganancia =
    contexto.createGain()

  const ahora =
    contexto.currentTime + inicio

  oscilador.type = tipo
  oscilador.frequency.setValueAtTime(
    Math.max(1, frecuencia),
    ahora
  )

  if (
    frecuenciaFinal !== null
  ) {
    oscilador.frequency.exponentialRampToValueAtTime(
      Math.max(1, frecuenciaFinal),
      ahora + duracion
    )
  }

  ganancia.gain.setValueAtTime(
    0.0001,
    ahora
  )

  ganancia.gain.exponentialRampToValueAtTime(
    Math.max(
      0.0001,
      volumen
    ),
    ahora + Math.min(0.018, duracion / 4)
  )

  ganancia.gain.exponentialRampToValueAtTime(
    0.0001,
    ahora + duracion
  )

  oscilador.connect(ganancia)
  ganancia.connect(contexto.destination)

  oscilador.start(ahora)
  oscilador.stop(
    ahora + duracion + 0.03
  )
}


function crearRuidoPublico({
  inicio = 0,
  duracion = 0.35,
  volumen = 0.12,
  filtro = 'highpass',
  frecuenciaFiltro = 1200,
  forzar = false,
}) {
  if (
    !forzar &&
    !sonidoPublicoActivoRef.current
  ) {
    return
  }

  const contexto =
    audioContextPublicoRef.current

  if (!contexto) {
    return
  }

  const cantidadMuestras =
    Math.max(
      1,
      Math.floor(
        contexto.sampleRate *
        duracion
      )
    )

  const buffer =
    contexto.createBuffer(
      1,
      cantidadMuestras,
      contexto.sampleRate
    )

  const datos =
    buffer.getChannelData(0)

  for (
    let indice = 0;
    indice < datos.length;
    indice += 1
  ) {
    /*
    Ruido con caída natural para evitar un chasquido demasiado seco.
    */
    const envolvente =
      1 - indice / datos.length

    datos[indice] =
      (Math.random() * 2 - 1) *
      envolvente
  }

  const fuente =
    contexto.createBufferSource()

  fuente.buffer = buffer

  const filtroAudio =
    contexto.createBiquadFilter()

  filtroAudio.type =
    filtro

  filtroAudio.frequency.setValueAtTime(
    frecuenciaFiltro,
    contexto.currentTime + inicio
  )

  const ganancia =
    contexto.createGain()

  const ahora =
    contexto.currentTime + inicio

  ganancia.gain.setValueAtTime(
    Math.max(
      0.0001,
      volumen
    ),
    ahora
  )

  ganancia.gain.exponentialRampToValueAtTime(
    0.0001,
    ahora + duracion
  )

  fuente.connect(filtroAudio)
  filtroAudio.connect(ganancia)
  ganancia.connect(contexto.destination)

  fuente.start(ahora)
  fuente.stop(
    ahora + duracion + 0.03
  )
}


function reproducirEfectoSintetico(
  tipo,
  volumenGeneral = 1,
  forzar = false
) {
  const volumen =
    Math.max(
      0,
      Math.min(
        1.25,
        Number(volumenGeneral) || 0
      )
    )

  if (tipo === 'inicio') {
    crearTonoPublico({
      frecuencia: 165,
      frecuenciaFinal: 230,
      duracion: 0.22,
      volumen: 0.04 * volumen,
      tipo: 'triangle',
      forzar,
    })

    return
  }

  if (tipo === 'jugador') {
    /*
    RAYO:
    un crack corto de ruido + dos barridos agudos.
    */
    crearRuidoPublico({
      duracion: 0.24,
      volumen: 0.24 * volumen,
      filtro: 'highpass',
      frecuenciaFiltro: 1500,
      forzar,
    })

    crearRuidoPublico({
      inicio: 0.045,
      duracion: 0.19,
      volumen: 0.15 * volumen,
      filtro: 'bandpass',
      frecuenciaFiltro: 3200,
      forzar,
    })

    crearTonoPublico({
      frecuencia: 1700,
      frecuenciaFinal: 520,
      duracion: 0.18,
      volumen: 0.075 * volumen,
      tipo: 'sawtooth',
      forzar,
    })

    crearTonoPublico({
      frecuencia: 1150,
      frecuenciaFinal: 310,
      inicio: 0.055,
      duracion: 0.24,
      volumen: 0.06 * volumen,
      tipo: 'triangle',
      forzar,
    })

    return
  }

  if (tipo === 'equipo') {
    /*
    BOMBA / IMPACTO:
    grave descendente + explosión de ruido filtrado.
    */
    crearTonoPublico({
      frecuencia: 115,
      frecuenciaFinal: 34,
      duracion: 0.72,
      volumen: 0.28 * volumen,
      tipo: 'sine',
      forzar,
    })

    crearTonoPublico({
      frecuencia: 78,
      frecuenciaFinal: 28,
      inicio: 0.025,
      duracion: 0.82,
      volumen: 0.20 * volumen,
      tipo: 'triangle',
      forzar,
    })

    crearRuidoPublico({
      duracion: 0.48,
      volumen: 0.24 * volumen,
      filtro: 'lowpass',
      frecuenciaFiltro: 650,
      forzar,
    })

    return
  }

  if (
    tipo === 'resumen' ||
    tipo === 'final'
  ) {
    /*
    FANFARRIA CORTA:
    acorde ascendente de victoria para abrir el resumen final.
    */
    ;[
      [523.25, 0.00],
      [659.25, 0.10],
      [783.99, 0.20],
      [1046.50, 0.34],
    ].forEach(
      ([frecuencia, inicio]) => {
        crearTonoPublico({
          frecuencia,
          inicio,
          duracion: 0.72,
          volumen: 0.075 * volumen,
          tipo: 'triangle',
          forzar,
        })

        crearTonoPublico({
          frecuencia:
            frecuencia / 2,
          inicio,
          duracion: 0.78,
          volumen: 0.032 * volumen,
          tipo: 'sine',
          forzar,
        })
      }
    )
  }
}


function volumenEfectoPublico(tipo) {
  const configuracion = {
    jugador: {
      campo:
        'efecto_jugador_volumen',
      defecto: 88,
    },
    equipo: {
      campo:
        'efecto_equipo_volumen',
      defecto: 96,
    },
    resumen: {
      campo:
        'efecto_resumen_volumen',
      defecto: 92,
    },
  }[tipo]

  if (!configuracion) {
    return 1
  }

  return (
    limitarNumero(
      musicaPublica?.[
        configuracion.campo
      ],
      0,
      100,
      configuracion.defecto
    ) / 100
  )
}


function obtenerAudioEfectoPublico(
  tipo
) {
  return (
    audioEfectosPublicosRef
      .current?.[tipo] ??
    null
  )
}


function efectoSonidoPublicoActivo(tipo) {
  const campos = {
    jugador:
      'efecto_jugador_activo',
    equipo:
      'efecto_equipo_activo',
    resumen:
      'efecto_resumen_activo',
  }

  const configActual =
    musicaPublicaRef.current

  if (tipo === 'inicio') {
    /*
    El pequeño sonido de arranque que ya existía se conserva
    mientras haya algún efecto de revelación activo. Si el
    usuario silencia los tres, queda exclusivamente la música.
    */
    return [
      'jugador',
      'equipo',
      'resumen',
    ].some(
      (nombre) =>
        configActual?.[
          campos[nombre]
        ] !== false
    )
  }

  const campo =
    campos[tipo]

  if (!campo) {
    return true
  }

  /*
  Compatibilidad con sorteos antiguos: si el campo aún no
  existiera en la respuesta, consideramos el efecto activo.
  */
  return (
    configActual?.[campo] !== false
  )
}


function reproducirEfectoPublico(tipo) {
  if (!sonidoPublicoActivoRef.current) {
    return
  }

  if (tipo === 'inicio') {
    if (
      !efectoSonidoPublicoActivo(
        'inicio'
      )
    ) {
      return
    }
    reproducirEfectoSintetico(
      'inicio',
      0.8
    )
    return
  }

  const tipoNormalizado =
    tipo === 'final'
      ? 'resumen'
      : tipo

  if (
    ![
      'jugador',
      'equipo',
      'resumen',
    ].includes(tipoNormalizado)
  ) {
    return
  }

  if (
    !efectoSonidoPublicoActivo(
      tipoNormalizado
    )
  ) {
    return
  }

  const volumen =
    volumenEfectoPublico(
      tipoNormalizado
    )

  const audioPersonalizado =
    obtenerAudioEfectoPublico(
      tipoNormalizado
    )

  if (audioPersonalizado) {
    try {
      audioPersonalizado.pause()
      audioPersonalizado.currentTime = 0
      audioPersonalizado.volume =
        Math.max(
          0,
          Math.min(
            1,
            volumen
          )
        )

      const promesa =
        audioPersonalizado.play()

      if (
        promesa &&
        typeof promesa.catch ===
          'function'
      ) {
        promesa.catch(
          (error) => {
            console.warn(
              'No se pudo reproducir el efecto personalizado:',
              error
            )
          }
        )
      }

      return
    } catch (error) {
      console.warn(
        'Error reproduciendo efecto personalizado:',
        error
      )
    }
  }

  reproducirEfectoSintetico(
    tipoNormalizado,
    volumen
  )
}


function detenerFadeMusicaPublica() {
  if (
    temporizadorFadeMusicaPublicoRef.current
  ) {
    window.clearInterval(
      temporizadorFadeMusicaPublicoRef.current
    )

    temporizadorFadeMusicaPublicoRef.current =
      null
  }
}


function limpiarPistaMusicaPublica(tipo) {
  const esEspera =
    tipo === 'espera'

  const audioRef =
    esEspera
      ? audioEsperaPublicoRef
      : audioSorteoPublicoRef

  const blobRef =
    esEspera
      ? blobUrlEsperaPublicoRef
      : blobUrlSorteoPublicoRef

  if (audioRef.current) {
    audioRef.current.pause()
    audioRef.current.src = ''
    audioRef.current = null
  }

  if (blobRef.current) {
    URL.revokeObjectURL(
      blobRef.current
    )

    blobRef.current = null
  }
}


function detenerDuckingMusicaPublica() {
  if (
    temporizadorDuckingMusicaPublicoRef.current
  ) {
    window.clearInterval(
      temporizadorDuckingMusicaPublicoRef.current
    )

    temporizadorDuckingMusicaPublicoRef.current =
      null
  }
}


function ajustarVolumenMusicaPublica(
  factor = 1,
  duracionMs = 320
) {
  if (
    !sonidoPublicoActivoRef.current ||
    pistaMusicaActivaPublicoRef.current !== 'sorteo'
  ) {
    return
  }

  const audio =
    audioSorteoPublicoRef.current

  if (!audio) {
    return
  }

  detenerDuckingMusicaPublica()

  const volumenBase =
    volumenObjetivoMusicaPublica(
      'sorteo'
    )

  const objetivo =
    Math.max(
      0,
      Math.min(
        1,
        volumenBase * factor
      )
    )

  const inicial =
    Number(audio.volume) || 0

  const pasos = 18
  const intervaloMs =
    Math.max(
      12,
      duracionMs / pasos
    )

  let paso = 0

  temporizadorDuckingMusicaPublicoRef.current =
    window.setInterval(
      () => {
        paso += 1

        const progreso =
          Math.min(
            1,
            paso / pasos
          )

        const suavizado =
          1 -
          Math.pow(
            1 - progreso,
            3
          )

        audio.volume =
          inicial +
          (objetivo - inicial) *
            suavizado

        if (progreso >= 1) {
          detenerDuckingMusicaPublica()
        }
      },
      intervaloMs
    )
}


function detenerMusicaPublica() {
  detenerFadeMusicaPublica()
  detenerDuckingMusicaPublica()

  for (
    const audio of [
      audioEsperaPublicoRef.current,
      audioSorteoPublicoRef.current,
    ]
  ) {
    if (audio) {
      audio.pause()
    }
  }

  pistaMusicaActivaPublicoRef.current =
    null
}


async function precargarPistaMusicaPublica(
  tipo,
  path
) {
  const esEspera =
    tipo === 'espera'

  limpiarPistaMusicaPublica(
    tipo
  )

  if (!path) {
    setEstadoPrecargaMusicaPublica(
      (actual) => ({
        ...actual,
        [tipo]:
          'sin_configurar',
      })
    )

    setDetallePrecargaMusicaPublica(
      (actual) => ({
        ...actual,
        [tipo]:
          'Sin canción configurada',
      })
    )

    return
  }

  setEstadoPrecargaMusicaPublica(
    (actual) => ({
      ...actual,
      [tipo]: 'cargando',
    })
  )

  setDetallePrecargaMusicaPublica(
    (actual) => ({
      ...actual,
      [tipo]:
        'Descargando en la TV...',
    })
  )

  try {
    const url =
      obtenerUrlMusica(
        path
      )

    const respuesta =
      await fetch(
        url,
        {
          cache: 'force-cache',
        }
      )

    if (!respuesta.ok) {
      throw new Error(
        `HTTP ${respuesta.status}`
      )
    }

    /*
    Descargamos el MP3 completo a memoria antes del directo.
    Una vez creado el blob local, la reproducción no depende de
    seguir descargando la canción mientras salen los jugadores.
    */
    const blob =
      await respuesta.blob()

    const blobUrl =
      URL.createObjectURL(
        blob
      )

    const audio =
      new Audio(
        blobUrl
      )

    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 0

    if (esEspera) {
      audioEsperaPublicoRef.current =
        audio
      blobUrlEsperaPublicoRef.current =
        blobUrl
    } else {
      audioSorteoPublicoRef.current =
        audio
      blobUrlSorteoPublicoRef.current =
        blobUrl
    }

    setEstadoPrecargaMusicaPublica(
      (actual) => ({
        ...actual,
        [tipo]: 'lista',
      })
    )

    setDetallePrecargaMusicaPublica(
      (actual) => ({
        ...actual,
        [tipo]:
          `${(
            blob.size /
            (1024 * 1024)
          ).toFixed(1)} MB precargados`,
      })
    )
  } catch (error) {
    console.warn(
      `No se pudo precargar música ${tipo}:`,
      error
    )

    limpiarPistaMusicaPublica(
      tipo
    )

    setEstadoPrecargaMusicaPublica(
      (actual) => ({
        ...actual,
        [tipo]: 'error',
      })
    )

    setDetallePrecargaMusicaPublica(
      (actual) => ({
        ...actual,
        [tipo]:
          'No se pudo precargar',
      })
    )
  }
}



function limpiarEfectoPersonalizadoPublico(
  tipo
) {
  const audio =
    audioEfectosPublicosRef
      .current?.[tipo]

  if (audio) {
    audio.pause()
    audio.src = ''
  }

  audioEfectosPublicosRef.current[
    tipo
  ] = null

  const blobUrl =
    blobUrlsEfectosPublicosRef
      .current?.[tipo]

  if (blobUrl) {
    URL.revokeObjectURL(
      blobUrl
    )
  }

  blobUrlsEfectosPublicosRef.current[
    tipo
  ] = null
}


async function precargarEfectoPersonalizadoPublico(
  tipo,
  path
) {
  limpiarEfectoPersonalizadoPublico(
    tipo
  )

  if (!path) {
    return
  }

  try {
    const url =
      obtenerUrlMusica(
        path
      )

    const respuesta =
      await fetch(
        url,
        {
          cache: 'force-cache',
        }
      )

    if (!respuesta.ok) {
      throw new Error(
        `HTTP ${respuesta.status}`
      )
    }

    const blob =
      await respuesta.blob()

    const blobUrl =
      URL.createObjectURL(
        blob
      )

    const audio =
      new Audio(
        blobUrl
      )

    audio.preload = 'auto'
    audio.loop = false

    audioEfectosPublicosRef.current[
      tipo
    ] = audio

    blobUrlsEfectosPublicosRef.current[
      tipo
    ] = blobUrl
  } catch (error) {
    console.warn(
      `No se pudo precargar el efecto ${tipo}; se usará el predeterminado:`,
      error
    )

    limpiarEfectoPersonalizadoPublico(
      tipo
    )
  }
}


async function cargarConfiguracionMusicaPublica() {
  if (!sorteoPublicoId) {
    return
  }

  try {
    const {
      data,
      error,
    } = await supabase.rpc(
      'obtener_musica_presentacion_publica',
      {
        p_sorteo_id:
          sorteoPublicoId,
      }
    )

    if (error) {
      throw error
    }

    const config =
      data ?? {}

    musicaPublicaRef.current =
      config

    setMusicaPublica(
      config
    )

    await Promise.all([
      precargarPistaMusicaPublica(
        'espera',
        config.musica_espera_path
      ),

      precargarPistaMusicaPublica(
        'sorteo',
        config.musica_sorteo_path
      ),

      precargarEfectoPersonalizadoPublico(
        'jugador',
        config.efecto_jugador_path
      ),

      precargarEfectoPersonalizadoPublico(
        'equipo',
        config.efecto_equipo_path
      ),

      precargarEfectoPersonalizadoPublico(
        'resumen',
        config.efecto_resumen_path
      ),
    ])
  } catch (error) {
    console.warn(
      'No se pudo cargar la configuración de música:',
      error
    )

    setEstadoPrecargaMusicaPublica({
      espera: 'error',
      sorteo: 'error',
    })

    setDetallePrecargaMusicaPublica({
      espera:
        'Error de configuración',
      sorteo:
        'Error de configuración',
    })
  }
}


async function refrescarActivacionEfectosPublicos() {
  if (!sorteoPublicoId) {
    return
  }

  try {
    const {
      data,
      error,
    } = await supabase.rpc(
      'obtener_musica_presentacion_publica',
      {
        p_sorteo_id:
          sorteoPublicoId,
      }
    )

    if (error) {
      throw error
    }

    const config =
      data ?? {}

    const interruptores = {
      efecto_jugador_activo:
        config.efecto_jugador_activo !== false,

      efecto_equipo_activo:
        config.efecto_equipo_activo !== false,

      efecto_resumen_activo:
        config.efecto_resumen_activo !== false,
    }

    /*
    Actualizamos primero la ref porque las revelaciones pueden
    arrancar en este mismo ciclo de consulta.
    */
    musicaPublicaRef.current = {
      ...(musicaPublicaRef.current ?? {}),
      ...interruptores,
    }

    setMusicaPublica(
      (actual) => ({
        ...(actual ?? {}),
        ...interruptores,
      })
    )
  } catch (error) {
    /*
    Un fallo puntual al refrescar estos tres interruptores no debe
    detener el sorteo ni volver a descargar las canciones.
    */
    console.warn(
      'No se pudo refrescar la activación de los efectos:',
      error
    )
  }
}


function volumenObjetivoMusicaPublica(
  tipo
) {
  const bruto =
    tipo === 'espera'
      ? musicaPublica
          ?.musica_espera_volumen
      : musicaPublica
          ?.musica_sorteo_volumen

  return (
    limitarNumero(
      bruto,
      0,
      100,
      tipo === 'espera'
        ? 65
        : 55
    ) / 100
  )
}


async function desbloquearAudioPublico(
  audio
) {
  if (!audio) {
    return
  }

  const volumenAnterior =
    audio.volume

  try {
    audio.volume = 0

    await audio.play()

    audio.pause()
    audio.currentTime = 0
  } catch (error) {
    console.warn(
      'No se pudo preparar una pista de audio:',
      error
    )
  } finally {
    audio.volume =
      volumenAnterior
  }
}


async function cambiarPistaMusicaPublica(
  tipoObjetivo,
  {
    inmediato = false,
    reiniciar = false,
  } = {}
) {
  if (
    !sonidoPublicoActivoRef.current
  ) {
    return
  }

  const audioObjetivo =
    tipoObjetivo === 'espera'
      ? audioEsperaPublicoRef.current
      : audioSorteoPublicoRef.current

  if (!audioObjetivo) {
    /*
    Si no hay canción configurada o falla la descarga, el sorteo
    sigue funcionando con normalidad y conserva los efectos.
    */
    detenerMusicaPublica()
    return
  }

  const tipoActual =
    pistaMusicaActivaPublicoRef.current

  const audioActual =
    tipoActual === 'espera'
      ? audioEsperaPublicoRef.current
      : tipoActual === 'sorteo'
        ? audioSorteoPublicoRef.current
        : null

  const volumenObjetivo =
    volumenObjetivoMusicaPublica(
      tipoObjetivo
    )

  if (
    tipoActual === tipoObjetivo
  ) {
    audioObjetivo.volume =
      volumenObjetivo

    if (audioObjetivo.paused) {
      try {
        await audioObjetivo.play()
      } catch (error) {
        console.warn(
          'No se pudo reanudar la música:',
          error
        )
      }
    }

    return
  }

  detenerFadeMusicaPublica()
  detenerDuckingMusicaPublica()

  if (reiniciar) {
    try {
      audioObjetivo.currentTime = 0
    } catch {
      // Algunos navegadores no permiten mover el tiempo hasta cargar.
    }
  }

  audioObjetivo.volume =
    inmediato
      ? volumenObjetivo
      : 0

  try {
    await audioObjetivo.play()
  } catch (error) {
    console.warn(
      'No se pudo iniciar la música:',
      error
    )

    return
  }

  pistaMusicaActivaPublicoRef.current =
    tipoObjetivo

  if (inmediato) {
    if (
      audioActual &&
      audioActual !== audioObjetivo
    ) {
      audioActual.pause()
    }

    return
  }

  const duracionMs = 1200
  const pasos = 24
  const intervaloMs =
    duracionMs / pasos

  let paso = 0
  const volumenInicialAnterior =
    audioActual
      ? audioActual.volume
      : 0

  temporizadorFadeMusicaPublicoRef.current =
    window.setInterval(
      () => {
        paso += 1

        const progreso =
          Math.min(
            1,
            paso / pasos
          )

        audioObjetivo.volume =
          volumenObjetivo *
          progreso

        if (audioActual) {
          audioActual.volume =
            Math.max(
              0,
              volumenInicialAnterior *
                (1 - progreso)
            )
        }

        if (progreso >= 1) {
          detenerFadeMusicaPublica()

          if (audioActual) {
            audioActual.pause()
          }
        }
      },
      intervaloMs
    )
}


async function sincronizarMusicaPublica(
  opciones = {}
) {
  if (
    !sonidoPublicoActivoRef.current
  ) {
    return
  }

  const estado =
    String(
      presentacionPublica?.estado ??
      ''
    ).toLowerCase()

  if (
    estado === 'generada' ||
    !estado
  ) {
    await cambiarPistaMusicaPublica(
      'espera',
      opciones
    )

    return
  }

  if (
    estado === 'en_curso' ||
    estado === 'finalizada'
  ) {
    await cambiarPistaMusicaPublica(
      'sorteo',
      opciones
    )
  }
}


async function alternarSonidoPublico() {
  if (sonidoPublicoActivoRef.current) {
    sonidoPublicoActivoRef.current = false
    setSonidoPublicoActivo(false)
    detenerMusicaPublica()
    return
  }

  try {
    const ConstructorAudio =
      window.AudioContext ||
      window.webkitAudioContext

    if (!ConstructorAudio) {
      setErrorPublico(
        'Este navegador no permite activar los efectos de sonido.'
      )
      return
    }

    if (!audioContextPublicoRef.current) {
      audioContextPublicoRef.current =
        new ConstructorAudio()
    }

    await audioContextPublicoRef.current.resume()

    /*
    Este clic local en la TV sirve también para desbloquear las dos
    pistas MP3. Así, cuando después pulses "Comenzar sorteo" desde
    el móvil, Chrome puede cambiar de canción sin pedir otro clic.
    */
    await Promise.all([
      desbloquearAudioPublico(
        audioEsperaPublicoRef.current
      ),
      desbloquearAudioPublico(
        audioSorteoPublicoRef.current
      ),
      desbloquearAudioPublico(
        audioEfectosPublicosRef.current.jugador
      ),
      desbloquearAudioPublico(
        audioEfectosPublicosRef.current.equipo
      ),
      desbloquearAudioPublico(
        audioEfectosPublicosRef.current.resumen
      ),
    ])

    sonidoPublicoActivoRef.current = true
    setSonidoPublicoActivo(true)

    await sincronizarMusicaPublica({
      inmediato: true,
      reiniciar: true,
    })

    /*
    Al preparar el audio no reproducimos ningún efecto.
    El sonido de bomba queda reservado exclusivamente
    para el momento EQUIPO COMPLETO.
    */
  } catch (error) {
    console.warn(
      'No se pudo activar el sonido:',
      error
    )

    setErrorPublico(
      'No se pudo activar el sonido en este navegador.'
    )
  }
}

function mostrarEquipoCompletoPublico(equipo) {
  limpiarTemporizadoresPublicos()

  const miembros =
    ordenarMiembrosParaPresentacion(equipo)

  setEquipoDestacadoPublico(equipo)
  setMiembrosSecuenciaPublica(miembros)
  setMiembrosVisiblesPublico(miembros.length)
  setEquipoCompletoPublico(true)
}

function iniciarSecuenciaEquipoPublico(
  equipo,
  esUltimoEquipo = false
) {
  limpiarTemporizadoresPublicos()

  const miembros =
    ordenarMiembrosParaPresentacion(equipo)

  setEquipoDestacadoPublico(equipo)
  setMiembrosSecuenciaPublica(miembros)
  setMiembrosVisiblesPublico(0)
  setEquipoCompletoPublico(false)
  setMostrarResumenFinalPublico(false)

  setAnimacionPublica(
    (valor) => valor + 1
  )

  reproducirEfectoPublico('inicio')

  const configPresentacion =
    obtenerConfigPresentacion(
      presentacionPublica
    )

  const retrasoPrimerJugador =
    configPresentacion.retrasoPrimerJugadorMs

  const intervaloRevelacion =
    configPresentacion.intervaloRevelacionMs

  /*
  Cada jugador se muestra SOLO durante su turno:
  jugador 1 -> jugador 2 -> jugador 3... -> equipo completo.
  */
  miembros.forEach((miembro, indice) => {
    const temporizador = window.setTimeout(
      () => {
        setMiembrosVisiblesPublico(
          indice + 1
        )

        if (indice === 0) {
          /*
          La música principal baja durante la revelación del equipo
          para que los nombres y los efectos tengan más presencia.
          */
          ajustarVolumenMusicaPublica(
            0.48,
            360
          )
        }

        reproducirEfectoPublico('jugador')
      },
      retrasoPrimerJugador +
        indice * intervaloRevelacion
    )

    temporizadoresPublicosRef.current.push(
      temporizador
    )
  })

  const duracionHastaUltimo =
    retrasoPrimerJugador +
    Math.max(0, miembros.length - 1) *
      intervaloRevelacion

  /*
  Después de enseñar individualmente al último jugador dejamos
  exactamente el mismo intervalo antes de formar visualmente el equipo.
  */
  const temporizadorCierre = window.setTimeout(
    () => {
      setEquipoCompletoPublico(true)

      /*
      Al formarse el equipo completo, la música recupera suavemente
      el volumen configurado por el administrador.
      */
      ajustarVolumenMusicaPublica(
        1,
        720
      )

      reproducirEfectoPublico(
        'equipo'
      )
    },
    duracionHastaUltimo +
      intervaloRevelacion
  )

  temporizadoresPublicosRef.current.push(
    temporizadorCierre
  )
}


function iniciarRepeticionCompletaPublica(equipos) {
  const lista =
    Array.isArray(equipos)
      ? [...equipos].sort(
          (a, b) =>
            Number(a.orden_revelacion) -
            Number(b.orden_revelacion)
        )
      : []

  if (lista.length === 0) {
    return
  }

  limpiarTemporizadoresRepeticionPublica()
  limpiarTemporizadoresPublicos()

  setMostrarResumenFinalPublico(false)
  setResumenAutomaticoRepeticionPublica(false)
  setReproduciendoRepeticionPublica(true)

  setEquiposAvanceRepeticionPublica([])
  setEquipoDestacadoPublico(null)
  setMiembrosSecuenciaPublica([])
  setMiembrosVisiblesPublico(0)
  setEquipoCompletoPublico(false)

  /*
  Como todos los equipos de una ejecución finalizada ya son públicos,
  podemos reproducirlos localmente en la TV sin modificar los datos
  históricos de la ejecución.
  */
  const configPresentacion =
    obtenerConfigPresentacion(
      presentacionPublica
    )

  const duracionBaseEquipo =
    configPresentacion.retrasoPrimerJugadorMs +
    cantidadJugadoresEquipoActual(
      presentacionPublica
    ) *
      configPresentacion.intervaloRevelacionMs

  const saltoEntreEquipos =
    duracionBaseEquipo +
    configPresentacion.pausaEntreEquiposRepeticionMs

  lista.forEach(
    (equipo, indice) => {
      const temporizador =
        window.setTimeout(
          () => {
            setEquiposAvanceRepeticionPublica(
              lista.slice(0, indice + 1)
            )

            iniciarSecuenciaEquipoPublico(
              equipo,
              indice === lista.length - 1
            )
          },
          indice * saltoEntreEquipos
        )

      temporizadoresRepeticionPublicaRef.current.push(
        temporizador
      )
    }
  )

  const finRepeticion =
    window.setTimeout(
      () => {
        /*
        La última pareja ya está completamente formada.
        La mantenemos en pantalla durante la pausa configurada y
        después pasamos automáticamente al resultado final.
        */
        setReproduciendoRepeticionPublica(false)
        setResumenAutomaticoRepeticionPublica(true)
      },
      Math.max(
        0,
        (lista.length - 1) *
          saltoEntreEquipos +
          duracionBaseEquipo +
          configPresentacion.pausaAntesResumenRepeticionMs
      )
    )

  temporizadoresRepeticionPublicaRef.current.push(
    finRepeticion
  )
}


async function cargarPresentacionPublica() {
  if (
    !sorteoPublicoId ||
    !ejecucionPublicaId
  ) {
    return
  }

  if (primeraCargaPublicaRef.current) {
    setCargandoPublico(true)
  }

  try {
    const {
      data,
      error,
    } = await supabase.rpc(
      'obtener_presentacion_publica_v3',
      {
        p_sorteo_id: sorteoPublicoId,
        p_ejecucion_id: ejecucionPublicaId,
      }
    )

    if (error) {
      throw error
    }

    setErrorPublico('')

    /*
    La TV puede permanecer abierta mientras el administrador cambia
    Jugador / Equipo / Resumen entre Sí y No. Refrescamos esos tres
    interruptores antes de procesar una nueva revelación para que el
    cambio tenga efecto sin recargar la pantalla pública.
    */
    await refrescarActivacionEfectosPublicos()

    if (!data) {
      limpiarTemporizadoresPublicos()

      setPresentacionPublica(null)
      setEquipoDestacadoPublico(null)
      setMiembrosSecuenciaPublica([])
      setMiembrosVisiblesPublico(0)
      setEquipoCompletoPublico(false)
      setMostrarResumenFinalPublico(false)
      setResumenAutomaticoRepeticionPublica(false)
      setReproduciendoRepeticionPublica(false)
      setEquiposAvanceRepeticionPublica([])

      ultimoOrdenPublicoRef.current = 0
      ejecucionPublicaRef.current = null

      return
    }

    const equipos =
      Array.isArray(data.equipos)
        ? [...data.equipos].sort(
            (a, b) =>
              Number(a.orden_revelacion) -
              Number(b.orden_revelacion)
          )
        : []

    const ultimoEquipo =
      equipos.length > 0
        ? equipos[equipos.length - 1]
        : null

    const ultimoOrden =
      Number(
        ultimoEquipo?.orden_revelacion ?? 0
      )

    const esPrimeraCarga =
      primeraCargaPublicaRef.current

    const ejecucionActual =
      data.ejecucion_id ?? null

    const cambioDeEjecucion =
      ejecucionPublicaRef.current !== null &&
      ejecucionActual !==
        ejecucionPublicaRef.current

    const repeticionVersionActual =
      Number(
        data.repeticion_version ?? 0
      )

    const nuevaRepeticionSolicitada =
      !esPrimeraCarga &&
      repeticionVersionActual >
        repeticionVersionPublicaRef.current

    setPresentacionPublica({
      ...data,
      equipos,
    })

    /*
    IMPORTANTE:
    "Abrir pantalla pública" reutiliza la misma ventana del navegador.
    Si generamos una nueva ejecución del mismo sorteo, React seguía
    conservando el equipo destacado de la ejecución anterior.
    Por eso podía verse, por ejemplo, Turno #3 mientras el panel de
    administración indicaba que solo iba 1/3.

    Cuando cambia ejecucion_id reiniciamos por completo el estado
    audiovisual de la TV.
    */
    if (cambioDeEjecucion) {
      limpiarTemporizadoresPublicos()

      setEquipoDestacadoPublico(null)
      setMiembrosSecuenciaPublica([])
      setMiembrosVisiblesPublico(0)
      setEquipoCompletoPublico(false)
      setMostrarResumenFinalPublico(false)
      setReproduciendoRepeticionPublica(false)
      setEquiposAvanceRepeticionPublica([])
      limpiarTemporizadoresRepeticionPublica()

      ultimoOrdenPublicoRef.current = 0
      repeticionVersionPublicaRef.current =
        repeticionVersionActual
    }

    ejecucionPublicaRef.current =
      ejecucionActual

    if (esPrimeraCarga) {
      /*
      Al abrir una TV ya existente no repetimos automáticamente
      una orden antigua. Solo reaccionamos a nuevas pulsaciones
      realizadas mientras esta pantalla está abierta.
      */
      repeticionVersionPublicaRef.current =
        repeticionVersionActual
    }

    if (nuevaRepeticionSolicitada) {
      repeticionVersionPublicaRef.current =
        repeticionVersionActual

      iniciarRepeticionCompletaPublica(
        equipos
      )

      /*
      Evitamos que la misma actualización ejecute además la lógica
      normal del "último equipo revelado".
      */
      return
    }

    if (
      (esPrimeraCarga || cambioDeEjecucion) &&
      ultimoEquipo
    ) {
      /*
      Si abrimos la TV cuando ya hay algún equipo revelado,
      mostramos directamente el último de ESTA ejecución.
      No repetimos animaciones antiguas.
      */
      mostrarEquipoCompletoPublico(
        ultimoEquipo
      )

      ultimoOrdenPublicoRef.current =
        ultimoOrden
    } else if (
      (esPrimeraCarga || cambioDeEjecucion) &&
      !ultimoEquipo
    ) {
      /*
      Nueva ejecución todavía sin equipos revelados:
      la TV debe quedarse esperando.
      */
      setEquipoDestacadoPublico(null)
      setMiembrosSecuenciaPublica([])
      setMiembrosVisiblesPublico(0)
      setEquipoCompletoPublico(false)

      ultimoOrdenPublicoRef.current = 0
    } else if (
      ultimoEquipo &&
      ultimoOrden >
        ultimoOrdenPublicoRef.current
    ) {
      iniciarSecuenciaEquipoPublico(
        ultimoEquipo,
        String(data.estado).toLowerCase() ===
          'finalizada'
      )

      ultimoOrdenPublicoRef.current =
        ultimoOrden
    }
  } catch (error) {
    console.error(
      'Error cargando la presentación pública:',
      error
    )

    setErrorPublico(
      error.message
    )
  } finally {
    primeraCargaPublicaRef.current = false
    setCargandoPublico(false)
  }
}


function obtenerUrlControlMovil() {
  if (
    !sorteoSeleccionado?.id ||
    !estadoPresentacion?.ejecucion_id
  ) {
    return ''
  }

  const url =
    new URL(window.location.href)

  url.search = ''
  url.searchParams.set(
    'control',
    '1'
  )
  url.searchParams.set(
    'sorteo',
    sorteoSeleccionado.id
  )
  url.searchParams.set(
    'ejecucion',
    estadoPresentacion.ejecucion_id
  )

  return url.toString()
}


function abrirModoControlMovil() {
  const url =
    obtenerUrlControlMovil()

  if (!url) {
    setMensajePresentacion(
      'No se ha podido preparar el enlace del control móvil.'
    )
    return
  }

  window.location.href =
    url
}


async function copiarEnlaceControlMovil() {
  const url =
    obtenerUrlControlMovil()

  if (!url) {
    setMensajePresentacion(
      'No se ha podido preparar el enlace del control móvil.'
    )
    return
  }

  try {
    await navigator.clipboard.writeText(
      url
    )

    setEnlaceControlMovilCopiado(
      true
    )

    window.setTimeout(
      () =>
        setEnlaceControlMovilCopiado(
          false
        ),
      1800
    )
  } catch (error) {
    console.warn(
      'No se pudo copiar el enlace del control móvil:',
      error
    )

    setMensajePresentacion(
      'No se pudo copiar automáticamente. Abre “Modo móvil” desde el propio teléfono.'
    )
  }
}


async function cargarControlMovilDesdeUrl() {
  if (
    !sorteoControlMovilId ||
    !ejecucionControlMovilId
  ) {
    setErrorControlMovil(
      'El enlace del control móvil está incompleto.'
    )
    setPantalla(
      'control-movil'
    )
    return false
  }

  setCargandoControlMovil(
    true
  )
  setErrorControlMovil('')
  setMensajePresentacion('')

  try {
    const {
      data: sorteo,
      error: errorSorteo,
    } = await supabase
      .from('sorteos')
      .select(`
        id,
        nombre,
        descripcion,
        fecha_evento,
        numero_grupos,
        estado,
        formato_sorteo,
        jugadores_por_equipo,
        distribucion_grupos,
        presentacion_retraso_primer_ms,
        presentacion_intervalo_jugador_ms,
        presentacion_pausa_entre_equipos_ms,
        presentacion_pausa_resumen_ms
      `)
      .eq(
        'id',
        sorteoControlMovilId
      )
      .maybeSingle()

    if (errorSorteo) {
      throw errorSorteo
    }

    if (!sorteo) {
      throw new Error(
        'No existe el sorteo indicado.'
      )
    }

    const {
      data: ejecucion,
      error: errorEjecucion,
    } = await supabase
      .from('ejecuciones_sorteo')
      .select(`
        id,
        sorteo_id
      `)
      .eq(
        'id',
        ejecucionControlMovilId
      )
      .eq(
        'sorteo_id',
        sorteoControlMovilId
      )
      .maybeSingle()

    if (errorEjecucion) {
      throw errorEjecucion
    }

    if (!ejecucion) {
      throw new Error(
        'La ejecución indicada no pertenece a este sorteo.'
      )
    }

    const {
      data: estado,
      error: errorEstado,
    } = await supabase.rpc(
      'obtener_estado_presentacion',
      {
        p_ejecucion_id:
          ejecucionControlMovilId,
      }
    )

    if (errorEstado) {
      throw errorEstado
    }

    const {
      data: revelados,
      error: errorRevelados,
    } = await supabase
      .from('v_equipos_sorteados')
      .select(`
        equipo_id,
        numero_equipo,
        orden_revelacion,
        regla,
        codigo_grupo,
        grupo,
        miembros,
        nombre_equipo,
        estado_revelacion,
        revelado_en
      `)
      .eq(
        'ejecucion_id',
        ejecucionControlMovilId
      )
      .eq(
        'estado_revelacion',
        'revelado'
      )
      .order(
        'orden_revelacion',
        { ascending: true }
      )

    if (errorRevelados) {
      throw errorRevelados
    }

    const {
      data: estadoPublico,
    } = await supabase.rpc(
      'obtener_presentacion_publica_v3',
      {
        p_sorteo_id:
          sorteoControlMovilId,

        p_ejecucion_id:
          ejecucionControlMovilId,
      }
    )

    const listaRevelados =
      revelados ?? []

    setSorteoSeleccionado(
      sorteo
    )
    setEstadoPresentacion(
      estado
    )
    setEquiposReveladosControl(
      listaRevelados
    )
    setResumenFinalEnviado(
      Boolean(
        estadoPublico?.mostrar_resumen_final
      )
    )

    await cargarFotosControlPresentacion(
      listaRevelados
    )

    setPantalla(
      'control-movil'
    )

    return true
  } catch (error) {
    console.error(
      'Error cargando el control móvil:',
      error
    )

    setErrorControlMovil(
      error.message
    )
    setPantalla(
      'control-movil'
    )

    return false
  } finally {
    setCargandoControlMovil(
      false
    )
  }
}


function salirDelControlMovil() {
  const url =
    new URL(window.location.href)

  url.search = ''

  window.location.href =
    url.toString()
}


function abrirPantallaPublica() {
  if (!sorteoSeleccionado) {
    return
  }

  /*
  La pantalla pública se abre únicamente con la ejecución que el Control
  de presentación ya ha cargado y validado para este sorteo. Así evitamos
  formar una URL con sorteo A + ejecución B.
  */
  const ejecucionId =
    estadoPresentacion?.ejecucion_id ?? null

  if (!ejecucionId) {
    setMensajePresentacion(
      'No se ha podido identificar la ejecución que debe mostrarse en la TV.'
    )
    return
  }

  /*
  La TV queda vinculada a una ejecución concreta.
  Así nunca puede mostrar una ejecución anterior del mismo sorteo.
  */
  const url =
    new URL(window.location.href)

  url.search = ''
  url.searchParams.set(
    'publico',
    '1'
  )
  url.searchParams.set(
    'sorteo',
    sorteoSeleccionado.id
  )
  url.searchParams.set(
    'ejecucion',
    ejecucionId
  )

  window.open(
    url.toString(),
    `pantalla-publica-${sorteoSeleccionado.id}-${ejecucionId}`
  )
}

async function activarPantallaCompletaPublica() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  } catch (error) {
    console.warn(
      'No se pudo cambiar el modo de pantalla completa:',
      error
    )
  }
}


  /*
  ============================================================
  CERRAR SESIÓN
  ============================================================
  */

  async function cerrarSesion() {
    await supabase.auth.signOut()

    setEmail('')
    setPassword('')
    setMensajeLogin('')

    setSorteoSeleccionado(null)
    setBombos([])
    setParticipantes([])
    setJugadores([])
    setJugadorEditando(null)
    setGrupos([])
    setGrupoEditandoId(null)
    setEquiposFijos([])
    setMiembrosEquiposFijos([])
    setReglasEquiposFijos([])
    setEquipoFijoPendienteEliminar(null)
    setValidacionesSorteo([])
    setErrorValidacion('')
    setEjecucionOficialSorteo(null)
    setConfirmacionOficialidad(null)
    setMensajeOficialidad('')
    setMensajeGeneracion('')
    setEjecucionGenerada(null)
    setMostrarConfirmacionGenerar(false)
    setEquiposResultado([])
    setEjecucionResultado(null)
    setFotosResultado({})
    setErrorResultado('')
    setEstadoPresentacion(null)
    setEquiposReveladosControl([])
    setFotosControlPresentacion({})
    setErrorControlPresentacion('')
    setMensajePresentacion('')
    setResumenFinalEnviado(false)
    setRepeticionEnCursoControl(false)
    setMostrarConfirmacionInicioPresentacion(false)
    setErrorControlMovil('')
    setEnlaceControlMovilCopiado(false)

    setPantalla('inicio')
  }


/*
============================================================
PANTALLA PÚBLICA / TV
============================================================
*/

if (
  modoPublico &&
  sorteoPublicoId &&
  ejecucionPublicaId
) {
  const equiposPublicos =
    presentacionPublica?.equipos ?? []

  const equiposVisiblesPublicos =
    reproduciendoRepeticionPublica
      ? equiposAvanceRepeticionPublica
      : equiposPublicos

  const equipoActual =
    equipoDestacadoPublico ||
    (
      equiposVisiblesPublicos.length > 0
        ? equiposVisiblesPublicos[
            equiposVisiblesPublicos.length - 1
          ]
        : null
    )

  const equiposAnteriores =
    equipoActual
      ? equiposVisiblesPublicos.filter(
          (equipo) =>
            Number(equipo.orden_revelacion) !==
            Number(equipoActual.orden_revelacion)
        )
      : equiposVisiblesPublicos

  const equiposReveladosVisuales =
    reproduciendoRepeticionPublica
      ? equiposVisiblesPublicos.length
      : Number(
          presentacionPublica?.equipos_revelados ?? 0
        )

  const estadoPublico =
    String(
      presentacionPublica?.estado ?? ''
    ).toLowerCase()

  const finalizada =
    estadoPublico === 'finalizada'

  const enCurso =
    estadoPublico === 'en_curso'

  const preparada =
    estadoPublico === 'generada'

  const configuracionMusicaCargada =
    Boolean(
      musicaPublica
    )

  const musicaEsperaLista =
    !musicaPublica?.musica_espera_path ||
    estadoPrecargaMusicaPublica.espera ===
      'lista'

  const musicaSorteoLista =
    !musicaPublica?.musica_sorteo_path ||
    estadoPrecargaMusicaPublica.sorteo ===
      'lista'

  const audioPublicoListoParaPreparar =
    configuracionMusicaCargada &&
    musicaEsperaLista &&
    musicaSorteoLista

  const miembrosActualesPublico =
    miembrosSecuenciaPublica.length > 0
      ? miembrosSecuenciaPublica
      : obtenerMiembrosEquipoPublico(equipoActual)

  const miembrosMostradosPublico =
    equipoCompletoPublico
      ? miembrosActualesPublico
      : miembrosVisiblesPublico > 0
        ? [
            miembrosActualesPublico[
              Math.min(
                miembrosVisiblesPublico - 1,
                Math.max(
                  0,
                  miembrosActualesPublico.length - 1
                )
              )
            ],
          ].filter(Boolean)
        : []

  const estiloEntradaPublico =
    String(
      musicaPublica?.presentacion_estilo_entrada ??
      'destello'
    ).toLowerCase() === 'giro_zoom'
      ? 'giro_zoom'
      : 'destello'

  const esLigaUnicaPublica =
    String(
      presentacionPublica?.formato_sorteo ?? 'grupos'
    ).toLowerCase() === 'liga_unica'

  const totalJugadoresPublicos =
    equiposPublicos.reduce(
      (total, equipo) =>
        total +
        obtenerMiembrosEquipoPublico(equipo).length,
      0
    )

  const gruposResumenPublico =
    esLigaUnicaPublica
      ? [
          {
            nombre: 'Equipos sorteados',
            equipos: equiposPublicos,
          },
        ]
      : [
          ...new Map(
            equiposPublicos.map((equipo) => [
              equipo.grupo ?? 'Sin grupo',
              {
                nombre:
                  equipo.grupo ?? 'Sin grupo',
                equipos: [],
              },
            ])
          ).values(),
        ]

  if (!esLigaUnicaPublica) {
    for (const grupo of gruposResumenPublico) {
      grupo.equipos =
        equiposPublicos.filter(
          (equipo) =>
            (equipo.grupo ?? 'Sin grupo') ===
            grupo.nombre
        )
    }

    gruposResumenPublico.sort(
      (a, b) =>
        String(a.nombre).localeCompare(
          String(b.nombre),
          'es',
          { numeric: true }
        )
    )
  }

  return (
    <main className="pantalla-publica-tv">

      <header className="cabecera-publica-tv">
        <div>
          <p className="etiqueta-publica-tv">
            SORTEO DE EQUIPOS · EN DIRECTO
          </p>

          <h1>
            {presentacionPublica?.sorteo ??
              'Sorteo de equipos'}
          </h1>
        </div>

        <div className="acciones-publica-tv">
          {reproduciendoRepeticionPublica && (
            <span className="estado-publico-tv estado-repeticion-tv">
              ↻ REPETICIÓN
            </span>
          )}

          {presentacionPublica &&
            !reproduciendoRepeticionPublica && (
            <span
              className={`estado-publico-tv ${
                finalizada
                  ? 'estado-publico-finalizado'
                  : 'estado-publico-directo'
              }`}
            >
              <i />
              {finalizada
                ? 'Finalizado'
                : 'En directo'}
            </span>
          )}

          <button
            type="button"
            className={`boton-sonido-publico ${
              sonidoPublicoActivo
                ? 'sonido-publico-activo'
                : ''
            }`}
            onClick={alternarSonidoPublico}
            disabled={
              !sonidoPublicoActivo &&
              !audioPublicoListoParaPreparar
            }
            title={
              sonidoPublicoActivo
                ? 'Desactivar sonido'
                : 'Activar sonido'
            }
          >
            {sonidoPublicoActivo
              ? '🔊 Música y sonido'
              : '🔇 Preparar audio'}
          </button>

          <button
            type="button"
            className="boton-pantalla-completa"
            onClick={
              activarPantallaCompletaPublica
            }
            title="Pantalla completa"
          >
            ⛶
          </button>
        </div>
      </header>

      {!sonidoPublicoActivo && (
        <button
          type="button"
          className="aviso-activar-sonido-tv"
          onClick={alternarSonidoPublico}
          disabled={
            !audioPublicoListoParaPreparar
          }
        >
          <span>
            {audioPublicoListoParaPreparar
              ? '🔊'
              : '⏳'}
          </span>

          <div>
            <strong>
              {audioPublicoListoParaPreparar
                ? 'Preparar música y sonido'
                : 'Precargando música...'}
            </strong>

            <small>
              {audioPublicoListoParaPreparar
                ? 'Haz clic una vez en la TV antes de empezar. Esto desbloquea las dos canciones para el control desde el móvil.'
                : 'Espera a que las pistas configuradas estén listas. La presentación seguirá funcionando aunque alguna canción no esté configurada.'}
            </small>
          </div>
        </button>
      )}

      {cargandoPublico &&
        !presentacionPublica && (
          <section className="espera-publica-tv">
            <div className="logo-publico-tv">
              🎾
            </div>

            <h2>
              Preparando la pantalla...
            </h2>

            <p>
              Conectando con el sorteo.
            </p>
          </section>
        )}

      {!cargandoPublico &&
        errorPublico && (
          <section className="espera-publica-tv">
            <div className="logo-publico-tv">
              !
            </div>

            <h2>
              No se ha podido conectar
            </h2>

            <p>
              {errorPublico}
            </p>
          </section>
        )}

      {!cargandoPublico &&
        !errorPublico &&
        !presentacionPublica && (
          <section className="espera-publica-tv espera-invitados-tv">
            <div
              className="escena-inicio-sorteo"
              aria-label="El sorteo comenzará en breve"
            >
              <div className="orbita-inicio-sorteo" aria-hidden="true">
                <span className="anillo-inicio anillo-inicio-1" />
                <span className="anillo-inicio anillo-inicio-2" />
                <span className="punto-orbita punto-orbita-1">🎾</span>
                <span className="punto-orbita punto-orbita-2">🎾</span>

                <div className="nucleo-inicio-sorteo">
                  <span>🎲</span>
                </div>
              </div>

              <p className="sobre-espera-publica">
                TODO LISTO
              </p>

              <h2>
                El sorteo comienza en breve
              </h2>

              <p className="mensaje-invitados-inicio">
                Prepárate. Los equipos están a punto de decidirse.
              </p>

              <div className="linea-inicio-sorteo">
                <span>EN UNOS INSTANTES</span>
                <div>
                  <i />
                </div>
              </div>
            </div>
          </section>
        )}

      {presentacionPublica &&
        preparada &&
        equiposPublicos.length === 0 && (
          <section className="espera-publica-tv espera-invitados-tv">
            <div
              className="escena-inicio-sorteo"
              aria-label="El sorteo comenzará en breve"
            >
              <div className="orbita-inicio-sorteo" aria-hidden="true">
                <span className="anillo-inicio anillo-inicio-1" />
                <span className="anillo-inicio anillo-inicio-2" />
                <span className="punto-orbita punto-orbita-1">🎾</span>
                <span className="punto-orbita punto-orbita-2">🎾</span>

                <div className="nucleo-inicio-sorteo">
                  <span>🎲</span>
                </div>
              </div>

              <p className="sobre-espera-publica">
                TODO LISTO
              </p>

              <h2>
                El sorteo comienza en breve
              </h2>

              <p className="mensaje-invitados-inicio">
                Prepárate. Los equipos están a punto de decidirse.
              </p>

              <div className="datos-inicio-sorteo">
                <div>
                  <span>EQUIPOS</span>
                  <strong>
                    {presentacionPublica.total_equipos ?? '—'}
                  </strong>
                </div>

                <div>
                  <span>FORMATO</span>
                  <strong>
                    {esLigaUnicaPublica
                      ? 'Liga única'
                      : 'Por grupos'}
                  </strong>
                </div>

                <div>
                  <span>JUGADORES / EQUIPO</span>
                  <strong>
                    {presentacionPublica.jugadores_por_equipo ?? '—'}
                  </strong>
                </div>
              </div>

              <div className="linea-inicio-sorteo">
                <span>EN UNOS INSTANTES</span>
                <div>
                  <i />
                </div>
              </div>
            </div>
          </section>
        )}

      {presentacionPublica &&
        enCurso &&
        equiposPublicos.length === 0 && (
          <section className="espera-publica-tv espera-primer-equipo-tv">
            <div className="indicador-primer-equipo" aria-hidden="true">
              <span className="anillo-primer-equipo anillo-primer-equipo-1" />
              <span className="anillo-primer-equipo anillo-primer-equipo-2" />

              <div className="nucleo-primer-equipo">
                🎲
              </div>
            </div>

            <p className="sobre-espera-publica">
              EL SORTEO ESTÁ EN MARCHA
            </p>

            <h2>
              Primer equipo en unos instantes
            </h2>

            <p>
              La primera combinación está a punto de aparecer.
            </p>

            <div className="puntos-espera-publica">
              <span />
              <span />
              <span />
            </div>
          </section>
        )}

      {presentacionPublica &&
        equipoActual &&
        !mostrarResumenFinalPublico && (
          <section className="escenario-publico-tv">

            <div
              className={`equipo-principal-publico ${
                equipoCompletoPublico
                  ? 'equipo-principal-publico-completo'
                  : 'equipo-principal-publico-formando'
              }`}
              key={`${equipoActual.orden_revelacion}-${animacionPublica}`}
            >
              {miembrosMostradosPublico.length > 0 &&
                !equipoCompletoPublico && (
                  <div
                    key={`flash-jugador-${animacionPublica}-${miembrosVisiblesPublico}`}
                    className={`flash-jugador-publico ${
                      miembrosVisiblesPublico % 2 === 0
                        ? 'flash-jugador-derecha'
                        : 'flash-jugador-izquierda'
                    }`}
                    aria-hidden="true"
                  />
                )}

              {equipoCompletoPublico && (
                <>
                  <div
                    className="flash-equipo-completo-publico"
                    aria-hidden="true"
                  />

                  <div
                    className="efectos-extra-equipo-publico"
                    aria-hidden="true"
                  >
                    <span className="onda-equipo-publico onda-equipo-publico-1" />
                    <span className="onda-equipo-publico onda-equipo-publico-2" />

                    <span className="chispa-equipo-publico chispa-equipo-1" />
                    <span className="chispa-equipo-publico chispa-equipo-2" />
                    <span className="chispa-equipo-publico chispa-equipo-3" />
                    <span className="chispa-equipo-publico chispa-equipo-4" />
                    <span className="chispa-equipo-publico chispa-equipo-5" />
                    <span className="chispa-equipo-publico chispa-equipo-6" />
                    <span className="chispa-equipo-publico chispa-equipo-7" />
                    <span className="chispa-equipo-publico chispa-equipo-8" />
                  </div>
                </>
              )}
              <div className="cabecera-equipo-publico">
                <span>
                  {equipoCompletoPublico
                    ? 'EQUIPO COMPLETO'
                    : 'FORMANDO EQUIPO'}
                </span>

                <strong>
                  EQUIPO {equipoActual.orden_revelacion} DE {presentacionPublica.total_equipos}
                </strong>
              </div>

              {equipoCompletoPublico && (
                <div className="grupo-equipo-publico">
                  {esLigaUnicaPublica
                    ? 'Equipo formado'
                    : equipoActual.grupo ?? 'Equipo formado'}
                </div>
              )}

              {miembrosMostradosPublico.length === 0 ? (
                <div className="preparando-revelacion-publica">
                  <span />
                  <p>Descubriendo el equipo...</p>
                </div>
              ) : (
                <div
                  className="miembros-publico-tv"
                  data-miembros={miembrosMostradosPublico.length}
                >
                  {miembrosMostradosPublico.map(
                    (miembro, indiceMiembro) => (
                      <div
                        className={`pieza-miembro-publico ${
                          !equipoCompletoPublico &&
                          indiceMiembro ===
                            miembrosMostradosPublico.length - 1
                            ? 'pieza-miembro-publico-nueva'
                            : 'pieza-miembro-publico-estable'
                        } ${
                          (
                            equipoCompletoPublico
                              ? indiceMiembro
                              : Math.max(
                                  0,
                                  miembrosVisiblesPublico - 1
                                )
                          ) % 2 === 0
                            ? 'pieza-desde-izquierda'
                            : 'pieza-desde-derecha'
                        }`}
                        key={
                          miembro.codigo_jugador ||
                          `${miembro.nombre}-${indiceMiembro}`
                        }
                      >
                        {indiceMiembro > 0 && (
                          <div className="mas-publico-tv">
                            +
                          </div>
                        )}

                        <article
                          className={`jugador-publico-tv ${
                            !equipoCompletoPublico &&
                            indiceMiembro ===
                              miembrosMostradosPublico.length - 1
                              ? (
                                  estiloEntradaPublico === 'giro_zoom'
                                    ? 'jugador-publico-entrada-giro-zoom'
                                    : 'jugador-publico-entrada-espectaculo'
                                )
                              : 'jugador-publico-estable'
                          }`}
                          style={{
                            '--indice-miembro':
                              equipoCompletoPublico
                                ? indiceMiembro
                                : Math.max(
                                    0,
                                    miembrosVisiblesPublico - 1
                                  ),
                          }}
                        >
                          <div className="foto-publica-tv">
                            {miembro.foto_path ? (
                              <img
                                src={obtenerUrlFoto(miembro.foto_path)}
                                alt={miembro.nombre}
                              />
                            ) : (
                              <span>
                                {obtenerIniciales(
                                  miembro.nombre
                                )}
                              </span>
                            )}
                          </div>

                          <small>
                            {miembro.bombo
                              ? String(miembro.bombo).toUpperCase()
                              : 'JUGADOR'}
                          </small>

                          <h2>
                            {miembro.nombre}
                          </h2>
                        </article>
                      </div>
                    )
                  )}
                </div>
              )}

              {equipoCompletoPublico && (
                <div className="nombre-equipo-publico nombre-equipo-completo">
                  {equipoActual.nombre_equipo}
                </div>
              )}
            </div>

            <div className="progreso-publico-tv">
              <span>
                {equiposReveladosVisuales}
                {' / '}
                {presentacionPublica.total_equipos}
                {' equipos revelados'}
              </span>

              <div>
                <i
                  style={{
                    width:
                      `${presentacionPublica.total_equipos > 0
                        ? (
                            equiposReveladosVisuales /
                            presentacionPublica.total_equipos
                          ) * 100
                        : 0}%`,
                  }}
                />
              </div>
            </div>

            {equiposAnteriores.length > 0 && (
              <div className="anteriores-publico-tv">
                <p>
                  EQUIPOS ANTERIORES
                </p>

                <div className="lista-anteriores-publico">
                  {equiposAnteriores.map(
                    (equipo) => (
                      <article
                        key={
                          equipo.orden_revelacion
                        }
                      >
                        <span>
                          {equipo.nombre_equipo}
                        </span>

                        {!esLigaUnicaPublica &&
                          equipo.grupo && (
                            <small>
                              {equipo.grupo}
                            </small>
                          )}
                      </article>
                    )
                  )}
                </div>
              </div>
            )}

          </section>
        )}

      {presentacionPublica &&
        finalizada &&
        mostrarResumenFinalPublico && (
          <section
            className="resumen-final-publico-tv"
            key={`resumen-${presentacionPublica.ejecucion_id}`}
          >
            <div
              className="apertura-resumen-final-tv"
              aria-hidden="true"
            >
              <span className="halo-apertura-resumen halo-apertura-resumen-1" />
              <span className="halo-apertura-resumen halo-apertura-resumen-2" />
              <span className="destello-apertura-resumen" />
            </div>

            <div
              className="confeti-resumen-final-tv"
              aria-hidden="true"
            >
              {Array.from(
                { length: 18 },
                (_, indice) => (
                  <i
                    key={indice}
                    style={{
                      '--confeti-i': indice,
                      '--confeti-delay':
                        `${450 + (indice % 6) * 80}ms`,
                      '--confeti-duracion':
                        `${1600 + (indice % 4) * 180}ms`,
                      '--confeti-deriva':
                        `${((indice % 5) - 2) * 18}px`,
                      '--confeti-rotacion':
                        `${indice * 31}deg`,
                      '--confeti-rotacion-final':
                        `${720 + indice * 23}deg`,
                    }}
                  />
                )
              )}
            </div>

            <div className="cabecera-resumen-final-tv">
              <div className="sello-resumen-final">
                ✓
              </div>

              <div>
                <p>
                  SORTEO COMPLETADO
                </p>

                <h2>
                  Resultado final
                </h2>

              </div>
            </div>

            <div className="separador-resumen-final-tv" aria-hidden="true">
              <span />
            </div>

            <div className="metricas-resumen-final-tv">
              <div>
                <span>Equipos</span>
                <strong>
                  {presentacionPublica.total_equipos}
                </strong>
              </div>

              <div>
                <span>Jugadores</span>
                <strong>
                  {totalJugadoresPublicos}
                </strong>
              </div>

              <div>
                <span>
                  {esLigaUnicaPublica
                    ? 'Formato'
                    : 'Grupos'}
                </span>

                <strong>
                  {esLigaUnicaPublica
                    ? 'Liga única'
                    : gruposResumenPublico.length}
                </strong>
              </div>
            </div>

            <div
              className={`grid-grupos-resumen-final ${
                gruposResumenPublico.length === 1
                  ? 'un-grupo-resumen-final'
                  : ''
              }`}
            >
              {gruposResumenPublico.map(
                (grupo, indiceGrupo) => (
                  <article
                    className="tarjeta-grupo-resumen-final"
                    key={grupo.nombre}
                    style={{
                      '--retraso-grupo':
                        `${indiceGrupo * 110}ms`,
                    }}
                  >
                    <header>
                      <div className="icono-grupo-resumen-final">
                        {esLigaUnicaPublica
                          ? '✓'
                          : indiceGrupo + 1}
                      </div>

                      <div>
                        <h3>
                          {grupo.nombre}
                        </h3>

                        <span>
                          {grupo.equipos.length}
                          {' '}
                          {grupo.equipos.length === 1
                            ? 'equipo'
                            : 'equipos'}
                        </span>
                      </div>
                    </header>

                    <div className="equipos-grupo-resumen-final">
                      {grupo.equipos.map(
                        (equipo, indiceEquipo) => (
                          <div
                            className="equipo-resumen-final"
                            key={
                              equipo.numero_equipo ??
                              equipo.orden_revelacion
                            }
                            style={{
                              '--retraso-equipo':
                                `${(
                                  indiceGrupo * 110 +
                                  indiceEquipo * 80
                                )}ms`,
                            }}
                          >
                            <div
                              className="miembros-equipo-resumen-final"
                              data-miembros={
                                obtenerMiembrosEquipoPublico(equipo).length
                              }
                            >
                              {obtenerMiembrosEquipoPublico(equipo).map(
                                (miembro, indiceMiembro) => (
                                  <Fragment
                                    key={
                                      miembro.codigo_jugador ||
                                      `${miembro.nombre}-${indiceMiembro}`
                                    }
                                  >
                                    {indiceMiembro > 0 && (
                                      <div className="union-resumen-final">
                                        +
                                      </div>
                                    )}

                                    <div className="pieza-miembro-resumen-final">
                                      <div
                                        className={`jugador-resumen-final ${
                                          indiceMiembro % 2 === 1
                                            ? 'jugador-resumen-invertido'
                                            : ''
                                        }`}
                                      >
                                        <div className="avatar-resumen-final">
                                          {miembro.foto_path ? (
                                            <img
                                              src={obtenerUrlFoto(miembro.foto_path)}
                                              alt={miembro.nombre}
                                            />
                                          ) : (
                                            obtenerIniciales(
                                              miembro.nombre
                                            )
                                          )}
                                        </div>

                                        <div>
                                          <strong>
                                            {miembro.nombre}
                                          </strong>

                                          <small>
                                            {miembro.bombo ?? 'Jugador'}
                                          </small>
                                        </div>
                                      </div>
                                    </div>
                                  </Fragment>
                                )
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </article>
                )
              )}
            </div>

            {presentacionPublica.huella_resultado && (
              <div
                className={`huella-publica-tv ${
                  presentacionPublica.huella_verificada === false
                    ? 'huella-publica-alerta'
                    : ''
                }`}
              >
                <span>
                  {presentacionPublica.huella_verificada === false
                    ? '⚠'
                    : '🔐'}
                </span>

                <div>
                  <small>
                    HUELLA DEL SORTEO
                  </small>

                  <strong>
                    {formatearHuellaCorta(
                      presentacionPublica.huella_resultado
                    )}
                  </strong>
                </div>
              </div>
            )}

          </section>
        )}

    </main>
  )
}


  /*
  ============================================================
  PANTALLA CONTROL MÓVIL
  ============================================================
  */

  if (
    modoControlMovil &&
    (
      pantalla === 'control-movil-cargando' ||
      cargandoControlMovil
    ) &&
    pantalla !== 'login'
  ) {
    return (
      <main className="app app-control-movil">
        <section className="control-movil control-movil-cargando">
          <div className="logo-control-movil">
            📱
          </div>

          <p className="etiqueta">
            CONTROL MÓVIL
          </p>

          <h1>
            Conectando…
          </h1>

          <p>
            Recuperando el estado de la presentación.
          </p>
        </section>
      </main>
    )
  }


  if (
    pantalla === 'control-movil'
  ) {
    const estadoActualMovil =
      String(
        estadoPresentacion?.estado ?? ''
      ).toLowerCase()

    const totalEquiposMovil =
      Number(
        estadoPresentacion?.total_equipos ?? 0
      )

    const reveladosMovil =
      Number(
        estadoPresentacion?.equipos_revelados ?? 0
      )

    const pendientesMovil =
      Number(
        estadoPresentacion?.equipos_pendientes ?? 0
      )

    const porcentajeMovil =
      totalEquiposMovil > 0
        ? Math.round(
            (
              reveladosMovil /
              totalEquiposMovil
            ) * 100
          )
        : 0

    const ultimoEquipoMovil =
      equiposReveladosControl.length > 0
        ? equiposReveladosControl[
            equiposReveladosControl.length - 1
          ]
        : null

    const miembrosUltimoMovil =
      ultimoEquipoMovil
        ? obtenerMiembrosEquipoPublico(
            ultimoEquipoMovil
          )
        : []

    const esLigaUnicaMovil =
      String(
        sorteoSeleccionado?.formato_sorteo ??
        'grupos'
      ).toLowerCase() ===
      'liga_unica'

    const puedeRevelarMovil =
      estadoActualMovil === 'en_curso' &&
      pendientesMovil > 0 &&
      !accionPresentacion &&
      !bloqueoSecuenciaPresentacion &&
      !repeticionEnCursoControl

    return (
      <main className="app app-control-movil">
        <section className="control-movil">
          <header className="cabecera-control-movil">
            <div>
              <p className="etiqueta">
                📱 CONTROL MÓVIL
              </p>

              <h1>
                {sorteoSeleccionado?.nombre ??
                  'Presentación'}
              </h1>
            </div>

            <button
              type="button"
              className="salir-control-movil"
              onClick={salirDelControlMovil}
              aria-label="Salir del control móvil"
            >
              ×
            </button>
          </header>

          {errorControlMovil && (
            <div className="error-control-movil">
              {errorControlMovil}
            </div>
          )}

          {estadoPresentacion && (
            <>
              <div className="estado-control-movil">
                <span
                  className={`punto-directo estado-directo-${estadoActualMovil || 'desconocido'}`}
                />

                <div>
                  <small>
                    ESTADO
                  </small>

                  <strong>
                    {estadoActualMovil === 'generada'
                      ? 'Preparada'
                      : estadoActualMovil === 'en_curso'
                        ? 'En directo'
                        : estadoActualMovil === 'finalizada'
                          ? 'Finalizada'
                          : estadoPresentacion.estado}
                  </strong>
                </div>

                {estadoPresentacion.es_oficial && (
                  <em>
                    🏆 OFICIAL
                  </em>
                )}
              </div>

              <div className="progreso-control-movil">
                <div className="numeros-control-movil">
                  <div>
                    <span>Revelados</span>
                    <strong>
                      {reveladosMovil}
                      <small>
                        /{totalEquiposMovil}
                      </small>
                    </strong>
                  </div>

                  <div>
                    <span>Pendientes</span>
                    <strong>
                      {pendientesMovil}
                    </strong>
                  </div>
                </div>

                <div className="barra-control-movil">
                  <span
                    style={{
                      width: `${porcentajeMovil}%`,
                    }}
                  />
                </div>
              </div>

              <section className="ultimo-control-movil">
                <span className="titulo-bloque-control-movil">
                  ÚLTIMO EQUIPO
                </span>

                {ultimoEquipoMovil ? (
                  <>
                    <div className="cabecera-ultimo-control-movil">
                      <strong>
                        {ultimoEquipoMovil.nombre_equipo}
                      </strong>

                      {!esLigaUnicaMovil &&
                        ultimoEquipoMovil.grupo && (
                          <small>
                            {ultimoEquipoMovil.grupo}
                          </small>
                        )}
                    </div>

                    <div className="miembros-ultimo-control-movil">
                      {miembrosUltimoMovil.map(
                        (miembro, indice) => (
                          <div
                            className="miembro-control-movil"
                            key={
                              miembro.codigo_jugador ||
                              `${miembro.nombre}-${indice}`
                            }
                          >
                            <div className="avatar-control-movil">
                              {(
                                miembro.foto_path ||
                                fotosControlPresentacion[
                                  miembro.codigo_jugador
                                ]
                              ) ? (
                                <img
                                  src={obtenerUrlFoto(
                                    miembro.foto_path ||
                                    fotosControlPresentacion[
                                      miembro.codigo_jugador
                                    ]
                                  )}
                                  alt={miembro.nombre}
                                />
                              ) : (
                                <span>
                                  {obtenerIniciales(
                                    miembro.nombre
                                  )}
                                </span>
                              )}
                            </div>

                            <div>
                              <strong>
                                {miembro.nombre}
                              </strong>

                              <small>
                                {miembro.bombo ??
                                  'Jugador'}
                              </small>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </>
                ) : (
                  <p className="sin-equipo-control-movil">
                    Todavía no se ha revelado ningún equipo.
                  </p>
                )}
              </section>

              {mensajePresentacion && (
                <div className="mensaje-control-movil">
                  {mensajePresentacion}
                </div>
              )}

              <div className="acciones-secundarias-control-movil">
                <button
                  type="button"
                  onClick={abrirPantallaPublica}
                >
                  🖥 TV
                </button>

                <button
                  type="button"
                  disabled={
                    cargandoControlPresentacion ||
                    accionPresentacion
                  }
                  onClick={() =>
                    cargarEstadoControlPresentacion(
                      ejecucionControlMovilId
                    )
                  }
                >
                  ↻ Actualizar
                </button>
              </div>

              {estadoActualMovil === 'finalizada' && (
                <>
                  <div className="estado-finalizado-control-movil">
                    <span>✓</span>
                    <div>
                      <strong>Sorteo finalizado</strong>
                      <small>
                        Ya no quedan equipos por revelar.
                      </small>
                    </div>
                  </div>

                  {!resumenFinalEnviado &&
                    !repeticionEnCursoControl && (
                      <div className="zona-boton-principal-control-movil">
                        <button
                          type="button"
                          className="boton-grande-control-movil"
                          disabled={
                            accionPresentacion
                          }
                          onClick={
                            mostrarResumenFinalEnTv
                          }
                        >
                          {accionPresentacion
                            ? 'ENVIANDO…'
                            : '📊 MOSTRAR RESUMEN FINAL'}
                        </button>
                      </div>
                    )}

                  <div className="acciones-final-control-movil">
                    <button
                      type="button"
                      disabled={
                        accionPresentacion ||
                        repeticionEnCursoControl
                      }
                      onClick={
                        repetirPresentacionEnTv
                      }
                    >
                      {repeticionEnCursoControl
                        ? '⏳ Reproduciendo…'
                        : '🔁 Repetir presentación'}
                    </button>

                    {resumenFinalEnviado && (
                      <span className="estado-resumen-control-movil">
                        ✓ Resumen mostrado
                      </span>
                    )}
                  </div>
                </>
              )}

              {estadoActualMovil !== 'finalizada' && (
                <div className="zona-boton-principal-control-movil">
                  {estadoActualMovil === 'generada' ? (
                  <button
                    type="button"
                    className="boton-grande-control-movil boton-iniciar-control-movil"
                    disabled={
                      accionPresentacion
                    }
                    onClick={
                      solicitarInicioPresentacion
                    }
                  >
                    ▶ INICIAR PRESENTACIÓN
                  </button>
                ) : estadoActualMovil === 'en_curso' ? (
                  <button
                    type="button"
                    className="boton-grande-control-movil"
                    disabled={
                      !puedeRevelarMovil
                    }
                    onClick={
                      revelarSiguienteEquipo
                    }
                  >
                    {accionPresentacion
                      ? 'ENVIANDO…'
                      : bloqueoSecuenciaPresentacion
                        ? '⏳ ESPERANDO ANIMACIÓN…'
                        : pendientesMovil > 0
                          ? '▶ REVELAR SIGUIENTE EQUIPO'
                          : '✓ TODOS REVELADOS'}
                  </button>
                  ) : null}
                </div>
              )}
            </>
          )}

          {!estadoPresentacion &&
            !cargandoControlMovil && (
              <div className="sin-equipo-control-movil">
                No se ha podido cargar la presentación.
              </div>
            )}

          {mostrarConfirmacionInicioPresentacion && (
            <div
              className="modal-fondo"
              onClick={() =>
                setMostrarConfirmacionInicioPresentacion(
                  false
                )
              }
            >
              <div
                className="modal-confirmacion"
                role="dialog"
                aria-modal="true"
                onClick={(evento) =>
                  evento.stopPropagation()
                }
              >
                <div className="modal-icono">
                  ▶
                </div>

                <h3>
                  ¿Iniciar la presentación?
                </h3>

                <p>
                  La TV quedará preparada y ningún equipo
                  se mostrará hasta que pulses
                  «Revelar siguiente equipo».
                </p>

                <div className="modal-acciones">
                  <button
                    type="button"
                    className="boton boton-secundario"
                    onClick={() =>
                      setMostrarConfirmacionInicioPresentacion(
                        false
                      )
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="boton boton-principal"
                    onClick={
                      confirmarInicioPresentacion
                    }
                    disabled={
                      accionPresentacion
                    }
                  >
                    ▶ Iniciar
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    )
  }


  /*
  ============================================================
  PANTALLA DE LOGIN
  ============================================================
  */

  if (pantalla === 'login') {
    return (
      <main className="app">
        <section className="inicio">

          <div className="logo">
            🔐
          </div>

          <p className="etiqueta">
            {modoControlMovil
              ? 'CONTROL MÓVIL'
              : 'ADMINISTRACIÓN'}
          </p>

          <h1>
            Acceso
          </h1>

          <p className="descripcion">
            {modoControlMovil
              ? 'Identifícate para controlar esta presentación desde el móvil.'
              : 'Identifícate para gestionar y controlar los sorteos.'}
          </p>

          <form
            className="formulario-login"
            onSubmit={iniciarSesion}
          >
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              required
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              required
            />

            <button
              className="boton boton-principal"
              type="submit"
              disabled={cargandoLogin}
            >
              {cargandoLogin
                ? 'Comprobando...'
                : 'Entrar'}
            </button>
          </form>

          {mensajeLogin && (
            <p className="mensaje-login">
              {mensajeLogin}
            </p>
          )}

          <button
            className="boton-volver"
            onClick={() => {
              setMensajeLogin('')

              if (modoControlMovil) {
                salirDelControlMovil()
              } else {
                setPantalla('inicio')
              }
            }}
          >
            ← Volver
          </button>

        </section>
      </main>
    )
  }

  /*
  ============================================================
  PANTALLA NUEVO SORTEO
  ============================================================
  */

  if (
    pantalla === 'nuevo-sorteo'
  ) {
    return (
      <main className="app">
        <section className="inicio">

          <p className="etiqueta">
            ADMINISTRACIÓN
          </p>

          <h1>
            Nuevo sorteo
          </h1>

          <p className="descripcion">
            Crea la configuración básica del nuevo sorteo.
          </p>

          <form
            className="formulario-login formulario-sorteo"
            onSubmit={guardarNuevoSorteo}
          >
            <input
              type="text"
              placeholder="Nombre del sorteo"
              value={nuevoNombre}
              onChange={(e) =>
                setNuevoNombre(
                  e.target.value
                )
              }
              required
            />

            <textarea
              placeholder="Descripción (opcional)"
              value={nuevaDescripcion}
              onChange={(e) =>
                setNuevaDescripcion(
                  e.target.value
                )
              }
            />

            <label className="campo-formulario">

              <span>
                Fecha del evento
              </span>

              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) =>
                  setNuevaFecha(
                    e.target.value
                  )
                }
              />

            </label>

            <label className="campo-formulario">

              <span>
                Jugadores por equipo
              </span>

              <select
                value={nuevosJugadoresPorEquipo}
                onChange={(e) =>
                  setNuevosJugadoresPorEquipo(
                    Number(e.target.value)
                  )
                }
              >
                {[2, 3, 4, 5, 6].map((cantidad) => (
                  <option key={cantidad} value={cantidad}>
                    {cantidad} jugadores
                  </option>
                ))}
              </select>

              <small className="ayuda-campo-formulario">
                Todos los equipos del sorteo tendrán el mismo tamaño.
              </small>

            </label>

            <label className="campo-formulario">

              <span>
                Formato del sorteo
              </span>

              <select
                value={nuevoFormatoSorteo}
                onChange={(e) =>
                  setNuevoFormatoSorteo(
                    e.target.value
                  )
                }
              >
                <option value="grupos">
                  Por grupos
                </option>

                <option value="liga_unica">
                  Liga única / Sin grupos
                </option>
              </select>

            </label>

            {nuevoFormatoSorteo === 'grupos' && (
              <>
                <label className="campo-formulario">

                  <span>
                    Número de grupos
                  </span>

                  <input
                    type="number"
                    min="1"
                    value={nuevosGrupos}
                    onChange={(e) =>
                      setNuevosGrupos(
                        e.target.value
                      )
                    }
                    required
                  />

                </label>

                <label className="campo-formulario">

                  <span>
                    Reparto entre grupos
                  </span>

                  <select
                    value={nuevaDistribucionGrupos}
                    onChange={(e) =>
                      setNuevaDistribucionGrupos(
                        e.target.value
                      )
                    }
                  >
                    <option value="equilibrada">
                      Equilibrado por emparejamientos
                    </option>

                    <option value="aleatoria">
                      Aleatorio
                    </option>
                  </select>

                </label>

                <p className="descripcion-regla">
                  Equilibrado reparte lo máximo posible cada tipo de
                  emparejamiento entre todos los grupos. Aleatorio mantiene
                  los grupos del mismo tamaño, pero no fuerza ese equilibrio.
                </p>
              </>
            )}

            <button
              className="boton boton-principal"
              type="submit"
              disabled={guardandoSorteo}
            >
              {guardandoSorteo
                ? 'Guardando...'
                : 'Crear sorteo'}
            </button>

          </form>

          {mensajeNuevoSorteo && (
            <p className="mensaje-login">
              {mensajeNuevoSorteo}
            </p>
          )}

          <button
            className="boton-volver"
            onClick={() => {
              setMensajeNuevoSorteo('')
              setPantalla('admin')
            }}
          >
            ← Volver al panel
          </button>

        </section>
      </main>
    )
  }

/*
============================================================
NUEVO BOMBO
============================================================
*/

if (
  pantalla === 'nuevo-bombo' &&
  sorteoSeleccionado
) {
  return (
    <main className="app">
      <section className="inicio">

        <p className="etiqueta">
          CONFIGURACIÓN
        </p>

        <h1>
          Nuevo bombo
        </h1>

        <p className="descripcion">
          {sorteoSeleccionado.nombre}
        </p>

        <form
          className="formulario-login formulario-sorteo"
          onSubmit={guardarNuevoBombo}
        >

          <label className="campo-formulario">
            <span>
              Código
            </span>

            <input
              type="text"
              placeholder="Ej. A"
              maxLength="10"
              value={nuevoCodigoBombo}
              onChange={(e) =>
                setNuevoCodigoBombo(
                  e.target.value
                )
              }
              required
            />
          </label>

          <label className="campo-formulario">
            <span>
              Nombre
            </span>

            <input
              type="text"
              placeholder="Ej. Bombo A"
              value={nuevoNombreBombo}
              onChange={(e) =>
                setNuevoNombreBombo(
                  e.target.value
                )
              }
              required
            />
          </label>

          <label className="campo-formulario">
            <span>
              Orden
            </span>

            <input
              type="number"
              min="1"
              value={nuevoOrdenBombo}
              onChange={(e) =>
                setNuevoOrdenBombo(
                  e.target.value
                )
              }
              required
            />
          </label>

          <textarea
            placeholder="Descripción (opcional)"
            value={nuevaDescripcionBombo}
            onChange={(e) =>
              setNuevaDescripcionBombo(
                e.target.value
              )
            }
          />

          <button
            className="boton boton-principal"
            type="submit"
            disabled={guardandoBombo}
          >
            {guardandoBombo
              ? 'Guardando...'
              : 'Crear bombo'}
          </button>

        </form>

        {mensajeNuevoBombo && (
          <p className="mensaje-login">
            {mensajeNuevoBombo}
          </p>
        )}

        <button
          className="boton-volver"
          onClick={() => {
            setMensajeNuevoBombo('')
            setPantalla('bombos')
          }}
        >
          ← Volver a Bombos
        </button>

      </section>
    </main>
  )
}


  /*
  ============================================================
  EDITAR BOMBO
  ============================================================
  */

  if (
    pantalla === 'editar-bombo' &&
    sorteoSeleccionado &&
    bomboEditando
  ) {
    return (
      <main className="app">
        <section className="inicio">

          <p className="etiqueta">
            CONFIGURACIÓN
          </p>

          <h1>
            Editar bombo
          </h1>

          <p className="descripcion">
            {sorteoSeleccionado.nombre}
          </p>

          <form
            className="formulario-login formulario-sorteo"
            onSubmit={
              guardarEdicionBombo
            }
          >
            <label className="campo-formulario">
              <span>
                Código
              </span>

              <input
                type="text"
                value={
                  codigoEditarBombo
                }
                onChange={(evento) =>
                  setCodigoEditarBombo(
                    evento.target.value
                  )
                }
                placeholder="A"
                maxLength={10}
                required
              />
            </label>

            <label className="campo-formulario">
              <span>
                Nombre
              </span>

              <input
                type="text"
                value={
                  nombreEditarBombo
                }
                onChange={(evento) =>
                  setNombreEditarBombo(
                    evento.target.value
                  )
                }
                placeholder="Bombo A"
                required
              />
            </label>

            <label className="campo-formulario">
              <span>
                Orden
              </span>

              <input
                type="number"
                min="1"
                step="1"
                value={
                  ordenEditarBombo
                }
                onChange={(evento) =>
                  setOrdenEditarBombo(
                    evento.target.value
                  )
                }
                required
              />
            </label>

            <label className="campo-formulario">
              <span>
                Descripción
              </span>

              <textarea
                value={
                  descripcionEditarBombo
                }
                onChange={(evento) =>
                  setDescripcionEditarBombo(
                    evento.target.value
                  )
                }
                placeholder="Descripción opcional"
                rows="3"
              />
            </label>

            <button
              type="submit"
              className="boton boton-principal"
              disabled={
                guardandoEdicionBombo
              }
            >
              {guardandoEdicionBombo
                ? 'Guardando...'
                : 'Guardar cambios'}
            </button>

          </form>

          {mensajeEditarBombo && (
            <p className="mensaje-login">
              {mensajeEditarBombo}
            </p>
          )}

          <button
            className="boton-volver"
            onClick={() => {
              setMensajeEditarBombo('')
              setBomboEditando(null)
              setPantalla('bombos')
            }}
          >
            ← Volver a Bombos
          </button>

        </section>
      </main>
    )
  }


  /*
  ============================================================
  PANTALLA BOMBOS
  ============================================================
  */

  if (
    pantalla === 'bombos' &&
    sorteoSeleccionado
  ) {
    const objetivoBombos =
      Number(cantidadBombosObjetivo) || 0

    const cantidadBombosACrear =
      Math.max(
        0,
        objetivoBombos -
        bombos.length
      )

    const codigosExistentesPreview =
      new Set(
        bombos.map(
          (bombo) =>
            String(
              bombo.codigo ?? ''
            )
              .trim()
              .toUpperCase()
        )
      )

    const codigosBombosPreview = []
    let indiceCodigoPreview = 0

    while (
      codigosBombosPreview.length <
        Math.min(
          cantidadBombosACrear,
          12
        )
    ) {
      const codigo =
        generarCodigoBomboAutomatico(
          indiceCodigoPreview
        )

      indiceCodigoPreview += 1

      if (
        codigosExistentesPreview.has(
          codigo
        )
      ) {
        continue
      }

      codigosExistentesPreview.add(
        codigo
      )

      codigosBombosPreview.push(
        codigo
      )
    }

    return (
      <main className="app app-admin">
        <section className="panel-admin">

          <button
            className="boton-volver"
            onClick={() =>
              setPantalla(
                'gestionar-sorteo'
              )
            }
          >
            ← Volver al sorteo
          </button>

          <header className="cabecera-gestion">

            <div>
              <p className="etiqueta">
                CONFIGURACIÓN
              </p>

              <h2>
                Bombos
              </h2>

              <p className="descripcion-admin">
                {sorteoSeleccionado.nombre}
              </p>
            </div>

            <div className="acciones-bombos">

  <button
    className="boton boton-secundario"
    onClick={() => {
      setCantidadBombosObjetivo(
        bombos.length > 0
          ? bombos.length
          : 4
      )

      setMensajeBombos('')
      setMostrarCreadorBombos(true)
    }}
    disabled={creandoBombosAutomaticos}
  >
    ⚡ Crear automáticamente
  </button>

  <button
    className="boton boton-principal"
    onClick={() => {
      setNuevoOrdenBombo(
        bombos.length + 1
      )

      setPantalla('nuevo-bombo')
    }}
  >
    + Nuevo bombo
  </button>

</div>

</header>

          {!cargandoBombos &&
            !errorBombos && (
              <div className="resumen-bombos-configurables">
                <div>
                  <span>Bombos configurados</span>
                  <strong>{bombos.length}</strong>
                </div>

                <div>
                  <span>Creación automática</span>
                  <strong>
                    A · B · C · … · Z · AA · AB…
                  </strong>
                </div>

                <p>
                  Puedes crear tantos bombos como necesites y después
                  editar libremente su código, nombre, orden y descripción.
                </p>
              </div>
            )}

          {cargandoBombos && (
            <p className="estado">
              Cargando bombos...
            </p>
          )}

          {errorBombos && (
            <p className="mensaje-login">
              Error: {errorBombos}
            </p>
          )}

          {mensajeBombos && (
          <p className="estado">
          {mensajeBombos}
           </p>
          )}

          {!cargandoBombos &&
            !errorBombos &&
            bombos.length === 0 && (
              <div className="sin-datos">

                <p>
                  Este sorteo todavía no tiene bombos.
                </p>

                <span>
                  Puedes crearlos automáticamente indicando la cantidad
                  que necesites o añadirlos uno a uno manualmente.
                </span>

              </div>
            )}

          <div className="lista-bombos">

            {bombos.map(
              (bombo) => (
                <article
                  className="tarjeta-bombo"
                  key={bombo.id}
                >

                  <div className="codigo-bombo">
                    {bombo.codigo}
                  </div>

                  <div className="info-bombo">

                    <h3>
                      {bombo.nombre}
                    </h3>

                    {bombo.descripcion && (
                      <p>
                        {bombo.descripcion}
                      </p>
                    )}

                    <span>
                      Orden: {bombo.orden}
                    </span>

                  </div>

                  <div className="acciones-tarjeta-bombo">
                    <button
                      type="button"
                      className="boton-accion-jugador"
                      onClick={() =>
                        abrirEditarBombo(
                          bombo
                        )
                      }
                    >
                      ✏ Editar
                    </button>

                    <button
                      type="button"
                      className="boton-accion-jugador boton-eliminar-bombo"
                      onClick={() => {
                        setMensajeBombos('')
                        setBomboPendienteEliminar(
                          bombo
                        )
                      }}
                    >
                      🗑 Eliminar
                    </button>
                  </div>

                </article>
              )
            )}

          </div>

          {mostrarCreadorBombos && (
            <div
              className="modal-fondo"
              onClick={() => {
                if (
                  !creandoBombosAutomaticos
                ) {
                  setMostrarCreadorBombos(
                    false
                  )
                }
              }}
            >
              <div
                className="modal-confirmacion modal-creador-bombos"
                role="dialog"
                aria-modal="true"
                onClick={(evento) =>
                  evento.stopPropagation()
                }
              >
                <div className="modal-icono">
                  ⚡
                </div>

                <h3>
                  Crear bombos automáticamente
                </h3>

                <p>
                  Indica cuántos bombos quieres tener en total.
                  El sistema añadirá únicamente los que falten.
                </p>

                <div className="contador-bombos-automaticos">
                  <button
                    type="button"
                    aria-label="Restar un bombo"
                    disabled={
                      creandoBombosAutomaticos ||
                      objetivoBombos <= 1
                    }
                    onClick={() =>
                      setCantidadBombosObjetivo(
                        Math.max(
                          1,
                          objetivoBombos - 1
                        )
                      )
                    }
                  >
                    −
                  </button>

                  <label>
                    <span>Número total de bombos</span>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={cantidadBombosObjetivo}
                      disabled={
                        creandoBombosAutomaticos
                      }
                      onChange={(e) =>
                        setCantidadBombosObjetivo(
                          e.target.value
                        )
                      }
                    />
                  </label>

                  <button
                    type="button"
                    aria-label="Añadir un bombo"
                    disabled={
                      creandoBombosAutomaticos
                    }
                    onClick={() =>
                      setCantidadBombosObjetivo(
                        Math.max(
                          1,
                          objetivoBombos + 1
                        )
                      )
                    }
                  >
                    +
                  </button>
                </div>

                <div className="atajos-cantidad-bombos">
                  {[2, 3, 4, 6, 8, 10].map(
                    (cantidad) => (
                      <button
                        type="button"
                        key={cantidad}
                        className={
                          objetivoBombos ===
                          cantidad
                            ? 'atajo-bombos-activo'
                            : ''
                        }
                        disabled={
                          creandoBombosAutomaticos
                        }
                        onClick={() =>
                          setCantidadBombosObjetivo(
                            cantidad
                          )
                        }
                      >
                        {cantidad}
                      </button>
                    )
                  )}
                </div>

                <div className="preview-creacion-bombos">
                  <div>
                    <span>
                      Actualmente
                    </span>

                    <strong>
                      {bombos.length}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Se crearán
                    </span>

                    <strong>
                      {cantidadBombosACrear}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Total final
                    </span>

                    <strong>
                      {Math.max(
                        bombos.length,
                        objetivoBombos
                      )}
                    </strong>
                  </div>
                </div>

                {cantidadBombosACrear > 0 ? (
                  <div className="codigos-preview-bombos">
                    <span>
                      Nuevos códigos
                    </span>

                    <div>
                      {codigosBombosPreview.map(
                        (codigo) => (
                          <strong
                            key={codigo}
                          >
                            {codigo}
                          </strong>
                        )
                      )}

                      {cantidadBombosACrear >
                        codigosBombosPreview.length && (
                        <em>
                          +{
                            cantidadBombosACrear -
                            codigosBombosPreview.length
                          } más
                        </em>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="aviso-creador-bombos">
                    {objetivoBombos ===
                    bombos.length
                      ? 'Ya tienes exactamente esa cantidad de bombos.'
                      : 'La creación automática no elimina bombos. Para reducir la cantidad, elimina manualmente los que no necesites.'}
                  </div>
                )}

                <div className="modal-acciones">
                  <button
                    type="button"
                    className="boton boton-secundario"
                    disabled={
                      creandoBombosAutomaticos
                    }
                    onClick={() =>
                      setMostrarCreadorBombos(
                        false
                      )
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="boton boton-principal"
                    disabled={
                      creandoBombosAutomaticos ||
                      cantidadBombosACrear <= 0
                    }
                    onClick={
                      crearBombosAutomaticos
                    }
                  >
                    {creandoBombosAutomaticos
                      ? 'Creando...'
                      : cantidadBombosACrear === 1
                        ? '⚡ Crear 1 bombo'
                        : `⚡ Crear ${cantidadBombosACrear} bombos`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {bomboPendienteEliminar && (
            <div
              className="modal-fondo"
              onClick={() =>
                !eliminandoBombo &&
                setBomboPendienteEliminar(
                  null
                )
              }
            >
              <div
                className="modal-confirmacion"
                onClick={(evento) =>
                  evento.stopPropagation()
                }
              >
                <div className="modal-icono modal-icono-peligro">
                  🗑
                </div>

                <h3>
                  ¿Eliminar este bombo?
                </h3>

                <p>
                  Vas a eliminar{' '}
                  <strong>
                    {bomboPendienteEliminar.nombre}
                  </strong>{' '}
                  ({bomboPendienteEliminar.codigo}).
                </p>

                <div className="modal-aviso">
                  Si tiene jugadores asignados o aparece en alguna regla de emparejamiento, no se permitirá eliminarlo.
                </div>

                <div className="modal-acciones">
                  <button
                    type="button"
                    className="boton boton-secundario"
                    onClick={() =>
                      setBomboPendienteEliminar(
                        null
                      )
                    }
                    disabled={
                      eliminandoBombo
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="boton boton-peligro"
                    onClick={
                      confirmarEliminarBombo
                    }
                    disabled={
                      eliminandoBombo
                    }
                  >
                    {eliminandoBombo
                      ? 'Eliminando...'
                      : 'Eliminar bombo'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </section>
      </main>
    )
  }


/*
============================================================
GESTIÓN DEL CATÁLOGO GENERAL
============================================================
*/

if (
  pantalla === 'gestion-catalogo'
) {
  const termino =
    catalogoGestionBusqueda
      .trim()
      .toLowerCase()

  const jugadoresFiltrados =
    catalogoJugadores.filter(
      (jugador) => {
        if (!termino) {
          return true
        }

        const texto =
          [
            jugador.codigo_jugador,
            jugador.nombre,
            jugador.apellidos,
            jugador.alias,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

        return texto.includes(
          termino
        )
      }
    )

  return (
    <main className="app app-admin">
      <section className="panel-admin">

        <button
          className="boton-volver"
          onClick={() =>
            setPantalla('admin')
          }
        >
          ← Volver al panel
        </button>

        <header className="cabecera-gestion">
          <div>
            <p className="etiqueta">
              BASE DE DATOS
            </p>

            <h2>
              Catálogo de jugadores
            </h2>

            <p className="descripcion-admin">
              Aquí se gestionan las fichas globales. Después, en cada sorteo, solo seleccionas quién participa.
            </p>
          </div>
        </header>

        <form
          className="panel-crear-catalogo"
          onSubmit={
            crearJugadorSoloCatalogo
          }
        >
          <div className="cabecera-panel-catalogo">
            <div>
              <h3>
                + Añadir jugador al catálogo
              </h3>

              <p>
                No se añadirá a ningún sorteo automáticamente.
              </p>
            </div>

            <div className="foto-catalogo-alta">
              {catalogoNuevaFotoPreview ? (
                <img
                  src={catalogoNuevaFotoPreview}
                  alt="Vista previa"
                />
              ) : (
                <span>👤</span>
              )}
            </div>
          </div>

          <div className="formulario-catalogo-global">
            <label>
              <span>Código *</span>

              <input
                type="text"
                value={catalogoNuevoCodigo}
                onChange={(evento) =>
                  setCatalogoNuevoCodigo(
                    evento.target.value
                  )
                }
                placeholder="J001"
                required
              />
            </label>

            <label>
              <span>Nombre *</span>

              <input
                type="text"
                value={catalogoNuevoNombre}
                onChange={(evento) =>
                  setCatalogoNuevoNombre(
                    evento.target.value
                  )
                }
                placeholder="Manolo"
                required
              />
            </label>

            <label>
              <span>Apellidos</span>

              <input
                type="text"
                value={catalogoNuevoApellidos}
                onChange={(evento) =>
                  setCatalogoNuevoApellidos(
                    evento.target.value
                  )
                }
                placeholder="Opcional"
              />
            </label>

            <label>
              <span>Alias</span>

              <input
                type="text"
                value={catalogoNuevoAlias}
                onChange={(evento) =>
                  setCatalogoNuevoAlias(
                    evento.target.value
                  )
                }
                placeholder="Opcional"
              />
            </label>

            <label className="campo-foto-catalogo">
              <span>Foto</span>

              <input
                type="file"
                accept="image/*"
                onChange={(evento) => {
                  const archivo =
                    evento.target.files?.[0] ??
                    null

                  if (
                    archivo &&
                    archivo.size >
                      5 * 1024 * 1024
                  ) {
                    setCatalogoGestionMensaje(
                      'La foto no puede superar 5 MB.'
                    )
                    evento.target.value = ''
                    return
                  }

                  setCatalogoNuevaFoto(
                    archivo
                  )

                  setCatalogoNuevaFotoPreview(
                    archivo
                      ? URL.createObjectURL(
                          archivo
                        )
                      : ''
                  )
                }}
              />
            </label>

            <button
              type="submit"
              className="boton boton-principal"
              disabled={
                catalogoGuardandoNuevo
              }
            >
              {catalogoGuardandoNuevo
                ? 'Guardando...'
                : '+ Añadir al catálogo'}
            </button>
          </div>
        </form>

        <div className="barra-catalogo-jugadores">
          <div className="buscador-catalogo-jugadores">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Buscar jugador..."
              value={catalogoGestionBusqueda}
              onChange={(evento) =>
                setCatalogoGestionBusqueda(
                  evento.target.value
                )
              }
            />
          </div>

          <div className="contador-catalogo-jugadores">
            <strong>
              {jugadoresFiltrados.length}
            </strong>

            <span>
              jugadores
            </span>
          </div>
        </div>

        {catalogoGestionMensaje && (
          <p className="mensaje-catalogo-jugadores">
            {catalogoGestionMensaje}
          </p>
        )}

        {catalogoGestionCargando && (
          <p className="estado">
            Cargando catálogo...
          </p>
        )}

        {catalogoGestionError && (
          <p className="mensaje-login">
            Error: {catalogoGestionError}
          </p>
        )}

        <div className="lista-catalogo-jugadores">
          {jugadoresFiltrados.map(
            (jugador) => {
              const nombreCompleto =
                [
                  jugador.nombre,
                  jugador.apellidos,
                ]
                  .filter(Boolean)
                  .join(' ')

              const nombreVisible =
                jugador.alias ||
                nombreCompleto ||
                jugador.codigo_jugador

              return (
                <article
                  className="tarjeta-catalogo-jugador tarjeta-catalogo-gestion"
                  key={jugador.id}
                >
                  <div className="identidad-catalogo-jugador">
                    <div className="avatar-catalogo-jugador">
                      {jugador.foto_path ? (
                        <img
                          src={obtenerUrlFoto(
                            jugador.foto_path
                          )}
                          alt={nombreVisible}
                        />
                      ) : (
                        <span>
                          {obtenerIniciales(
                            nombreVisible
                          )}
                        </span>
                      )}
                    </div>

                    <div className="texto-catalogo-jugador">
                      <h3>
                        {nombreVisible}
                      </h3>

                      {jugador.alias &&
                        nombreCompleto && (
                          <p>
                            {nombreCompleto}
                          </p>
                        )}

                      <small>
                        {jugador.codigo_jugador}
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="boton-accion-jugador boton-eliminar-catalogo"
                    onClick={() =>
                      setJugadorCatalogoPendienteEliminar(
                        jugador
                      )
                    }
                  >
                    🗑 Eliminar
                  </button>
                </article>
              )
            }
          )}
        </div>

        {jugadorCatalogoPendienteEliminar && (
          <div
            className="modal-fondo"
            onClick={() =>
              !eliminandoJugadorCatalogo &&
              setJugadorCatalogoPendienteEliminar(
                null
              )
            }
          >
            <div
              className="modal-confirmacion"
              onClick={(evento) =>
                evento.stopPropagation()
              }
            >
              <div className="modal-icono modal-icono-peligro">
                🗑
              </div>

              <h3>
                ¿Eliminar jugador del catálogo?
              </h3>

              <p>
                Se eliminará la ficha global de{' '}
                <strong>
                  {jugadorCatalogoPendienteEliminar.alias ||
                    jugadorCatalogoPendienteEliminar.nombre}
                </strong>.
              </p>

              <div className="modal-aviso">
                Si el jugador todavía participa en algún sorteo, el sistema no permitirá borrarlo. Primero tendrás que eliminarlo de esos sorteos.
              </div>

              <div className="modal-acciones">
                <button
                  type="button"
                  className="boton boton-secundario"
                  onClick={() =>
                    setJugadorCatalogoPendienteEliminar(
                      null
                    )
                  }
                  disabled={
                    eliminandoJugadorCatalogo
                  }
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="boton boton-peligro"
                  onClick={
                    confirmarEliminarJugadorCatalogo
                  }
                  disabled={
                    eliminandoJugadorCatalogo
                  }
                >
                  {eliminandoJugadorCatalogo
                    ? 'Eliminando...'
                    : 'Eliminar definitivamente'}
                </button>
              </div>
            </div>
          </div>
        )}

      </section>
    </main>
  )
}


/*
============================================================
CATÁLOGO GENERAL DE JUGADORES
============================================================
*/

if (
  pantalla === 'catalogo-jugadores' &&
  sorteoSeleccionado
) {
  const idsParticipantes =
    new Set(
      participantes.map(
        (participante) =>
          participante.jugador_id
      )
    )

  const terminoBusqueda =
    busquedaCatalogoJugadores
      .trim()
      .toLowerCase()

  const jugadoresFiltrados =
    catalogoJugadores.filter(
      (jugador) => {
        if (!terminoBusqueda) {
          return true
        }

        const texto =
          [
            jugador.codigo_jugador,
            jugador.nombre,
            jugador.apellidos,
            jugador.alias,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

        return texto.includes(
          terminoBusqueda
        )
      }
    )

  return (
    <main className="app app-admin">
      <section className="panel-admin">

        <button
          className="boton-volver"
          onClick={() => {
            setMensajeCatalogoJugadores('')
            setBusquedaCatalogoJugadores('')
            abrirJugadores()
          }}
        >
          ← Volver a Jugadores
        </button>

        <header className="cabecera-gestion">
          <div>
            <p className="etiqueta">
              CATÁLOGO GENERAL
            </p>

            <h2>
              Seleccionar participantes
            </h2>

            <p className="descripcion-admin">
              Elige jugadores ya guardados y asígnalos a un bombo de {sorteoSeleccionado.nombre}.
            </p>
          </div>

          <button
            type="button"
            className="boton boton-secundario"
            onClick={() => {
              setCodigoNuevoJugador('')
              setNombreNuevoJugador('')
              setApellidosNuevoJugador('')
              setAliasNuevoJugador('')
              setBomboNuevoJugador('')
              setFotoNuevoJugador(null)
              setPreviewFotoJugador('')
              setMensajeNuevoJugador('')

              setPantalla('nuevo-jugador')
            }}
          >
            + Crear nuevo
          </button>
        </header>

        <div className="barra-catalogo-jugadores">
          <div className="buscador-catalogo-jugadores">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Buscar por nombre, alias o código..."
              value={busquedaCatalogoJugadores}
              onChange={(evento) =>
                setBusquedaCatalogoJugadores(
                  evento.target.value
                )
              }
            />
          </div>

          <div className="contador-catalogo-jugadores">
            <strong>
              {jugadoresFiltrados.length}
            </strong>

            <span>
              {jugadoresFiltrados.length === 1
                ? 'jugador'
                : 'jugadores'}
            </span>
          </div>
        </div>

        {bombos.length === 0 && (
          <div className="aviso-catalogo-jugadores">
            <strong>
              Primero necesitas crear los bombos.
            </strong>

            <span>
              Cada participante debe quedar asignado a un bombo para entrar en el sorteo.
            </span>
          </div>
        )}

        {mensajeCatalogoJugadores && (
          <p className="mensaje-catalogo-jugadores">
            {mensajeCatalogoJugadores}
          </p>
        )}

        {cargandoCatalogoJugadores && (
          <p className="estado">
            Cargando catálogo general...
          </p>
        )}

        {errorCatalogoJugadores && (
          <p className="mensaje-login">
            Error: {errorCatalogoJugadores}
          </p>
        )}

        {!cargandoCatalogoJugadores &&
          !errorCatalogoJugadores &&
          jugadoresFiltrados.length === 0 && (
            <div className="sin-datos">
              <p>
                No hay jugadores que coincidan con la búsqueda.
              </p>

              <span>
                Puedes crear una nueva ficha si todavía no existe.
              </span>
            </div>
          )}

        <div className="lista-catalogo-jugadores">
          {jugadoresFiltrados.map(
            (jugador) => {
              const yaParticipa =
                idsParticipantes.has(
                  jugador.id
                )

              const nombreCompleto =
                [
                  jugador.nombre,
                  jugador.apellidos,
                ]
                  .filter(Boolean)
                  .join(' ')

              const nombreVisible =
                jugador.alias ||
                nombreCompleto ||
                jugador.codigo_jugador

              return (
                <article
                  className={
                    yaParticipa
                      ? 'tarjeta-catalogo-jugador tarjeta-catalogo-participa'
                      : 'tarjeta-catalogo-jugador'
                  }
                  key={jugador.id}
                >
                  <div className="identidad-catalogo-jugador">
                    <div className="avatar-catalogo-jugador">
                      {jugador.foto_path ? (
                        <img
                          src={obtenerUrlFoto(
                            jugador.foto_path
                          )}
                          alt={nombreVisible}
                        />
                      ) : (
                        <span>
                          {obtenerIniciales(
                            nombreVisible
                          )}
                        </span>
                      )}
                    </div>

                    <div className="texto-catalogo-jugador">
                      <h3>
                        {nombreVisible}
                      </h3>

                      {jugador.alias &&
                        nombreCompleto && (
                          <p>
                            {nombreCompleto}
                          </p>
                        )}

                      <small>
                        {jugador.codigo_jugador}
                      </small>
                    </div>
                  </div>

                  {yaParticipa ? (
                    <div className="estado-catalogo-participa">
                      ✓ Ya participa
                    </div>
                  ) : (
                    <div className="acciones-catalogo-jugador">
                      <select
                        value={
                          bomboCatalogoPorJugador[
                            jugador.id
                          ] ?? ''
                        }
                        onChange={(evento) =>
                          setBomboCatalogoPorJugador(
                            (actual) => ({
                              ...actual,
                              [jugador.id]:
                                evento.target.value,
                            })
                          )
                        }
                        disabled={
                          bombos.length === 0 ||
                          jugadorCatalogoAñadiendo ===
                            jugador.id
                        }
                      >
                        <option value="">
                          Selecciona bombo
                        </option>

                        {bombos.map(
                          (bombo) => (
                            <option
                              key={bombo.id}
                              value={bombo.id}
                            >
                              {bombo.codigo} — {bombo.nombre}
                            </option>
                          )
                        )}
                      </select>

                      <button
                        type="button"
                        className="boton-accion-jugador boton-añadir-catalogo"
                        onClick={() =>
                          añadirJugadorExistenteAlSorteo(
                            jugador
                          )
                        }
                        disabled={
                          bombos.length === 0 ||
                          !bomboCatalogoPorJugador[
                            jugador.id
                          ] ||
                          jugadorCatalogoAñadiendo ===
                            jugador.id
                        }
                      >
                        {jugadorCatalogoAñadiendo ===
                        jugador.id
                          ? 'Añadiendo...'
                          : '+ Añadir'}
                      </button>
                    </div>
                  )}
                </article>
              )
            }
          )}
        </div>

      </section>
    </main>
  )
}


/*
============================================================
NUEVO JUGADOR
============================================================
*/

if (
  pantalla === 'nuevo-jugador' &&
  sorteoSeleccionado
) {
  return (
    <main className="app">
      <section className="inicio">

        <p className="etiqueta">
          PARTICIPANTES
        </p>

        <h1>
          Crear nuevo jugador
        </h1>

        <p className="descripcion">
          Se guardará en el catálogo general y se añadirá a {sorteoSeleccionado.nombre}.
        </p>

        <form
          className="formulario-login formulario-sorteo"
          onSubmit={guardarNuevoJugador}
        >

          <div className="foto-jugador-form">

            {previewFotoJugador ? (
              <img
                src={previewFotoJugador}
                alt="Vista previa"
                className="preview-jugador"
              />
            ) : (
              <div className="preview-jugador preview-vacio">
                👤
              </div>
            )}

            <label className="selector-foto">
              Seleccionar foto

              <input
                type="file"
                accept="image/*"
                onChange={
                  seleccionarFotoJugador
                }
              />
            </label>

            <small>
              Opcional · JPG, PNG, WebP…
            </small>

          </div>

          <label className="campo-formulario">
            <span>
              Código / ID del jugador
            </span>

            <input
              type="text"
              placeholder="Ej. J001"
              value={codigoNuevoJugador}
              onChange={(e) =>
                setCodigoNuevoJugador(
                  e.target.value
                )
              }
              required
            />
          </label>

          <label className="campo-formulario">
            <span>
              Nombre
            </span>

            <input
              type="text"
              placeholder="Nombre"
              value={nombreNuevoJugador}
              onChange={(e) =>
                setNombreNuevoJugador(
                  e.target.value
                )
              }
              required
            />
          </label>

          <label className="campo-formulario">
            <span>
              Apellidos
            </span>

            <input
              type="text"
              placeholder="Apellidos"
              value={apellidosNuevoJugador}
              onChange={(e) =>
                setApellidosNuevoJugador(
                  e.target.value
                )
              }
            />
          </label>

          <label className="campo-formulario">
            <span>
              Alias
            </span>

            <input
              type="text"
              placeholder="Alias (opcional)"
              value={aliasNuevoJugador}
              onChange={(e) =>
                setAliasNuevoJugador(
                  e.target.value
                )
              }
            />
          </label>

          <label className="campo-formulario">
            <span>
              Bombo
            </span>

            <select
              value={bomboNuevoJugador}
              onChange={(e) =>
                setBomboNuevoJugador(
                  e.target.value
                )
              }
              required
            >
              <option value="">
                Selecciona un bombo
              </option>

              {bombos.map((bombo) => (
                <option
                  key={bombo.id}
                  value={bombo.id}
                >
                  {bombo.codigo} — {bombo.nombre}
                </option>
              ))}

            </select>
          </label>

          <button
            className="boton boton-principal"
            type="submit"
            disabled={guardandoJugador}
          >
            {guardandoJugador
              ? 'Guardando...'
              : 'Crear y añadir'}
          </button>

        </form>

        {mensajeNuevoJugador && (
          <p className="mensaje-login">
            {mensajeNuevoJugador}
          </p>
        )}

        <button
          className="boton-volver"
          onClick={() => {
            setMensajeNuevoJugador('')
            setFotoNuevoJugador(null)
            setPreviewFotoJugador('')
            setPantalla('jugadores')
          }}
        >
          ← Volver a Jugadores
        </button>

      </section>
    </main>
  )
}


/*
============================================================
EDITAR JUGADOR
============================================================
*/

if (
  pantalla === 'editar-jugador' &&
  sorteoSeleccionado &&
  jugadorEditando
) {
  return (
    <main className="app">
      <section className="inicio">

        <p className="etiqueta">
          PARTICIPANTES
        </p>

        <h1>
          Editar jugador
        </h1>

        <p className="descripcion">
          {sorteoSeleccionado.nombre}
        </p>

        <form
          className="formulario-login formulario-sorteo"
          onSubmit={guardarEdicionJugador}
        >

          <div className="foto-jugador-form">

            {previewFotoEditarJugador ? (
              <img
                src={previewFotoEditarJugador}
                alt="Foto del jugador"
                className="preview-jugador"
              />
            ) : (
              <div className="preview-jugador preview-vacio">
                👤
              </div>
            )}

            <label className="selector-foto">
              Cambiar foto

              <input
                type="file"
                accept="image/*"
                onChange={
                  seleccionarFotoEditarJugador
                }
              />
            </label>

            <small>
              La foto es opcional
            </small>

          </div>

          <label className="campo-formulario">
            <span>
              Código / ID del jugador
            </span>

            <input
              type="text"
              value={
                jugadorEditando.codigoJugador
              }
              disabled
            />
          </label>

          <label className="campo-formulario">
            <span>
              Nombre
            </span>

            <input
              type="text"
              value={nombreEditarJugador}
              onChange={(e) =>
                setNombreEditarJugador(
                  e.target.value
                )
              }
              required
            />
          </label>

          <label className="campo-formulario">
            <span>
              Apellidos
            </span>

            <input
              type="text"
              value={apellidosEditarJugador}
              onChange={(e) =>
                setApellidosEditarJugador(
                  e.target.value
                )
              }
            />
          </label>

          <label className="campo-formulario">
            <span>
              Alias
            </span>

            <input
              type="text"
              value={aliasEditarJugador}
              onChange={(e) =>
                setAliasEditarJugador(
                  e.target.value
                )
              }
              placeholder="Alias (opcional)"
            />
          </label>

          <label className="campo-formulario">
            <span>
              Bombo en este sorteo
            </span>

            <select
              value={bomboEditarJugador}
              onChange={(e) =>
                setBomboEditarJugador(
                  e.target.value
                )
              }
              required
            >
              <option value="">
                Selecciona un bombo
              </option>

              {bombos.map((bombo) => (
                <option
                  key={bombo.id}
                  value={bombo.id}
                >
                  {bombo.codigo} — {bombo.nombre}
                </option>
              ))}

            </select>
          </label>

          <button
            className="boton boton-principal"
            type="submit"
            disabled={guardandoEdicionJugador}
          >
            {guardandoEdicionJugador
              ? 'Guardando...'
              : 'Guardar cambios'}
          </button>

        </form>

        {mensajeEditarJugador && (
          <p className="mensaje-login">
            {mensajeEditarJugador}
          </p>
        )}

        <button
          className="boton-volver"
          onClick={() => {
            setJugadorEditando(null)
            setFotoEditarJugador(null)
            setPreviewFotoEditarJugador('')
            setMensajeEditarJugador('')
            setPantalla('jugadores')
          }}
        >
          ← Volver a Jugadores
        </button>

      </section>
    </main>
  )
}


/*
============================================================
PANTALLA JUGADORES
============================================================
*/

if (
  pantalla === 'jugadores' &&
  sorteoSeleccionado
) {
  return (
    <main className="app app-admin">
      <section className="panel-admin">

        <button
          className="boton-volver"
          onClick={() =>
            setPantalla(
              'gestionar-sorteo'
            )
          }
        >
          ← Volver al sorteo
        </button>

        <header className="cabecera-gestion">

          <div>
            <p className="etiqueta">
              CONFIGURACIÓN
            </p>

            <h2>
              Jugadores
            </h2>

            <p className="descripcion-admin">
              {sorteoSeleccionado.nombre}
            </p>
          </div>

          <div className="acciones-cabecera-jugadores">
            <button
              type="button"
              className="boton boton-principal"
              onClick={abrirCatalogoJugadores}
            >
              👥 Añadir desde catálogo
            </button>

            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => {
                setCodigoNuevoJugador('')
                setNombreNuevoJugador('')
                setApellidosNuevoJugador('')
                setAliasNuevoJugador('')
                setBomboNuevoJugador('')
                setFotoNuevoJugador(null)
                setPreviewFotoJugador('')
                setMensajeNuevoJugador('')

                setPantalla('nuevo-jugador')
              }}
            >
              + Crear nuevo jugador
            </button>
          </div>

        </header>

        <div className="total-jugadores-sorteo">
          <div>
            <span>JUGADORES SELECCIONADOS</span>
            <strong>
              {participantes.length}
            </strong>
          </div>

          <small>
            Total de jugadores añadidos a este sorteo
          </small>
        </div>

        {cargandoJugadores && (
          <p className="estado">
            Cargando jugadores...
          </p>
        )}

        {errorJugadores && (
          <p className="mensaje-login">
            Error: {errorJugadores}
          </p>
        )}

        {!cargandoJugadores &&
          !errorJugadores &&
          participantes.length === 0 && (
            <div className="sin-datos">

              <p>
                Este sorteo todavía no tiene jugadores.
              </p>

              <span>
                Selecciona jugadores del catálogo general o crea uno nuevo si todavía no existe.
              </span>

            </div>
          )}

        <div className="lista-jugadores">

          {participantes.map(
            (participante) => {

              const jugador =
                jugadores.find(
                  (j) =>
                    j.id ===
                    participante.jugador_id
                )

              const bombo =
                bombos.find(
                  (b) =>
                    b.id ===
                    participante.bombo_id
                )

              if (!jugador) {
                return null
              }

              const nombreVisible =
                jugador.alias ||
                [
                  jugador.nombre,
                  jugador.apellidos,
                ]
                  .filter(Boolean)
                  .join(' ')

              return (
                <article
                  className="tarjeta-jugador"
                  key={participante.id}
                >

                  <div className="jugador-principal">

                    <div className="avatar-jugador">
                      {jugador.foto_path ? (
                        <img
                          src={obtenerUrlFoto(
                            jugador.foto_path
                          )}
                          alt={nombreVisible}
                          className="avatar-jugador-foto"
                        />
                      ) : (
                        <span>👤</span>
                      )}
                    </div>

                    <div>
                      <h3>
                        {nombreVisible}
                      </h3>

                      <span>
                        {jugador.codigo_jugador}
                      </span>
                    </div>

                  </div>

                  <div className="lado-derecho-jugador">

                    <div className="datos-jugador">

                      <span className="bombo-jugador">
                        {bombo
                          ? `Bombo ${bombo.codigo}`
                          : 'Sin bombo'}
                      </span>

                      <span>
                        {participante.estado}
                      </span>

                    </div>

                    <div className="acciones-jugador">

                      <button
                        type="button"
                        className="boton-accion-jugador"
                        onClick={() =>
                          abrirEditarJugador(
                            participante,
                            jugador
                          )
                        }
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="boton-accion-jugador boton-quitar-jugador"
                        onClick={() =>
                          quitarJugadorDelSorteo(
                            participante,
                            jugador
                          )
                        }
                      >
                        Quitar
                      </button>

                    </div>

                  </div>

                </article>
              )
            }
          )}

        </div>

      </section>
    </main>
  )
}


/*
============================================================
PANTALLA EMPAREJAMIENTOS
============================================================
*/

if (
  pantalla === 'emparejamientos' &&
  sorteoSeleccionado
) {
  const cantidadEquipo = cantidadJugadoresEquipoActual()

  return (
    <main className="app app-admin">
      <section className="panel-admin">

        <button
          className="boton-volver"
          onClick={() => {
            setReglaEditandoId(null)
            setMensajeReglas('')
            setPantalla('gestionar-sorteo')
          }}
        >
          ← Volver al sorteo
        </button>

        <header className="cabecera-gestion">
          <div>
            <p className="etiqueta">CONFIGURACIÓN</p>
            <h2>Emparejamientos</h2>
            <p className="descripcion-admin">
              {sorteoSeleccionado.nombre}
            </p>
          </div>

          <span className="badge-estado">
            {cantidadEquipo} jugadores / equipo
          </span>
        </header>

        <div className="panel-regla">
          <h3>
            {reglaEditandoId
              ? 'Editar regla'
              : 'Nueva regla'}
          </h3>

          <p className="descripcion-regla">
            Define de qué bombo sale cada una de las {cantidadEquipo}
            posiciones del equipo. Puedes repetir un bombo si una regla
            necesita más de un jugador de ese mismo nivel.
          </p>

          <form
            className="formulario-regla formulario-regla-dinamica"
            onSubmit={guardarReglaEmparejamiento}
          >
            <div className="composicion-regla-dinamica">
              {Array.from(
                { length: cantidadEquipo },
                (_, indice) => (
                  <Fragment key={indice}>
                    {indice > 0 && (
                      <div className="signo-regla signo-regla-dinamico">
                        +
                      </div>
                    )}

                    <label className="slot-bombo-regla">
                      <span>
                        Posición {indice + 1}
                      </span>

                      <select
                        value={bombosRegla[indice] ?? ''}
                        onChange={(e) => {
                          const siguiente = Array.from(
                            { length: cantidadEquipo },
                            (_, i) => bombosRegla[i] ?? ''
                          )
                          siguiente[indice] = e.target.value
                          setBombosRegla(siguiente)
                        }}
                        required
                      >
                        <option value="">
                          Selecciona un bombo
                        </option>

                        {bombos.map((bombo) => (
                          <option
                            key={bombo.id}
                            value={bombo.id}
                          >
                            {bombo.nombre} ({bombo.codigo})
                          </option>
                        ))}
                      </select>
                    </label>
                  </Fragment>
                )
              )}
            </div>

            <label className="campo-formulario campo-regla-nombre">
              <span>Nombre</span>
              <input
                type="text"
                placeholder="Opcional: se genera automáticamente"
                value={nombreRegla}
                onChange={(e) => setNombreRegla(e.target.value)}
              />
            </label>

            <label className="campo-formulario campo-regla-orden">
              <span>Orden</span>
              <input
                type="number"
                min="1"
                value={ordenRegla}
                onChange={(e) => setOrdenRegla(e.target.value)}
                required
              />
            </label>

            <label className="check-regla">
              <input
                type="checkbox"
                checked={activoRegla}
                onChange={(e) => setActivoRegla(e.target.checked)}
              />
              <span>Regla activa</span>
            </label>

            <div className="acciones-formulario-regla">
              {reglaEditandoId && (
                <button
                  className="boton boton-secundario"
                  type="button"
                  onClick={limpiarFormularioRegla}
                >
                  Cancelar edición
                </button>
              )}

              <button
                className="boton boton-principal"
                type="submit"
                disabled={guardandoRegla || bombos.length === 0}
              >
                {guardandoRegla
                  ? 'Guardando...'
                  : reglaEditandoId
                    ? 'Guardar cambios'
                    : 'Añadir regla'}
              </button>
            </div>
          </form>

          {mensajeReglas && (
            <p className="estado">{mensajeReglas}</p>
          )}
        </div>

        <div className="cabecera-lista-reglas">
          <h3>Reglas configuradas</h3>
          <span>{reglasEmparejamiento.length}</span>
        </div>

        {cargandoEmparejamientos && (
          <p className="estado">Cargando emparejamientos...</p>
        )}

        {errorEmparejamientos && (
          <p className="mensaje-login">Error: {errorEmparejamientos}</p>
        )}

        {!cargandoEmparejamientos &&
          !errorEmparejamientos &&
          reglasEmparejamiento.length === 0 && (
            <div className="sin-datos">
              <p>Todavía no hay reglas de emparejamiento.</p>
              <span>
                Ejemplo para 3 jugadores: A + B + C.
              </span>
            </div>
          )}

        <div className="lista-reglas">
          {reglasEmparejamiento.map((regla) => (
            <article
              className="tarjeta-regla tarjeta-regla-dinamica"
              key={regla.id}
            >
              <div className="regla-combinacion regla-combinacion-dinamica">
                {(regla.bombos ?? []).map(
                  (posicion, indice) => {
                    const bombo = bombos.find(
                      (item) => item.id === posicion.bombo_id
                    )

                    return (
                      <Fragment key={`${regla.id}-${indice}`}>
                        {indice > 0 && (
                          <span className="signo-regla">+</span>
                        )}
                        <span className="mini-bombo">
                          {bombo?.codigo ?? '?'}
                        </span>
                      </Fragment>
                    )
                  }
                )}
              </div>

              <div className="info-regla">
                <h3>{regla.nombre}</h3>
                <span>
                  {regla.bombos?.length ?? 0} jugadores
                  {' · '}Orden: {regla.orden}
                  {' · '}{regla.activo ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              <div className="acciones-regla">
                <button
                  className="boton-accion-jugador"
                  type="button"
                  onClick={() => editarReglaEmparejamiento(regla)}
                >
                  Editar
                </button>
                <button
                  className="boton-accion-jugador boton-quitar-jugador"
                  type="button"
                  onClick={() => eliminarReglaEmparejamiento(regla)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}


/*
============================================================
PANTALLA EQUIPOS FIJOS
============================================================
*/

if (
  pantalla === 'equipos-fijos' &&
  sorteoSeleccionado
) {
  const nombreVisibleEquipoFijo = (jugador) =>
    jugador?.alias ||
    [jugador?.nombre, jugador?.apellidos]
      .filter(Boolean)
      .join(' ') ||
    'Jugador'

  const idsParticipantesFijos = new Set(
    miembrosEquiposFijos.map(
      (miembro) => miembro.participante_id
    )
  )

  const datosParticipantesFijos = participantes
    .filter((participante) => participante.estado === 'incluido')
    .map((participante) => {
      const jugador = jugadores.find(
        (item) => item.id === participante.jugador_id
      )
      const bombo = bombos.find(
        (item) => item.id === participante.bombo_id
      )
      return {
        participante,
        jugador,
        bombo,
        nombre: nombreVisibleEquipoFijo(jugador),
      }
    })
    .filter((item) => item.jugador?.activo !== false)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const participantesLibres = datosParticipantesFijos.filter(
    (item) => !idsParticipantesFijos.has(item.participante.id)
  )

  const reglaSeleccionada = reglasEquiposFijos.find(
    (regla) => regla.id === reglaEquipoFijoId
  )

  const posicionesRegla = reglaSeleccionada?.bombos ?? []
  const cantidadNecesaria = posicionesRegla.length

  const seleccionDinamica = Array.from(
    { length: cantidadNecesaria },
    (_, indice) => participantesEquipoFijo[indice] ?? ''
  )

  const busquedasDinamicas = Array.from(
    { length: cantidadNecesaria },
    (_, indice) => busquedasEquipoFijo[indice] ?? ''
  )

  const normalizar = (valor) =>
    String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()

  const obtenerDatosParticipante = (id) =>
    datosParticipantesFijos.find(
      (item) => item.participante.id === id
    )

  const participantesParaPosicion = (indice) => {
    const bomboId = posicionesRegla[indice]?.bombo_id
    const usadosEnOtrasPosiciones = new Set(
      seleccionDinamica.filter(
        (id, i) => id && i !== indice
      )
    )
    const termino = normalizar(busquedasDinamicas[indice])

    return participantesLibres.filter((item) => {
      if (item.bombo?.id !== bomboId) {
        return false
      }
      if (usadosEnOtrasPosiciones.has(item.participante.id)) {
        return false
      }
      if (!termino) {
        return true
      }
      return normalizar(
        `${item.nombre} ${item.bombo?.nombre ?? ''}`
      ).includes(termino)
    })
  }

  const datosSeleccionados = seleccionDinamica
    .map(obtenerDatosParticipante)
    .filter(Boolean)

  const totalJugadoresFijos = idsParticipantesFijos.size

  return (
    <main className="app app-admin">
      <section className="panel-admin">
        <button
          className="boton-volver"
          onClick={() => {
            reiniciarConstructorEquipoFijo()
            setMensajeEquiposFijos('')
            setPantalla('gestionar-sorteo')
          }}
        >
          ← Volver al sorteo
        </button>

        <header className="cabecera-gestion">
          <div>
            <p className="etiqueta">CONFIGURACIÓN</p>
            <h2>Equipos fijos</h2>
            <p className="descripcion-admin">
              {sorteoSeleccionado.nombre}
            </p>
          </div>
          <span className="badge-estado">
            {cantidadJugadoresEquipoActual()} jugadores / equipo
          </span>
        </header>

        <div className="resumen-equipos-fijos">
          <div><span>Equipos fijos</span><strong>{equiposFijos.length}</strong></div>
          <div><span>Jugadores fijados</span><strong>{totalJugadoresFijos}</strong></div>
          <div>
            <span>Entrarán al azar</span>
            <strong>{Math.max(0, datosParticipantesFijos.length - totalJugadoresFijos)}</strong>
          </div>
        </div>

        <div className="panel-equipo-fijo panel-equipo-fijo-dinamico">
          <h3>Crear equipo fijo</h3>
          <p className="descripcion-regla">
            Primero elige la composición. Después selecciona un jugador
            para cada posición de esa regla.
          </p>

          <div className="selector-regla-equipo-fijo">
            {reglasEquiposFijos.map((regla) => (
              <button
                type="button"
                key={regla.id}
                className={`opcion-regla-fija ${
                  reglaEquipoFijoId === regla.id
                    ? 'opcion-regla-fija-activa'
                    : ''
                }`}
                onClick={() => {
                  setReglaEquipoFijoId(regla.id)
                  setParticipantesEquipoFijo(
                    Array(regla.bombos?.length ?? 0).fill('')
                  )
                  setBusquedasEquipoFijo(
                    Array(regla.bombos?.length ?? 0).fill('')
                  )
                  setMensajeEquiposFijos('')
                }}
              >
                <strong>{regla.nombre}</strong>
                <span>
                  {(regla.bombos ?? []).map((posicion, indice) => {
                    const bombo = bombos.find(
                      (item) => item.id === posicion.bombo_id
                    )
                    return `${indice ? ' + ' : ''}${bombo?.codigo ?? '?'}`
                  })}
                </span>
              </button>
            ))}
          </div>

          {!reglaSeleccionada ? (
            <div className="estado-espera-selector estado-espera-regla-fija">
              Selecciona una regla para empezar a formar el equipo.
            </div>
          ) : (
            <form
              className="constructor-equipo-fijo constructor-equipo-fijo-dinamico"
              onSubmit={crearEquipoFijo}
            >
              <div
                className="selectores-dinamicos-equipo-fijo"
                data-cantidad={cantidadNecesaria}
              >
                {posicionesRegla.map((posicion, indice) => {
                  const bombo = bombos.find(
                    (item) => item.id === posicion.bombo_id
                  )
                  const seleccionId = seleccionDinamica[indice]
                  const opciones = participantesParaPosicion(indice)

                  return (
                    <section
                      className="selector-visual-jugador"
                      key={`${reglaSeleccionada.id}-${indice}`}
                    >
                      <div className="cabecera-selector-jugador">
                        <div>
                          <span className="paso-selector-equipo">{indice + 1}</span>
                          <div>
                            <strong>{bombo?.nombre ?? 'Bombo'}</strong>
                            <small>Posición {indice + 1}</small>
                          </div>
                        </div>
                        {seleccionId && (
                          <span className="estado-selector-completo">✓</span>
                        )}
                      </div>

                      <div className="buscador-jugador-equipo-fijo">
                        <span>⌕</span>
                        <input
                          type="search"
                          value={busquedasDinamicas[indice]}
                          onChange={(e) => {
                            const siguiente = [...busquedasDinamicas]
                            siguiente[indice] = e.target.value
                            setBusquedasEquipoFijo(siguiente)
                          }}
                          placeholder={`Buscar en ${bombo?.nombre ?? 'bombo'}...`}
                        />
                      </div>

                      <div className="grid-selector-jugadores grid-selector-jugadores-dinamico">
                        {opciones.map((item) => {
                          const activo = item.participante.id === seleccionId
                          return (
                            <button
                              type="button"
                              key={item.participante.id}
                              className={`tarjeta-selector-jugador ${activo ? 'tarjeta-selector-jugador-activa' : ''}`}
                              onClick={() => {
                                const siguiente = [...seleccionDinamica]
                                siguiente[indice] = item.participante.id
                                setParticipantesEquipoFijo(siguiente)
                                setMensajeEquiposFijos('')
                              }}
                            >
                              <div className="avatar-selector-jugador">
                                {item.jugador?.foto_path ? (
                                  <img
                                    src={obtenerUrlFoto(item.jugador.foto_path)}
                                    alt={item.nombre}
                                  />
                                ) : (
                                  <span>{String(item.nombre).charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="datos-selector-jugador">
                                <strong>{item.nombre}</strong>
                                <span>{item.bombo?.nombre ?? 'Sin bombo'}</span>
                              </div>
                              <span className="check-selector-jugador">
                                {activo ? '✓' : ''}
                              </span>
                            </button>
                          )
                        })}

                        {opciones.length === 0 && (
                          <div className="sin-resultados-selector">
                            No quedan jugadores disponibles para esta posición.
                          </div>
                        )}
                      </div>
                    </section>
                  )
                })}
              </div>

              <div className={`preview-nuevo-equipo-fijo ${
                datosSeleccionados.length === cantidadNecesaria
                  ? 'preview-nuevo-equipo-completo'
                  : ''
              }`}>
                <div className="cabecera-preview-equipo">
                  <div>
                    <span>VISTA PREVIA</span>
                    <strong>
                      {datosSeleccionados.length === cantidadNecesaria
                        ? 'Equipo listo para fijar'
                        : `${datosSeleccionados.length} de ${cantidadNecesaria} jugadores`}
                    </strong>
                  </div>
                </div>

                <div className="preview-miembros-dinamicos">
                  {Array.from({ length: cantidadNecesaria }, (_, indice) => {
                    const datos = obtenerDatosParticipante(seleccionDinamica[indice])
                    return (
                      <Fragment key={indice}>
                        {indice > 0 && <span className="mas-preview-equipo">+</span>}
                        <div className="mini-preview-miembro">
                          <div className="avatar-preview-equipo">
                            {datos?.jugador?.foto_path ? (
                              <img
                                src={obtenerUrlFoto(datos.jugador.foto_path)}
                                alt={datos.nombre}
                              />
                            ) : (
                              <span>{datos ? obtenerIniciales(datos.nombre) : indice + 1}</span>
                            )}
                          </div>
                          <strong>{datos?.nombre ?? `Jugador ${indice + 1}`}</strong>
                          <small>{datos?.bombo?.nombre ?? 'Pendiente'}</small>
                        </div>
                      </Fragment>
                    )
                  })}
                </div>

                <button
                  type="submit"
                  className="boton boton-principal boton-fijar-equipo-visual"
                  disabled={
                    guardandoEquipoFijo ||
                    cantidadNecesaria === 0 ||
                    seleccionDinamica.some((id) => !id)
                  }
                >
                  {guardandoEquipoFijo
                    ? 'Guardando equipo...'
                    : `🤝 Fijar equipo de ${cantidadNecesaria}`}
                </button>
              </div>
            </form>
          )}

          {mensajeEquiposFijos && <p className="estado">{mensajeEquiposFijos}</p>}
          {errorEquiposFijos && <p className="mensaje-login">Error: {errorEquiposFijos}</p>}
        </div>

        <div className="cabecera-lista-reglas">
          <h3>Equipos fijados</h3>
          <span>{equiposFijos.length}</span>
        </div>

        {cargandoEquiposFijos && <p className="estado">Cargando equipos fijos...</p>}

        {!cargandoEquiposFijos && !errorEquiposFijos && equiposFijos.length === 0 && (
          <div className="sin-datos">
            <p>No hay ningún equipo fijo.</p>
            <span>Todos los jugadores entrarán en la mezcla aleatoria.</span>
          </div>
        )}

        <div className="lista-equipos-fijos">
          {equiposFijos.map((equipoFijo) => {
            const miembros = miembrosEquiposFijos
              .filter((miembro) => miembro.equipo_fijo_id === equipoFijo.id)
              .sort((a, b) => Number(a.orden_en_equipo) - Number(b.orden_en_equipo))

            const regla = reglasEquiposFijos.find(
              (item) => item.id === equipoFijo.regla_id
            )

            return (
              <article className="tarjeta-equipo-fijo" key={equipoFijo.id}>
                <div className="miembros-tarjeta-equipo-fijo miembros-tarjeta-equipo-fijo-dinamicos">
                  {miembros.map((miembro, indice) => {
                    const datos = obtenerDatosParticipante(miembro.participante_id)
                    return (
                      <Fragment key={miembro.id}>
                        {indice > 0 && <div className="mas-equipo-fijo">+</div>}
                        <div className="jugador-equipo-fijo">
                          <div className="avatar-equipo-fijo">
                            {datos?.jugador?.foto_path ? (
                              <img
                                src={obtenerUrlFoto(datos.jugador.foto_path)}
                                alt={datos.nombre}
                              />
                            ) : (
                              <span>{datos ? obtenerIniciales(datos.nombre) : '?'}</span>
                            )}
                          </div>
                          <div>
                            <strong>{datos?.nombre ?? `Jugador ${indice + 1}`}</strong>
                            <small>{datos?.bombo?.nombre ?? 'Sin bombo'}</small>
                          </div>
                        </div>
                      </Fragment>
                    )
                  })}
                </div>

                <div className="pie-equipo-fijo">
                  <span>{regla?.nombre ?? 'Regla de emparejamiento'}</span>
                  <button
                    type="button"
                    className="boton-accion-jugador boton-eliminar-equipo-fijo"
                    onClick={() => setEquipoFijoPendienteEliminar(equipoFijo)}
                  >
                    🗑 Eliminar
                  </button>
                </div>
              </article>
            )
          })}
        </div>

        {equipoFijoPendienteEliminar && (
          <div className="modal-fondo" onClick={() => {
            if (!eliminandoEquipoFijo) setEquipoFijoPendienteEliminar(null)
          }}>
            <div className="modal-confirmacion" role="dialog" aria-modal="true" onClick={(evento) => evento.stopPropagation()}>
              <div className="modal-icono">🗑</div>
              <h3>¿Eliminar este equipo fijo?</h3>
              <p>Los jugadores no se borrarán. Volverán a participar en la mezcla aleatoria.</p>
              <div className="modal-acciones">
                <button type="button" className="boton boton-secundario" disabled={eliminandoEquipoFijo} onClick={() => setEquipoFijoPendienteEliminar(null)}>Cancelar</button>
                <button type="button" className="boton boton-principal" disabled={eliminandoEquipoFijo} onClick={confirmarEliminarEquipoFijo}>
                  {eliminandoEquipoFijo ? 'Eliminando...' : 'Eliminar equipo fijo'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}


/*
============================================================
PANTALLA GRUPOS
============================================================
*/

if (
  pantalla === 'grupos' &&
  sorteoSeleccionado
) {
  const objetivoGrupos = Number(
    sorteoSeleccionado.numero_grupos
  ) || 0

  const gruposCreados = grupos.length
  const gruposFaltantes =
    objetivoGrupos - gruposCreados

  const configuracionCorrecta =
    gruposCreados === objetivoGrupos

  return (
    <main className="app app-admin">
      <section className="panel-admin">

        <button
          className="boton-volver"
          onClick={() => {
            setGrupoEditandoId(null)
            setMensajeGrupos('')
            setPantalla('gestionar-sorteo')
          }}
        >
          ← Volver al sorteo
        </button>

        <header className="cabecera-gestion">
          <div>
            <p className="etiqueta">
              CONFIGURACIÓN
            </p>

            <h2>Grupos</h2>

            <p className="descripcion-admin">
              {sorteoSeleccionado.nombre}
            </p>
          </div>

          <button
            className="boton boton-principal"
            type="button"
            onClick={crearGruposAutomaticos}
            disabled={
              creandoGruposAutomaticos ||
              gruposFaltantes <= 0
            }
          >
            {creandoGruposAutomaticos
              ? 'Creando...'
              : gruposFaltantes > 0
                ? `Crear ${gruposFaltantes} ${gruposFaltantes === 1 ? 'grupo' : 'grupos'} que faltan`
                : 'Grupos completos'}
          </button>
        </header>

        <div
          className={`resumen-config-grupos ${
            configuracionCorrecta
              ? 'grupos-correctos'
              : gruposFaltantes > 0
                ? 'grupos-incompletos'
                : 'grupos-exceso'
          }`}
        >
          <div>
            <span>Configurados</span>
            <strong>
              {gruposCreados} / {objetivoGrupos}
            </strong>
          </div>

          <p>
            {configuracionCorrecta
              ? '✓ La cantidad de grupos coincide con la configuración del sorteo.'
              : gruposFaltantes > 0
                ? `Falta crear ${gruposFaltantes} ${gruposFaltantes === 1 ? 'grupo' : 'grupos'}.`
                : `Hay ${Math.abs(gruposFaltantes)} ${Math.abs(gruposFaltantes) === 1 ? 'grupo' : 'grupos'} más de los previstos.`}
          </p>
        </div>

        <div className="panel-grupo panel-reparto-visual">
          <div className="cabecera-reparto-visual">
            <div>
              <p className="mini-etiqueta-reparto">
                DISTRIBUCIÓN
              </p>

              <h3>
                Reparto de equipos
              </h3>

              <p className="descripcion-regla">
                Elige cómo se distribuirán los equipos entre los grupos
                cada vez que generes una nueva ejecución.
              </p>
            </div>

            <span className="badge-reparto-actual">
              {distribucionGrupos === 'equilibrada'
                ? '⚖ Equilibrado'
                : '🎲 Aleatorio'}
            </span>
          </div>

          <div className="opciones-reparto-visuales">

            <button
              type="button"
              aria-pressed={
                distribucionGrupos === 'equilibrada'
              }
              className={`opcion-reparto-visual ${
                distribucionGrupos === 'equilibrada'
                  ? 'opcion-reparto-activa'
                  : ''
              }`}
              onClick={() =>
                setDistribucionGrupos('equilibrada')
              }
            >
              <div className="icono-opcion-reparto">
                ⚖
              </div>

              <div className="contenido-opcion-reparto">
                <div className="titulo-opcion-reparto">
                  <strong>
                    Equilibrado
                  </strong>

                  <span className="badge-recomendado-reparto">
                    RECOMENDADO
                  </span>
                </div>

                <p>
                  Reparte cada tipo de emparejamiento de la forma más
                  uniforme posible entre todos los grupos.
                </p>

                <div className="ejemplo-reparto">
                  <span>G1 · A-D · B-C</span>
                  <span>G2 · A-D · B-C</span>
                </div>
              </div>

              <span className="radio-visual-reparto">
                {distribucionGrupos === 'equilibrada'
                  ? '✓'
                  : ''}
              </span>
            </button>


            <button
              type="button"
              aria-pressed={
                distribucionGrupos === 'aleatoria'
              }
              className={`opcion-reparto-visual ${
                distribucionGrupos === 'aleatoria'
                  ? 'opcion-reparto-activa'
                  : ''
              }`}
              onClick={() =>
                setDistribucionGrupos('aleatoria')
              }
            >
              <div className="icono-opcion-reparto">
                🎲
              </div>

              <div className="contenido-opcion-reparto">
                <div className="titulo-opcion-reparto">
                  <strong>
                    Aleatorio
                  </strong>
                </div>

                <p>
                  Mezcla todos los equipos libremente entre los grupos,
                  manteniendo únicamente sus tamaños equilibrados.
                </p>

                <div className="ejemplo-reparto">
                  <span>Más imprevisible</span>
                  <span>Mismo tamaño de grupos</span>
                </div>
              </div>

              <span className="radio-visual-reparto">
                {distribucionGrupos === 'aleatoria'
                  ? '✓'
                  : ''}
              </span>
            </button>

          </div>

          <div className="pie-reparto-visual">
            <p>
              {distribucionGrupos === 'equilibrada'
                ? '⚖ Se compensarán los tipos de emparejamiento entre grupos.'
                : '🎲 El tipo de emparejamiento no influirá en el grupo asignado.'}
            </p>

            <button
              type="button"
              className="boton boton-principal"
              onClick={guardarDistribucionGrupos}
              disabled={guardandoDistribucionGrupos}
            >
              {guardandoDistribucionGrupos
                ? 'Guardando...'
                : 'Guardar reparto'}
            </button>
          </div>
        </div>

        <div className="panel-grupo">
          <h3>
            {grupoEditandoId
              ? 'Editar grupo'
              : 'Nuevo grupo'}
          </h3>

          <p className="descripcion-regla">
            Puedes crear los grupos automáticamente o añadirlos y personalizarlos manualmente.
          </p>

          <form
            className="formulario-grupo"
            onSubmit={guardarGrupo}
          >
            <label className="campo-formulario">
              <span>Código</span>

              <input
                type="text"
                placeholder="Ej. G1"
                value={codigoGrupo}
                onChange={(e) =>
                  setCodigoGrupo(e.target.value)
                }
                required
              />
            </label>

            <label className="campo-formulario">
              <span>Nombre</span>

              <input
                type="text"
                placeholder="Ej. Grupo 1"
                value={nombreGrupo}
                onChange={(e) =>
                  setNombreGrupo(e.target.value)
                }
                required
              />
            </label>

            <label className="campo-formulario campo-grupo-orden">
              <span>Orden</span>

              <input
                type="number"
                min="1"
                value={ordenGrupo}
                onChange={(e) =>
                  setOrdenGrupo(e.target.value)
                }
                required
              />
            </label>

            <label className="campo-formulario campo-grupo-descripcion">
              <span>Descripción</span>

              <input
                type="text"
                placeholder="Descripción opcional"
                value={descripcionGrupo}
                onChange={(e) =>
                  setDescripcionGrupo(e.target.value)
                }
              />
            </label>

            <label className="check-regla check-grupo">
              <input
                type="checkbox"
                checked={activoGrupo}
                onChange={(e) =>
                  setActivoGrupo(e.target.checked)
                }
              />

              <span>Grupo activo</span>
            </label>

            <div className="acciones-formulario-grupo">
              {grupoEditandoId && (
                <button
                  className="boton boton-secundario"
                  type="button"
                  onClick={() =>
                    limpiarFormularioGrupo()
                  }
                >
                  Cancelar edición
                </button>
              )}

              <button
                className="boton boton-principal"
                type="submit"
                disabled={guardandoGrupo}
              >
                {guardandoGrupo
                  ? 'Guardando...'
                  : grupoEditandoId
                    ? 'Guardar cambios'
                    : 'Añadir grupo'}
              </button>
            </div>
          </form>

          {mensajeGrupos && (
            <p className="estado">
              {mensajeGrupos}
            </p>
          )}
        </div>

        <div className="cabecera-lista-reglas">
          <h3>Grupos configurados</h3>

          <span>
            {gruposCreados}
            {' '}
            {gruposCreados === 1
              ? 'grupo'
              : 'grupos'}
          </span>
        </div>

        {cargandoGrupos && (
          <p className="estado">
            Cargando grupos...
          </p>
        )}

        {errorGrupos && (
          <p className="mensaje-login">
            Error: {errorGrupos}
          </p>
        )}

        {!cargandoGrupos &&
          !errorGrupos &&
          grupos.length === 0 && (
            <div className="sin-datos">
              <p>
                Todavía no hay grupos creados.
              </p>

              <span>
                Puedes crearlos automáticamente según la cantidad configurada en el sorteo.
              </span>
            </div>
          )}

        <div className="lista-grupos-config">
          {grupos.map((grupo) => (
            <article
              className="tarjeta-grupo-config"
              key={grupo.id}
            >
              <div className="codigo-grupo-config">
                {grupo.codigo}
              </div>

              <div className="info-grupo-config">
                <div className="titulo-grupo-config">
                  <h3>{grupo.nombre}</h3>

                  <span
                    className={
                      grupo.activo
                        ? 'badge-grupo-activo'
                        : 'badge-grupo-inactivo'
                    }
                  >
                    {grupo.activo
                      ? 'Activo'
                      : 'Inactivo'}
                  </span>
                </div>

                {grupo.descripcion && (
                  <p>{grupo.descripcion}</p>
                )}

                <small>
                  Orden: {grupo.orden}
                </small>
              </div>

              <div className="acciones-grupo-config">
                <button
                  className="boton-accion-jugador"
                  type="button"
                  onClick={() =>
                    editarGrupo(grupo)
                  }
                >
                  Editar
                </button>

                <button
                  className="boton-accion-jugador boton-quitar-jugador"
                  type="button"
                  onClick={() =>
                    eliminarGrupo(grupo)
                  }
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>

      </section>
    </main>
  )
}


/*
============================================================
PANTALLA PREPARAR SORTEO
============================================================
*/

if (
  pantalla === 'preparar-sorteo' &&
  sorteoSeleccionado
) {
  const tieneErrores =
    hayErroresDeValidacion(validacionesSorteo)

  const listoParaGenerar =
    !cargandoValidacion &&
    !errorValidacion &&
    !tieneErrores

  const esLigaUnicaPreparacion =
    String(
      sorteoSeleccionado.formato_sorteo ?? 'grupos'
    ).toLowerCase() === 'liga_unica'

  const gruposObjetivo =
    Number(sorteoSeleccionado.numero_grupos) || 0

  const distribucionPreparacion =
    String(
      sorteoSeleccionado.distribucion_grupos ??
      'equilibrada'
    ).toLowerCase()

  return (
    <main className="app app-admin">
      <section className="panel-admin">

        <button
          className="boton-volver"
          onClick={() => {
            setMensajeGeneracion('')
            setEjecucionGenerada(null)
            setMostrarConfirmacionGenerar(false)
            setPantalla('gestionar-sorteo')
          }}
        >
          ← Volver al sorteo
        </button>

        <header className="cabecera-gestion">
          <div>
            <p className="etiqueta">
              COMPROBACIÓN FINAL
            </p>

            <h2>
              Generar sorteo
            </h2>

            <p className="descripcion-admin">
              {sorteoSeleccionado.nombre}
            </p>
          </div>

          <button
            className="boton boton-secundario"
            type="button"
            onClick={refrescarPreparacionSorteo}
            disabled={cargandoValidacion}
          >
            {cargandoValidacion
              ? 'Comprobando...'
              : '↻ Volver a comprobar'}
          </button>
        </header>

        <div className="resumen-preparacion">
          <div className="dato-preparacion">
            <span>Bombos</span>
            <strong>{resumenPreparacion.bombos}</strong>
          </div>

          <div className="dato-preparacion">
            <span>Jugadores incluidos</span>
            <strong>{resumenPreparacion.jugadores}</strong>
          </div>

          <div className="dato-preparacion">
            <span>Reglas activas</span>
            <strong>{resumenPreparacion.reglas}</strong>
          </div>

          <div className="dato-preparacion">
            <span>Jugadores / equipo</span>
            <strong>{sorteoSeleccionado.jugadores_por_equipo ?? 2}</strong>
          </div>

          <div className="dato-preparacion">
            <span>Equipos fijos</span>
            <strong>{resumenPreparacion.equiposFijos}</strong>
          </div>

          <div className="dato-preparacion">
            <span>
              {esLigaUnicaPreparacion
                ? 'Formato'
                : 'Grupos'}
            </span>

            <strong>
              {esLigaUnicaPreparacion
                ? 'Liga única'
                : `${resumenPreparacion.grupos} / ${gruposObjetivo}`}
            </strong>
          </div>

          {!esLigaUnicaPreparacion && (
            <div className="dato-preparacion">
              <span>Reparto</span>

              <strong>
                {distribucionPreparacion === 'aleatoria'
                  ? 'Aleatorio'
                  : 'Equilibrado'}
              </strong>
            </div>
          )}
        </div>

        {cargandoValidacion && (
          <div className="estado-preparacion estado-preparacion-cargando">
            <div className="icono-preparacion">
              ⏳
            </div>

            <div>
              <h3>Comprobando configuración...</h3>
              <p>
                Supabase está verificando que el sorteo pueda generarse correctamente.
              </p>
            </div>
          </div>
        )}

        {!cargandoValidacion &&
          errorValidacion && (
            <div className="estado-preparacion estado-preparacion-error">
              <div className="icono-preparacion">
                ✕
              </div>

              <div>
                <h3>
                  No se pudo validar el sorteo
                </h3>

                <p>{errorValidacion}</p>
              </div>
            </div>
          )}

        {!cargandoValidacion &&
          !errorValidacion &&
          tieneErrores && (
            <div className="estado-preparacion estado-preparacion-error">
              <div className="icono-preparacion">
                !
              </div>

              <div>
                <h3>
                  El sorteo todavía no está preparado
                </h3>

                <p>
                  Corrige las incidencias indicadas antes de generar los equipos.
                </p>
              </div>
            </div>
          )}

        {!cargandoValidacion &&
          !errorValidacion &&
          !tieneErrores && (
            <div className="estado-preparacion estado-preparacion-ok">
              <div className="icono-preparacion">
                ✓
              </div>

              <div>
                <h3>
                  Configuración correcta
                </h3>

                <p>
                  La validación no ha detectado errores. El sorteo puede generarse.
                </p>
              </div>
            </div>
          )}

        {!cargandoValidacion &&
          !errorValidacion &&
          validacionesSorteo.length > 0 && (
            <>
              <div className="cabecera-validaciones">
                <h3>Resultado de la validación</h3>

                <span>
                  {validacionesSorteo.length}
                  {' '}
                  {validacionesSorteo.length === 1
                    ? 'comprobación'
                    : 'comprobaciones'}
                </span>
              </div>

              <div className="lista-validaciones">
                {validacionesSorteo.map(
                  (validacion, indice) => {
                    const clase =
                      nivelValidacionClase(
                        validacion.nivel
                      )

                    return (
                      <article
                        className={`tarjeta-validacion validacion-${clase}`}
                        key={`${validacion.comprobacion}-${indice}`}
                      >
                        <div className="marca-validacion">
                          {clase === 'error'
                            ? '!'
                            : clase === 'aviso'
                              ? '⚠'
                              : '✓'}
                        </div>

                        <div className="contenido-validacion">
                          <div className="cabecera-validacion">
                            <h3>
                              {validacion.comprobacion}
                            </h3>

                            <span>
                              {validacion.nivel}
                            </span>
                          </div>

                          <p>
                            {validacion.detalle}
                          </p>
                        </div>
                      </article>
                    )
                  }
                )}
              </div>
            </>
          )}

        {!cargandoValidacion &&
          !errorValidacion &&
          validacionesSorteo.length === 0 && (
            <div className="sin-incidencias">
              <span>✓</span>

              <div>
                <strong>
                  Sin incidencias
                </strong>

                <p>
                  Todas las comprobaciones del servidor se han superado.
                </p>
              </div>
            </div>
          )}

        {ejecucionOficialSorteo && (
          <div className="bloque-ejecucion-oficial bloque-oficial-preparacion">
            <div className="icono-ejecucion-oficial">
              🏆
            </div>

            <div className="texto-ejecucion-oficial">
              <span>EJECUCIÓN OFICIAL</span>

              <strong>
                Ejecución {ejecucionOficialSorteo.numero_ejecucion}
              </strong>

              <p>
                Esta combinación está protegida como definitiva.
                Para generar otra tendrás que quitar expresamente
                su oficialidad desde Resultado o Control de presentación.
              </p>
            </div>

            <span className="candado-oficial">
              🔒
            </span>
          </div>
        )}

        <div className="zona-generar-sorteo">
          <div>
            <h3>Generación de equipos</h3>

            <p>
              {ejecucionOficialSorteo
                ? 'Bloqueado porque ya existe una ejecución oficial.'
                : 'Solo se habilita cuando la configuración supera la validación.'}
            </p>
          </div>

          <button
            className="boton boton-principal boton-generar-sorteo"
            type="button"
            onClick={generarSorteo}
            disabled={
              !listoParaGenerar ||
              generandoSorteo ||
              Boolean(ejecucionOficialSorteo)
            }
          >
            {generandoSorteo
              ? 'Generando...'
              : ejecucionOficialSorteo
                ? '🔒 Sorteo bloqueado'
                : '🎲 Generar sorteo'}
          </button>
        </div>

        {mensajeGeneracion && (
          <p
            className={
              ejecucionGenerada
                ? 'mensaje-generacion mensaje-generacion-ok'
                : 'mensaje-generacion'
            }
          >
            {mensajeGeneracion}
          </p>
        )}

        {ejecucionGenerada && (
          <div className="bloque-despues-generar">
            <div className="texto-despues-generar">
              <h3>
                ¿Cómo quieres continuar?
              </h3>

              <p>
                Puedes ir directamente al control de presentación sin
                conocer los equipos o revisar antes el resultado generado.
              </p>
            </div>

            <div className="acciones-resultado-generado">
              <button
                type="button"
                className="boton boton-principal"
                onClick={abrirPresentacionSinVerResultado}
              >
                🎬 Ir al control sin ver resultado
              </button>

              <button
                type="button"
                className="boton boton-secundario"
                onClick={abrirResultadoGenerado}
              >
                👁 Revisar resultado generado
              </button>
            </div>
          </div>
        )}

        {mostrarConfirmacionGenerar && (
          <div
            className="modal-fondo"
            onClick={() =>
              setMostrarConfirmacionGenerar(false)
            }
          >
            <div
              className="modal-confirmacion"
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-confirmar-sorteo"
              onClick={(evento) =>
                evento.stopPropagation()
              }
            >
              <div className="modal-icono">
                🎲
              </div>

              <h3 id="titulo-confirmar-sorteo">
                ¿Generar el sorteo?
              </h3>

              <p>
                La configuración es válida.
                Se creará una nueva ejecución con
                {esLigaUnicaPreparacion
                  ? ' los equipos generados aleatoriamente.'
                  : distribucionPreparacion === 'aleatoria'
                    ? ' los equipos repartidos aleatoriamente entre grupos de tamaño equilibrado.'
                    : ' los tipos de emparejamiento repartidos de la forma más equilibrada posible entre los grupos.'}
              </p>

              <div className="modal-aviso">
                Una vez generado podrás revisar los
                equipos antes de iniciar la presentación.
              </div>

              <div className="modal-acciones">
                <button
                  type="button"
                  className="boton boton-secundario"
                  onClick={() =>
                    setMostrarConfirmacionGenerar(false)
                  }
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="boton boton-principal"
                  onClick={confirmarGeneracionSorteo}
                >
                  🎲 Generar sorteo
                </button>
              </div>
            </div>
          </div>
        )}

      </section>
    </main>
  )
}


/*
============================================================
PANTALLA TIEMPOS DE PRESENTACIÓN
============================================================
*/

if (
  pantalla === 'tiempos-presentacion' &&
  sorteoSeleccionado
) {
  const camposTiempos = [
    {
      clave: 'retrasoPrimerJugadorMs',
      titulo: 'Entrada del primer jugador',
      descripcion:
        'Tiempo desde que empieza el turno hasta que aparece el primer jugador.',
      minimo: 0,
      maximo: 5,
      paso: 0.1,
      icono: '①',
    },
    {
      clave: 'intervaloRevelacionMs',
      titulo: 'Entre jugadores',
      descripcion:
        'Pausa entre cada jugador y también entre el último jugador y el equipo completo.',
      minimo: 0.5,
      maximo: 10,
      paso: 0.1,
      icono: '⇢',
    },
    {
      clave: 'pausaEntreEquiposRepeticionMs',
      titulo: 'Entre equipos en repetición',
      descripcion:
        'Pausa adicional entre un equipo completo y el comienzo del siguiente al repetir todo el sorteo.',
      minimo: 0,
      maximo: 10,
      paso: 0.1,
      icono: '↻',
    },
    {
      clave: 'pausaAntesResumenRepeticionMs',
      titulo: 'Antes del resumen final',
      descripcion:
        'Tiempo que permanece visible el último equipo antes de mostrar automáticamente el resumen en una repetición.',
      minimo: 0,
      maximo: 15,
      paso: 0.1,
      icono: '▦',
    },
  ]

  return (
    <main className="app app-admin">
      <section className="panel-admin">

        <button
          className="boton-volver"
          onClick={() =>
            setPantalla(
              'gestionar-sorteo'
            )
          }
        >
          ← Volver al sorteo
        </button>

        <header className="cabecera-gestion">
          <div>
            <p className="etiqueta">
              PRESENTACIÓN
            </p>

            <h2>
              Tiempos, transiciones y efectos
            </h2>

            <p className="descripcion-admin">
              {sorteoSeleccionado.nombre}
            </p>
          </div>

          <span className="badge-estado">
            ⏱ Personalizable
          </span>
        </header>

        <div className="intro-tiempos-presentacion">
          <div>
            <span>🎬</span>
          </div>

          <p>
            Estos tiempos y el estilo de entrada son propios de este
            sorteo. Los efectos visuales de equipo y del resumen final se
            aplican automáticamente durante la presentación.
          </p>
        </div>

        <div className="selector-estilo-entrada">
          <div className="cabecera-selector-estilo">
            <span>ESTILO DE ENTRADA</span>
            <h3>¿Cómo aparece cada jugador?</h3>
            <p>
              Puedes conservar el efecto actual o probar una entrada
              con giro y zoom. El sonido configurado funciona igual
              en ambos estilos.
            </p>
          </div>

          <div className="opciones-estilo-entrada">
            <button
              type="button"
              className={`tarjeta-estilo-entrada ${
                tiemposPresentacion.estiloEntrada === 'destello'
                  ? 'tarjeta-estilo-entrada-activa'
                  : ''
              }`}
              onClick={() => {
                setTiemposPresentacion(
                  (actual) => ({
                    ...actual,
                    estiloEntrada: 'destello',
                  })
                )
                setMensajeTiemposPresentacion('')
              }}
            >
              <span className="icono-estilo-entrada">
                ✦
              </span>

              <span>
                <strong>Destello</strong>
                <small>
                  El estilo que tienes ahora: entrada lateral,
                  enfoque, halo y destello.
                </small>
              </span>

              <em>
                {tiemposPresentacion.estiloEntrada === 'destello'
                  ? 'SELECCIONADO'
                  : 'ELEGIR'}
              </em>
            </button>

            <button
              type="button"
              className={`tarjeta-estilo-entrada ${
                tiemposPresentacion.estiloEntrada === 'giro_zoom'
                  ? 'tarjeta-estilo-entrada-activa'
                  : ''
              }`}
              onClick={() => {
                setTiemposPresentacion(
                  (actual) => ({
                    ...actual,
                    estiloEntrada: 'giro_zoom',
                  })
                )
                setMensajeTiemposPresentacion('')
              }}
            >
              <span className="icono-estilo-entrada">
                🌀
              </span>

              <span>
                <strong>Giro + zoom</strong>
                <small>
                  Empieza pequeño, gira sobre sí mismo, crece hasta
                  ocupar prácticamente toda la TV y vuelve a su tamaño.
                </small>
              </span>

              <em>
                {tiemposPresentacion.estiloEntrada === 'giro_zoom'
                  ? 'SELECCIONADO'
                  : 'ELEGIR'}
              </em>
            </button>
          </div>
        </div>

        <div className="grid-tiempos-presentacion">
          {camposTiempos.map(
            (campo) => {
              const valorMs =
                tiemposPresentacion[
                  campo.clave
                ]

              const valorSegundos =
                Number(valorMs) /
                1000

              return (
                <article
                  className="tarjeta-tiempo-presentacion"
                  key={campo.clave}
                >
                  <header>
                    <span>
                      {campo.icono}
                    </span>

                    <div>
                      <strong>
                        {campo.titulo}
                      </strong>

                      <p>
                        {campo.descripcion}
                      </p>
                    </div>
                  </header>

                  <div className="control-tiempo-presentacion">
                    <input
                      type="range"
                      min={campo.minimo}
                      max={campo.maximo}
                      step={campo.paso}
                      value={valorSegundos}
                      onChange={(e) =>
                        actualizarTiempoPresentacion(
                          campo.clave,
                          e.target.value,
                          campo.minimo * 1000,
                          campo.maximo * 1000
                        )
                      }
                    />

                    <label>
                      <input
                        type="number"
                        min={campo.minimo}
                        max={campo.maximo}
                        step={campo.paso}
                        value={formatearMilisegundosSegundos(
                          valorMs
                        )}
                        onChange={(e) =>
                          actualizarTiempoPresentacion(
                            campo.clave,
                            e.target.value,
                            campo.minimo * 1000,
                            campo.maximo * 1000
                          )
                        }
                      />

                      <span>s</span>
                    </label>
                  </div>
                </article>
              )
            }
          )}
        </div>

        <div className="preview-tiempos-presentacion">
          <div>
            <span>SECUENCIA ACTUAL</span>

            <strong>
              Inicio
              {' → '}
              {formatearMilisegundosSegundos(
                tiemposPresentacion.retrasoPrimerJugadorMs
              )}s
              {' → Jugador 1 → '}
              {formatearMilisegundosSegundos(
                tiemposPresentacion.intervaloRevelacionMs
              )}s
              {' → Jugador 2 → … → Equipo completo'}
            </strong>
          </div>

          <button
            type="button"
            className="boton boton-principal"
            disabled={
              guardandoTiemposPresentacion
            }
            onClick={
              guardarTiemposPresentacion
            }
          >
            {guardandoTiemposPresentacion
              ? 'Guardando...'
              : 'Guardar tiempos y estilo'}
          </button>
        </div>

        {mensajeTiemposPresentacion && (
          <p className="estado">
            {mensajeTiemposPresentacion}
          </p>
        )}

      </section>
    </main>
  )
}



/*
============================================================
PANTALLA MÚSICA DE PRESENTACIÓN
============================================================
*/

if (
  pantalla === 'musica-presentacion' &&
  sorteoSeleccionado
) {
  const efectosPresentacion = [
    {
      tipo: 'jugador',
      titulo: 'Al revelar cada jugador',
      nombreDefecto: 'Rayo',
      descripcion:
        'Un rayo corto y potente acompaña la entrada de cada jugador.',
      icono: '⚡',
      path:
        musicaPresentacion.jugadorPath,
      nombre:
        musicaPresentacion.jugadorNombre,
      volumen:
        musicaPresentacion.jugadorVolumen,
      activo:
        musicaPresentacion.jugadorActivo,
      stateVolumen:
        'jugadorVolumen',
      stateActivo:
        'jugadorActivo',
    },
    {
      tipo: 'equipo',
      titulo: 'Al completar el equipo',
      nombreDefecto: 'Bomba / impacto',
      descripcion:
        'Un impacto grave refuerza el momento en que aparece el equipo completo.',
      icono: '💣',
      path:
        musicaPresentacion.equipoPath,
      nombre:
        musicaPresentacion.equipoNombre,
      volumen:
        musicaPresentacion.equipoVolumen,
      activo:
        musicaPresentacion.equipoActivo,
      stateVolumen:
        'equipoVolumen',
      stateActivo:
        'equipoActivo',
    },
    {
      tipo: 'resumen',
      titulo: 'Al mostrar el resumen final',
      nombreDefecto: 'Fanfarria de victoria',
      descripcion:
        'Una fanfarria corta abre el resultado final del sorteo.',
      icono: '🏆',
      path:
        musicaPresentacion.resumenPath,
      nombre:
        musicaPresentacion.resumenNombre,
      volumen:
        musicaPresentacion.resumenVolumen,
      activo:
        musicaPresentacion.resumenActivo,
      stateVolumen:
        'resumenVolumen',
      stateActivo:
        'resumenActivo',
    },
  ]

  const pistasMusica = [
    {
      tipo: 'espera',
      titulo: 'Antes del sorteo',
      subtitulo: 'Música de espera',
      descripcion:
        'Sonará mientras la TV muestre “El sorteo comenzará en breve”.',
      icono: '⏳',
      path:
        musicaPresentacion.esperaPath,
      nombre:
        musicaPresentacion.esperaNombre,
      volumen:
        musicaPresentacion.esperaVolumen,
    },
    {
      tipo: 'sorteo',
      titulo: 'Durante el sorteo',
      subtitulo: 'Música principal',
      descripcion:
        'Entrará con un fundido cuando comience el sorteo y seguirá en bucle durante la presentación.',
      icono: '🎬',
      path:
        musicaPresentacion.sorteoPath,
      nombre:
        musicaPresentacion.sorteoNombre,
      volumen:
        musicaPresentacion.sorteoVolumen,
    },
  ]

  return (
    <main className="app app-admin">
      <section className="panel-admin">

        <button
          className="boton-volver"
          onClick={() =>
            setPantalla(
              'gestionar-sorteo'
            )
          }
        >
          ← Volver al sorteo
        </button>

        <header className="cabecera-gestion">
          <div>
            <p className="etiqueta">
              PRESENTACIÓN
            </p>

            <h2>
              Música de presentación
            </h2>

            <p className="descripcion-admin">
              {sorteoSeleccionado.nombre}
            </p>
          </div>

          <span className="badge-estado">
            🎵 MP3
          </span>
        </header>

        <div className="intro-musica-presentacion">
          <div>
            <span>🎧</span>
          </div>

          <p>
            Selecciona canciones MP3 de cualquier carpeta de tu ordenador.
            Se subirán a Supabase y la TV las precargará completas antes
            del sorteo para evitar cortes durante la presentación.
          </p>
        </div>

        <div className="grid-musica-presentacion">
          {pistasMusica.map(
            (pista) => {
              const estaSubiendo =
                subiendoMusicaPresentacion ===
                pista.tipo

              const url =
                pista.path
                  ? obtenerUrlMusica(
                      pista.path
                    )
                  : null

              return (
                <article
                  className="tarjeta-musica-presentacion"
                  key={pista.tipo}
                >
                  <header>
                    <div className="icono-pista-musica">
                      {pista.icono}
                    </div>

                    <div>
                      <span>
                        {pista.titulo}
                      </span>

                      <h3>
                        {pista.subtitulo}
                      </h3>

                      <p>
                        {pista.descripcion}
                      </p>
                    </div>
                  </header>

                  <div
                    className={`archivo-musica-actual ${
                      pista.path
                        ? 'archivo-musica-configurado'
                        : ''
                    }`}
                  >
                    <span>
                      {pista.path
                        ? '✓'
                        : '—'}
                    </span>

                    <div>
                      <small>
                        CANCIÓN ACTUAL
                      </small>

                      <strong>
                        {pista.nombre ??
                          'Sin música configurada'}
                      </strong>
                    </div>
                  </div>

                  {url && (
                    <audio
                      className="preview-audio-musica"
                      data-tipo-musica={pista.tipo}
                      controls
                      preload="metadata"
                      src={url}
                      onLoadedMetadata={(e) => {
                        e.currentTarget.volume =
                          Math.max(
                            0,
                            Math.min(
                              1,
                              Number(pista.volumen) / 100
                            )
                          )
                      }}
                      onVolumeChange={(e) => {
                        /*
                        El botón de silencio del reproductor nativo es
                        independiente del volumen. Mientras esté silenciado
                        conservamos el porcentaje elegido para recuperarlo
                        al volver a activar el sonido.
                        */
                        if (e.currentTarget.muted) {
                          return
                        }

                        const nuevoVolumen =
                          Math.round(
                            e.currentTarget.volume * 100
                          )

                        setMusicaPresentacion(
                          (actual) => ({
                            ...actual,

                            [pista.tipo === 'espera'
                              ? 'esperaVolumen'
                              : 'sorteoVolumen']:
                              nuevoVolumen,
                          })
                        )
                      }}
                    />
                  )}

                  <div className="acciones-pista-musica">
                    <label
                      className={`boton boton-principal selector-mp3 ${
                        estaSubiendo
                          ? 'selector-mp3-bloqueado'
                          : ''
                      }`}
                    >
                      <input
                        type="file"
                        accept=".mp3,audio/mpeg"
                        disabled={
                          Boolean(
                            subiendoMusicaPresentacion
                          )
                        }
                        onChange={(e) =>
                          subirMusicaPresentacion(
                            e,
                            pista.tipo
                          )
                        }
                      />

                      {estaSubiendo
                        ? 'Subiendo...'
                        : pista.path
                          ? 'Cambiar MP3'
                          : 'Seleccionar MP3'}
                    </label>

                    {pista.path && (
                      <button
                        type="button"
                        className="boton boton-secundario"
                        disabled={
                          Boolean(
                            subiendoMusicaPresentacion
                          )
                        }
                        onClick={() =>
                          eliminarMusicaPresentacion(
                            pista.tipo
                          )
                        }
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div className="volumen-pista-musica">
                    <div>
                      <span>
                        Volumen
                      </span>

                      <strong>
                        {pista.volumen}%
                      </strong>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={pista.volumen}
                      onChange={(e) => {
                        const nuevoVolumen =
                          Number(e.target.value)

                        setMusicaPresentacion(
                          (actual) => ({
                            ...actual,

                            [pista.tipo === 'espera'
                              ? 'esperaVolumen'
                              : 'sorteoVolumen']:
                              nuevoVolumen,
                          })
                        )

                        /*
                        Sincronizamos inmediatamente el reproductor nativo
                        para que el control superior y el deslizador inferior
                        representen siempre el mismo volumen.
                        */
                        const reproductor =
                          document.querySelector(
                            `audio[data-tipo-musica="${pista.tipo}"]`
                          )

                        if (reproductor) {
                          reproductor.volume =
                            Math.max(
                              0,
                              Math.min(
                                1,
                                nuevoVolumen / 100
                              )
                            )
                        }
                      }}
                    />
                  </div>
                </article>
              )
            }
          )}
        </div>

        <div className="cabecera-seccion-efectos">
          <div>
            <span>EFECTOS DE SONIDO</span>
            <h3>Sonidos de la revelación</h3>
            <p>
              Si no configuras ningún archivo, se usan automáticamente
              los efectos predeterminados: rayo, bomba y fanfarria final.
              Puedes sustituir cualquiera por tu propio MP3 o WAV.
            </p>
          </div>
        </div>

        <div className="control-sonidos-revelacion">
          <div>
            <span>SONIDOS DE EFECTO EN LA TV</span>

            <strong>
              {[
                musicaPresentacion.jugadorActivo,
                musicaPresentacion.equipoActivo,
                musicaPresentacion.resumenActivo,
              ].filter(Boolean).length}
              {' de 3 activos'}
            </strong>

            <p>
              La música de espera y la música principal seguirán sonando
              aunque desactives todos los efectos.
            </p>
          </div>

          <div className="acciones-control-sonidos">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() =>
                setMusicaPresentacion(
                  (actual) => ({
                    ...actual,
                    jugadorActivo: false,
                    equipoActivo: false,
                    resumenActivo: false,
                  })
                )
              }
            >
              🔇 Silenciar todos
            </button>

            <button
              type="button"
              className="boton boton-secundario"
              onClick={() =>
                setMusicaPresentacion(
                  (actual) => ({
                    ...actual,
                    jugadorActivo: true,
                    equipoActivo: true,
                    resumenActivo: true,
                  })
                )
              }
            >
              🔊 Activar todos
            </button>
          </div>
        </div>

        <div className="grid-efectos-presentacion">
          {efectosPresentacion.map(
            (efecto) => {
              const estaSubiendo =
                subiendoMusicaPresentacion ===
                `efecto-${efecto.tipo}`

              const url =
                efecto.path
                  ? obtenerUrlMusica(
                      efecto.path
                    )
                  : null

              return (
                <article
                  className={`tarjeta-efecto-presentacion ${
                    efecto.activo
                      ? ''
                      : 'tarjeta-efecto-silenciada'
                  }`}
                  key={efecto.tipo}
                >
                  <header>
                    <div className="icono-efecto-presentacion">
                      {efecto.icono}
                    </div>

                    <div>
                      <span>
                        {efecto.titulo}
                      </span>

                      <h3>
                        {efecto.path
                          ? 'Efecto personalizado'
                          : efecto.nombreDefecto}
                      </h3>

                      <p>
                        {efecto.descripcion}
                      </p>
                    </div>
                  </header>

                  <div className="control-efecto-individual">
                    <div>
                      <small>
                        SONIDO DURANTE EL SORTEO
                      </small>

                      <strong>
                        {efecto.activo
                          ? 'Activado'
                          : 'Sin sonido'}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className={`interruptor-sonido-efecto ${
                        efecto.activo
                          ? 'interruptor-sonido-activo'
                          : ''
                      }`}
                      aria-pressed={efecto.activo}
                      onClick={() =>
                        setMusicaPresentacion(
                          (actual) => ({
                            ...actual,
                            [efecto.stateActivo]:
                              !actual[efecto.stateActivo],
                          })
                        )
                      }
                    >
                      <span />
                      {efecto.activo
                        ? 'Sí'
                        : 'No'}
                    </button>
                  </div>

                  <div
                    className={`archivo-musica-actual ${
                      efecto.path
                        ? 'archivo-musica-configurado'
                        : ''
                    }`}
                  >
                    <span>
                      {efecto.path
                        ? '✓'
                        : efecto.icono}
                    </span>

                    <div>
                      <small>
                        SONIDO ACTUAL
                      </small>

                      <strong>
                        {efecto.nombre ??
                          `${efecto.nombreDefecto} · predeterminado`}
                      </strong>
                    </div>
                  </div>

                  {url ? (
                    <audio
                      className="preview-audio-musica"
                      data-tipo-efecto={efecto.tipo}
                      controls
                      preload="metadata"
                      src={url}
                      onLoadedMetadata={(e) => {
                        e.currentTarget.volume =
                          Math.max(
                            0,
                            Math.min(
                              1,
                              Number(efecto.volumen) / 100
                            )
                          )
                      }}
                      onVolumeChange={(e) => {
                        if (e.currentTarget.muted) {
                          return
                        }

                        const nuevoVolumen =
                          Math.round(
                            e.currentTarget.volume * 100
                          )

                        setMusicaPresentacion(
                          (actual) => ({
                            ...actual,
                            [efecto.stateVolumen]:
                              nuevoVolumen,
                          })
                        )
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="boton-probar-efecto"
                      onClick={() =>
                        probarEfectoPredeterminado(
                          efecto.tipo
                        )
                      }
                    >
                      ▶ Probar {efecto.nombreDefecto}
                    </button>
                  )}

                  <div className="acciones-pista-musica">
                    <label
                      className={`boton boton-principal selector-mp3 ${
                        estaSubiendo
                          ? 'selector-mp3-bloqueado'
                          : ''
                      }`}
                    >
                      <input
                        type="file"
                        accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
                        disabled={
                          Boolean(
                            subiendoMusicaPresentacion
                          )
                        }
                        onChange={(e) =>
                          subirEfectoPresentacion(
                            e,
                            efecto.tipo
                          )
                        }
                      />

                      {estaSubiendo
                        ? 'Subiendo...'
                        : efecto.path
                          ? 'Cambiar efecto'
                          : 'Usar mi sonido'}
                    </label>

                    {efecto.path && (
                      <button
                        type="button"
                        className="boton boton-secundario"
                        disabled={
                          Boolean(
                            subiendoMusicaPresentacion
                          )
                        }
                        onClick={() =>
                          restaurarEfectoPredeterminado(
                            efecto.tipo
                          )
                        }
                      >
                        Restaurar predeterminado
                      </button>
                    )}
                  </div>

                  <div className="volumen-pista-musica">
                    <div>
                      <span>
                        Volumen
                      </span>

                      <strong>
                        {efecto.volumen}%
                      </strong>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={efecto.volumen}
                      onChange={(e) => {
                        const nuevoVolumen =
                          Number(
                            e.target.value
                          )

                        setMusicaPresentacion(
                          (actual) => ({
                            ...actual,
                            [efecto.stateVolumen]:
                              nuevoVolumen,
                          })
                        )

                        const reproductor =
                          document.querySelector(
                            `audio[data-tipo-efecto="${efecto.tipo}"]`
                          )

                        if (reproductor) {
                          reproductor.volume =
                            Math.max(
                              0,
                              Math.min(
                                1,
                                nuevoVolumen / 100
                              )
                            )
                        }
                      }}
                    />
                  </div>
                </article>
              )
            }
          )}
        </div>

        <div className="nota-precarga-musica">
          <span>⚡</span>

          <div>
            <strong>
              Precarga antes del directo
            </strong>

            <p>
              Al abrir la TV, las canciones y cualquier efecto personalizado
              se descargan en segundo plano. Si un efecto personalizado fallase,
              la TV utilizará automáticamente el efecto predeterminado.
            </p>
          </div>
        </div>

        <div className="acciones-guardar-musica">
          <button
            type="button"
            className="boton boton-principal"
            disabled={
              guardandoMusicaPresentacion ||
              Boolean(
                subiendoMusicaPresentacion
              )
            }
            onClick={
              guardarVolumenesMusicaPresentacion
            }
          >
            {guardandoMusicaPresentacion
              ? 'Guardando...'
              : 'Guardar música y sonidos'}
          </button>
        </div>

        {mensajeMusicaPresentacion && (
          <p className="estado">
            {mensajeMusicaPresentacion}
          </p>
        )}

      </section>
    </main>
  )
}


/*
============================================================
PANTALLA RESULTADO GENERADO
============================================================
*/

if (
  pantalla === 'resultado-sorteo' &&
  sorteoSeleccionado
) {
  const esLigaUnicaResultado =
    String(
      sorteoSeleccionado.formato_sorteo ?? 'grupos'
    ).toLowerCase() === 'liga_unica'

  const gruposResultado = esLigaUnicaResultado
    ? [
        {
          codigo: 'LIGA',
          nombre: 'Equipos sorteados',
        },
      ]
    : [
    ...new Map(
      equiposResultado.map((equipo) => [
        equipo.codigo_grupo ?? equipo.grupo ?? 'SIN-GRUPO',
        {
          codigo:
            equipo.codigo_grupo ?? '—',
          nombre:
            equipo.grupo ?? 'Sin grupo',
        },
      ])
    ).values(),
      ].sort((a, b) =>
        String(a.codigo).localeCompare(
          String(b.codigo),
          undefined,
          { numeric: true }
        )
      )

  return (
    <main className="app app-admin">
      <section className="panel-admin">

        <button
          className="boton-volver"
          onClick={() =>
            setPantalla('preparar-sorteo')
          }
        >
          ← Volver a Generar sorteo
        </button>

        <header className="cabecera-gestion">
          <div>
            <p className="etiqueta">
              REVISIÓN PREVIA
            </p>

            <h2>
              Resultado generado
            </h2>

            <p className="descripcion-admin">
              {sorteoSeleccionado.nombre}
            </p>
          </div>

          {ejecucionResultado && (
            <div className="bloque-acciones-oficialidad">
              <div
                className={`datos-ejecucion-resultado ${
                  ejecucionResultado.oficial
                    ? 'datos-ejecucion-oficial'
                    : ''
                }`}
              >
                <span>
                  Ejecución {ejecucionResultado.numero}
                </span>

                <strong>
                  {ejecucionResultado.oficial
                    ? '🏆 OFICIAL'
                    : 'VISTA PREVIA'}
                </strong>
              </div>

              <button
                type="button"
                className={
                  ejecucionResultado.oficial
                    ? 'boton boton-secundario boton-oficialidad'
                    : 'boton boton-principal boton-oficialidad'
                }
                disabled={accionOficialidad}
                onClick={() =>
                  solicitarCambioOficialidad(
                    ejecucionResultado.oficial
                      ? 'quitar'
                      : 'marcar',
                    ejecucionResultado
                  )
                }
              >
                {ejecucionResultado.oficial
                  ? '🔓 Quitar oficialidad'
                  : '🏆 Marcar como oficial'}
              </button>
            </div>
          )}
        </header>

        {mensajeOficialidad && (
          <div className="mensaje-oficialidad">
            {mensajeOficialidad}
          </div>
        )}

        {ejecucionResultado?.huella && (
          <div
            className={`tarjeta-auditoria-sorteo ${
              auditoriaResultado?.coincide === false
                ? 'tarjeta-auditoria-alerta'
                : ''
            }`}
          >
            <div className="icono-auditoria-sorteo">
              {auditoriaResultado?.coincide === false
                ? '⚠'
                : '🔐'}
            </div>

            <div className="contenido-auditoria-sorteo">
              <div className="cabecera-auditoria-sorteo">
                <span>HUELLA DEL RESULTADO</span>

                <strong>
                  {auditoriaResultado?.coincide === false
                    ? 'No coincide'
                    : '✓ Verificada'}
                </strong>
              </div>

              <code>
                {formatearHuellaCorta(
                  ejecucionResultado.huella
                )}
              </code>

              <small>
                Generada el{' '}
                {formatearFechaHoraPantalla(
                  ejecucionResultado.huellaGeneradaEn
                )}
                . Si cambia la composición, el grupo o el orden de
                revelación, la verificación deja de coincidir.
              </small>
            </div>
          </div>
        )}

        {cargandoResultado && (
          <p className="estado">
            Cargando resultado generado...
          </p>
        )}

        {errorResultado && (
          <p className="mensaje-login">
            Error: {errorResultado}
          </p>
        )}

        {!cargandoResultado &&
          !errorResultado &&
          equiposResultado.length > 0 && (
            <>
              <div className="resumen-resultado-sorteo">
                <div>
                  <span>Equipos</span>
                  <strong>
                    {equiposResultado.length}
                  </strong>
                </div>

                <div>
                  <span>
                    {esLigaUnicaResultado
                      ? 'Formato'
                      : 'Grupos'}
                  </span>

                  <strong>
                    {esLigaUnicaResultado
                      ? 'Liga única'
                      : gruposResultado.length}
                  </strong>
                </div>

                <div>
                  <span>Revelación</span>
                  <strong>
                    {equiposResultado.length} turnos
                  </strong>
                </div>
              </div>

              <div className="aviso-resultado-sorteo">
                <span>ℹ</span>

                <p>
                  Este es el resultado interno de la última ejecución.
                  El número de orden indica cuándo se revelará cada
                  equipo durante la presentación.
                </p>
              </div>

              <div className="grupos-resultado">
                {gruposResultado.map((grupoActual) => {
                  const equiposDelGrupo =
                    esLigaUnicaResultado
                      ? equiposResultado
                      : equiposResultado.filter(
                          (equipo) =>
                            (
                              equipo.codigo_grupo ??
                              equipo.grupo ??
                              'SIN-GRUPO'
                            ) ===
                            (
                              grupoActual.codigo !== '—'
                                ? grupoActual.codigo
                                : grupoActual.nombre
                            )
                        )

                  return (
                    <section
                      className="grupo-resultado"
                      key={`${grupoActual.codigo}-${grupoActual.nombre}`}
                    >
                      <header className="cabecera-grupo-resultado">
                        <div className="identidad-grupo-resultado">
                          {!esLigaUnicaResultado && (
                            <span>
                              {grupoActual.codigo}
                            </span>
                          )}

                          <div>
                            <h3>
                              {grupoActual.nombre}
                            </h3>

                            <small>
                              {equiposDelGrupo.length}
                              {' '}
                              {equiposDelGrupo.length === 1
                                ? 'equipo'
                                : 'equipos'}
                            </small>
                          </div>
                        </div>
                      </header>

                      <div className="lista-equipos-resultado">
                        {equiposDelGrupo.map((equipo) => {
                          const miembros = obtenerMiembrosEquipoPublico(equipo)

                          return (
                            <article
                              className="tarjeta-equipo-resultado"
                              key={equipo.equipo_id}
                            >
                              <div className="orden-revelacion-resultado">
                                <span>ORDEN</span>
                                <strong>#{equipo.orden_revelacion}</strong>
                              </div>

                              <div
                                className="miembros-resultado-dinamicos"
                                data-miembros={miembros.length}
                              >
                                {miembros.map((miembro, indice) => {
                                  const foto =
                                    miembro.foto_path ||
                                    fotosResultado[miembro.codigo_jugador]

                                  return (
                                    <Fragment key={miembro.codigo_jugador || `${miembro.nombre}-${indice}`}>
                                      {indice > 0 && (
                                        <div className="signo-pareja-resultado">+</div>
                                      )}
                                      <div className="jugador-resultado">
                                        <div className="foto-resultado">
                                          {foto ? (
                                            <img
                                              src={obtenerUrlFoto(foto)}
                                              alt={miembro.nombre}
                                            />
                                          ) : (
                                            <span>{obtenerIniciales(miembro.nombre)}</span>
                                          )}
                                        </div>
                                        <div>
                                          <strong>{miembro.nombre}</strong>
                                          <small>
                                            {miembro.codigo_jugador}
                                            {' · '}
                                            {miembro.bombo ?? 'Jugador'}
                                          </small>
                                        </div>
                                      </div>
                                    </Fragment>
                                  )
                                })}
                              </div>

                              <div className="meta-equipo-resultado">
                                <span>Equipo {equipo.numero_equipo}</span>
                                <span>{equipo.regla}</span>
                                <span
                                  className={
                                    equipo.estado_revelacion === 'revelado'
                                      ? 'estado-equipo-revelado'
                                      : 'estado-equipo-oculto'
                                  }
                                >
                                  {equipo.estado_revelacion === 'revelado'
                                    ? 'Revelado'
                                    : 'Oculto'}
                                </span>
                              </div>
                            </article>
                          )
                        })}

                      </div>
                    </section>
                  )
                })}
              </div>

              <div className="zona-control-presentacion-resultado">
                <div>
                  <h3>
                    Presentación en directo
                  </h3>

                  <p>
                    Cuando hayas revisado los equipos, entra en el mismo
                    Control de presentación desde el que se iniciará y
                    manejará la revelación en la TV.
                  </p>
                </div>

                <button
                  type="button"
                  className="boton boton-principal"
                  onClick={abrirControlPresentacion}
                >
                  🎬 Ir al Control de presentación
                </button>
              </div>
            </>
          )}

        {!cargandoResultado &&
          !errorResultado &&
          equiposResultado.length === 0 && (
            <div className="sin-datos">
              <p>
                No hay equipos en la última ejecución.
              </p>

              <span>
                Vuelve a Generar sorteo y crea una nueva ejecución.
              </span>
            </div>
          )}

        {renderModalOficialidad()}

      </section>
    </main>
  )
}


/*
============================================================
PANTALLA CONTROL DE PRESENTACIÓN
============================================================
*/

if (
  pantalla === 'control-presentacion' &&
  sorteoSeleccionado
) {
  const estadoActual =
    String(
      estadoPresentacion?.estado ?? ''
    ).toLowerCase()

  const totalEquipos =
    Number(
      estadoPresentacion?.total_equipos ?? 0
    )

  const equiposRevelados =
    Number(
      estadoPresentacion?.equipos_revelados ?? 0
    )

  const equiposPendientes =
    Number(
      estadoPresentacion?.equipos_pendientes ?? 0
    )

  const porcentaje =
    totalEquipos > 0
      ? Math.round(
          (equiposRevelados / totalEquipos) * 100
        )
      : 0

  const esLigaUnicaControl =
    String(
      sorteoSeleccionado.formato_sorteo ?? 'grupos'
    ).toLowerCase() === 'liga_unica'

  const ultimoRevelado =
    equiposReveladosControl.length > 0
      ? equiposReveladosControl[
          equiposReveladosControl.length - 1
        ]
      : null

  const miembrosUltimoRevelado =
    ultimoRevelado
      ? obtenerMiembrosEquipoPublico(ultimoRevelado)
      : []

  return (
    <main className="app app-admin">
      <section className="panel-admin">

        <button
          className="boton-volver"
          onClick={() =>
            setPantalla('gestionar-sorteo')
          }
        >
          ← Volver al sorteo
        </button>

        <header className="cabecera-gestion">
          <div>
            <p className="etiqueta">
              CONTROL EN DIRECTO
            </p>

            <h2>
              Presentación
            </h2>

            <p className="descripcion-admin">
              {sorteoSeleccionado.nombre}
            </p>
          </div>

          <div className="acciones-cabecera-presentacion">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={abrirPantallaPublica}
            >
              🖥 Abrir pantalla pública
            </button>

            {estadoPresentacion && (
              <>
                <button
                  type="button"
                  className="boton boton-principal"
                  onClick={abrirModoControlMovil}
                >
                  📱 Modo móvil
                </button>

                <button
                  type="button"
                  className="boton boton-secundario"
                  onClick={copiarEnlaceControlMovil}
                >
                  {enlaceControlMovilCopiado
                    ? '✓ Enlace copiado'
                    : '🔗 Copiar enlace móvil'}
                </button>
              </>
            )}

            <button
              type="button"
              className="boton boton-secundario"
              onClick={() =>
                cargarEstadoControlPresentacion()
              }
              disabled={
                cargandoControlPresentacion ||
                accionPresentacion
              }
            >
              {cargandoControlPresentacion
                ? 'Actualizando...'
                : '↻ Actualizar estado'}
            </button>

            {estadoPresentacion && (
              <button
                type="button"
                className={
                  estadoPresentacion.es_oficial
                    ? 'boton boton-secundario boton-oficialidad'
                    : 'boton boton-principal boton-oficialidad'
                }
                disabled={
                  accionOficialidad ||
                  accionPresentacion
                }
                onClick={() =>
                  solicitarCambioOficialidad(
                    estadoPresentacion.es_oficial
                      ? 'quitar'
                      : 'marcar',
                    estadoPresentacion
                  )
                }
              >
                {estadoPresentacion.es_oficial
                  ? '🔓 Quitar oficialidad'
                  : '🏆 Hacer oficial'}
              </button>
            )}
          </div>
        </header>

        {cargandoControlPresentacion &&
          !estadoPresentacion && (
            <p className="estado">
              Recuperando estado de la presentación...
            </p>
          )}

        {errorControlPresentacion && (
          <p className="mensaje-login">
            Error: {errorControlPresentacion}
          </p>
        )}

        {mensajeOficialidad && (
          <div className="mensaje-oficialidad">
            {mensajeOficialidad}
          </div>
        )}

        {estadoPresentacion && (
          <>
            <div className="cabecera-control-presentacion">
              <div className="estado-directo">
                <span
                  className={`punto-directo estado-directo-${estadoActual || 'desconocido'}`}
                />

                <div>
                  <small>
                    ESTADO
                  </small>

                  <strong>
                    {estadoActual === 'generada'
                      ? 'Preparada, sin iniciar'
                      : estadoActual === 'en_curso'
                        ? 'Presentación en curso'
                        : estadoActual === 'finalizada'
                          ? 'Presentación finalizada'
                          : estadoPresentacion.estado}
                  </strong>
                </div>
              </div>

              <div className="datos-control-ejecucion">
                <span>
                  Ejecución {estadoPresentacion.numero_ejecucion}
                </span>

                <span
                  className={
                    estadoPresentacion.es_oficial
                      ? 'badge-control-oficial'
                      : ''
                  }
                >
                  {estadoPresentacion.es_oficial
                    ? '🏆 OFICIAL'
                    : 'Vista previa'}
                </span>
              </div>
            </div>

            {estadoPresentacion.huella_resultado && (
              <div
                className={`huella-control-presentacion ${
                  estadoPresentacion.huella_verificada === false
                    ? 'huella-control-alerta'
                    : ''
                }`}
              >
                <span>
                  {estadoPresentacion.huella_verificada === false
                    ? '⚠'
                    : '🔐'}
                </span>

                <div>
                  <small>HUELLA</small>

                  <strong>
                    {formatearHuellaCorta(
                      estadoPresentacion.huella_resultado
                    )}
                  </strong>
                </div>

                <em>
                  {estadoPresentacion.huella_verificada === false
                    ? 'No coincide'
                    : '✓ Verificada'}
                </em>
              </div>
            )}

            <div className="panel-progreso-presentacion">
              <div className="contador-presentacion">
                <div>
                  <span>
                    Equipos revelados
                  </span>

                  <strong>
                    {equiposRevelados}
                    <small>
                      {' / '}
                      {totalEquipos}
                    </small>
                  </strong>
                </div>

                <div className="pendientes-presentacion">
                  <span>
                    Pendientes
                  </span>

                  <strong>
                    {equiposPendientes}
                  </strong>
                </div>
              </div>

              <div className="barra-progreso-presentacion">
                <span
                  style={{
                    width: `${porcentaje}%`,
                  }}
                />
              </div>

              <small className="porcentaje-presentacion">
                {porcentaje}% completado
              </small>
            </div>

            {estadoActual === 'generada' && (
              <div className="zona-accion-presentacion">
                <div className="icono-accion-presentacion">
                  ▶
                </div>

                <div className="texto-accion-presentacion">
                  <h3>
                    Todo preparado
                  </h3>

                  <p>
                    Al iniciar la presentación, la pantalla pública
                    quedará a la espera del primer equipo. Todavía no
                    se revelará ningún resultado.
                  </p>
                </div>

                <button
                  type="button"
                  className="boton boton-principal boton-presentacion-principal"
                  onClick={solicitarInicioPresentacion}
                  disabled={accionPresentacion}
                >
                  ▶ Iniciar presentación
                </button>
              </div>
            )}

            {estadoActual === 'en_curso' && (
              <div className="zona-accion-presentacion zona-accion-en-curso">
                <div className="icono-accion-presentacion">
                  🎉
                </div>

                <div className="texto-accion-presentacion">
                  <h3>
                    {equiposPendientes > 0
                      ? 'Preparado para el siguiente equipo'
                      : 'No quedan equipos pendientes'}
                  </h3>

                  <p>
                    {equiposPendientes > 0
                      ? `El siguiente clic revelará el equipo del turno #${equiposRevelados + 1} en la pantalla pública.`
                      : 'Todos los equipos de esta ejecución ya han sido revelados.'}
                  </p>
                </div>

                <button
                  type="button"
                  className="boton boton-principal boton-presentacion-principal"
                  onClick={revelarSiguienteEquipo}
                  disabled={
                    accionPresentacion ||
                    bloqueoSecuenciaPresentacion ||
                    equiposPendientes <= 0
                  }
                >
                  {accionPresentacion
                    ? 'Revelando...'
                    : bloqueoSecuenciaPresentacion
                      ? '⏳ Esperando animación...'
                      : '🎉 Revelar siguiente equipo'}
                </button>
              </div>
            )}

            {estadoActual === 'finalizada' && (
              <div className="zona-accion-presentacion zona-presentacion-finalizada">
                <div className="icono-accion-presentacion">
                  ✓
                </div>

                <div className="texto-accion-presentacion">
                  <h3>
                    Último equipo revelado
                  </h3>

                  <p>
                    {repeticionEnCursoControl
                      ? 'La TV está repitiendo toda la presentación con los mismos equipos y en el mismo orden. Al terminar mostrará automáticamente el resumen final.'
                      : resumenFinalEnviado
                        ? 'El resumen final está en la TV. También puedes repetir toda la presentación sin volver a sortear.'
                        : bloqueoSecuenciaPresentacion
                          ? 'Espera a que termine la animación de la última pareja.'
                          : 'Puedes mostrar el resumen final o repetir toda la presentación desde el principio.'}
                  </p>
                </div>

                <div className="acciones-final-presentacion">
                  <button
                    type="button"
                    className="boton boton-secundario boton-presentacion-principal"
                    onClick={repetirPresentacionEnTv}
                    disabled={
                      accionPresentacion ||
                      repeticionEnCursoControl ||
                      bloqueoSecuenciaPresentacion
                    }
                  >
                    {repeticionEnCursoControl
                      ? '↻ Reproduciendo...'
                      : '↻ Repetir presentación'}
                  </button>

                  <button
                    type="button"
                    className="boton boton-principal boton-presentacion-principal"
                    onClick={mostrarResumenFinalEnTv}
                    disabled={
                      accionPresentacion ||
                      bloqueoSecuenciaPresentacion ||
                      repeticionEnCursoControl ||
                      resumenFinalEnviado
                    }
                  >
                    {accionPresentacion
                      ? 'Enviando...'
                      : repeticionEnCursoControl
                        ? '⏳ Esperando repetición...'
                        : bloqueoSecuenciaPresentacion
                          ? '⏳ Esperando última pareja...'
                          : resumenFinalEnviado
                            ? '✓ Resumen mostrado'
                            : '📊 Mostrar resumen final'}
                  </button>
                </div>
              </div>
            )}

            {mensajePresentacion && (
              <p className="mensaje-control-presentacion">
                {mensajePresentacion}
              </p>
            )}

            {ultimoRevelado && (
              <section className="ultimo-equipo-revelado">
                <div className="titulo-ultimo-revelado">
                  <div>
                    <span>
                      ÚLTIMO EQUIPO REVELADO
                    </span>

                    <h3>
                      Turno #{ultimoRevelado.orden_revelacion}
                    </h3>
                  </div>

                  {!esLigaUnicaControl &&
                    ultimoRevelado.grupo && (
                      <strong>
                        {ultimoRevelado.grupo}
                      </strong>
                    )}
                </div>

                <div
                  className="pareja-control-presentacion miembros-control-dinamicos"
                  data-miembros={miembrosUltimoRevelado.length}
                >
                  {miembrosUltimoRevelado.map((miembro, indice) => {
                    const foto =
                      miembro.foto_path ||
                      fotosControlPresentacion[miembro.codigo_jugador]

                    return (
                      <Fragment key={miembro.codigo_jugador || `${miembro.nombre}-${indice}`}>
                        {indice > 0 && (
                          <div className="mas-control-presentacion">+</div>
                        )}
                        <div className="jugador-control-presentacion">
                          <div className="foto-control-presentacion">
                            {foto ? (
                              <img
                                src={obtenerUrlFoto(foto)}
                                alt={miembro.nombre}
                              />
                            ) : (
                              <span>{obtenerIniciales(miembro.nombre)}</span>
                            )}
                          </div>
                          <div>
                            <strong>{miembro.nombre}</strong>
                            <small>
                              {miembro.codigo_jugador}
                              {' · '}
                              {miembro.bombo ?? 'Jugador'}
                            </small>
                          </div>
                        </div>
                      </Fragment>
                    )
                  })}
                </div>
              </section>
            )}

            <section className="historial-revelados-control">
              <div className="cabecera-historial-revelados">
                <h3>
                  Equipos ya revelados
                </h3>

                <span>
                  {equiposReveladosControl.length}
                </span>
              </div>

              {equiposReveladosControl.length === 0 ? (
                <div className="sin-datos">
                  <p>
                    Todavía no se ha revelado ningún equipo.
                  </p>

                  <span>
                    El resultado oculto permanece protegido en Supabase.
                  </span>
                </div>
              ) : (
                <div className="lista-historial-revelados">
                  {equiposReveladosControl.map((equipo) => (
                    <article
                      className="fila-historial-revelado"
                      key={equipo.equipo_id}
                    >
                      <strong>
                        #{equipo.orden_revelacion}
                      </strong>

                      <span>
                        {obtenerMiembrosEquipoPublico(equipo)
                          .map((miembro) => miembro.nombre)
                          .join(' + ')}
                      </span>

                      {!esLigaUnicaControl &&
                        equipo.grupo && (
                          <small>
                            {equipo.grupo}
                          </small>
                        )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {renderModalOficialidad()}

        {mostrarConfirmacionInicioPresentacion && (
          <div
            className="modal-fondo"
            onClick={() =>
              setMostrarConfirmacionInicioPresentacion(false)
            }
          >
            <div
              className="modal-confirmacion"
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-iniciar-presentacion"
              onClick={(evento) =>
                evento.stopPropagation()
              }
            >
              <div className="modal-icono">
                ▶
              </div>

              <h3 id="titulo-iniciar-presentacion">
                ¿Iniciar la presentación?
              </h3>

              <p>
                La ejecución pasará a estar en curso.
                La pantalla pública podrá conectarse al sorteo,
                pero ningún equipo se mostrará hasta que pulses
                «Revelar siguiente equipo».
              </p>

              <div className="modal-aviso">
                Hay {totalEquipos} equipos preparados para revelar.
              </div>

              <div className="modal-acciones">
                <button
                  type="button"
                  className="boton boton-secundario"
                  onClick={() =>
                    setMostrarConfirmacionInicioPresentacion(false)
                  }
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="boton boton-principal"
                  onClick={confirmarInicioPresentacion}
                  disabled={accionPresentacion}
                >
                  ▶ Iniciar presentación
                </button>
              </div>
            </div>
          </div>
        )}

      </section>
    </main>
  )
}


  /*
  ============================================================
  GESTIONAR UN SORTEO
  ============================================================
  */

  if (
    pantalla === 'gestionar-sorteo' &&
    sorteoSeleccionado
  ) {
    return (
      <main className="app app-admin">
        <section className="panel-admin">

          <button
            className="boton-volver"
            onClick={() => {
              setSorteoSeleccionado(null)
              setBombos([])
              setPantalla('admin')
            }}
          >
            ← Volver al panel
          </button>

          <header className="cabecera-gestion">

            <div>

              <p className="etiqueta">
                GESTIÓN DEL SORTEO
              </p>

              <h2>
                {sorteoSeleccionado.nombre}
              </h2>

              {sorteoSeleccionado.descripcion && (
                <p className="descripcion-admin">
                  {
                    sorteoSeleccionado.descripcion
                  }
                </p>
              )}

            </div>

            <span
              className={`badge-estado estado-${sorteoSeleccionado.estado}`}
            >
              {sorteoSeleccionado.estado}
            </span>

          </header>

          <div className="resumen-sorteo">

            <div className="dato-resumen">

              <span>
                Fecha
              </span>

              <strong>
                {formatearFechaPantalla(
                  sorteoSeleccionado.fecha_evento
                )}
              </strong>

            </div>

            <div className="dato-resumen">

              <span>
                Formato
              </span>

              <strong>
                {
                  String(
                    sorteoSeleccionado.formato_sorteo ?? 'grupos'
                  ).toLowerCase() === 'liga_unica'
                    ? 'Liga única'
                    : `Por grupos · ${sorteoSeleccionado.numero_grupos}`
                }
              </strong>

            </div>

            {String(
              sorteoSeleccionado.formato_sorteo ?? 'grupos'
            ).toLowerCase() === 'grupos' && (
              <div className="dato-resumen">

                <span>
                  Reparto
                </span>

                <strong>
                  {String(
                    sorteoSeleccionado.distribucion_grupos ??
                    'equilibrada'
                  ).toLowerCase() === 'aleatoria'
                    ? 'Aleatorio'
                    : 'Equilibrado'}
                </strong>

              </div>
            )}

            <div className="dato-resumen">

              <span>
                Equipo
              </span>

              <strong>
                {sorteoSeleccionado.jugadores_por_equipo ?? 2} jugadores
              </strong>

            </div>

            <div className="dato-resumen">

              <span>
                Estado
              </span>

              <strong>
                {
                  sorteoSeleccionado.estado
                }
              </strong>

            </div>

          </div>

          <div className="menu-gestion">

            {/* BOMBOS */}
            <button
              className="opcion-gestion"
              onClick={abrirBombos}
            >
              <span className="icono-opcion">
                🎱
              </span>

              <span>
                <strong>
                  Bombos
                </strong>

                <small>
                  Crear y organizar los niveles del sorteo
                </small>
              </span>
            </button>

            {/* JUGADORES */}
            <button
               className="opcion-gestion"
                onClick={abrirJugadores}
            >
              <span className="icono-opcion">
                👥
              </span>

              <span>
                <strong>
                  Jugadores
                </strong>

                <small>
                  Añadir participantes y asignarlos a bombos
                </small>
              </span>
            </button>

            {/* EMPAREJAMIENTOS */}
            <button
              className="opcion-gestion"
              onClick={abrirEmparejamientos}
            >
              <span className="icono-opcion">
                🔗
              </span>

              <span>
                <strong>
                  Emparejamientos
                </strong>

                <small>
                  Configurar qué bombos se combinan
                </small>
              </span>
            </button>

            {/* EQUIPOS FIJOS */}
            <button
              className="opcion-gestion"
              onClick={abrirEquiposFijos}
            >
              <span className="icono-opcion">
                🤝
              </span>

              <span>
                <strong>
                  Equipos fijos
                </strong>

                <small>
                  Fijar parejas que no entrarán en la mezcla
                </small>
              </span>
            </button>

            {/* GRUPOS · solo cuando el formato realmente usa grupos */}
            {String(
              sorteoSeleccionado.formato_sorteo ?? 'grupos'
            ).toLowerCase() === 'grupos' && (
              <button
                className="opcion-gestion"
                onClick={abrirGrupos}
              >
                <span className="icono-opcion">
                  🏆
                </span>

                <span>
                  <strong>
                    Grupos
                  </strong>

                  <small>
                    Configurar los grupos del sorteo
                  </small>
                </span>
              </button>
            )}

            {/* TIEMPOS DE PRESENTACIÓN */}
            <button
              className="opcion-gestion"
              onClick={abrirTiemposPresentacion}
            >
              <span className="icono-opcion">
                ⏱
              </span>

              <span>
                <strong>
                  Tiempos y efectos de presentación
                </strong>

                <small>
                  Ajustar pausas, transiciones y estilo visual de la TV
                </small>
              </span>
            </button>

            {/* MÚSICA DE PRESENTACIÓN */}
            <button
              className="opcion-gestion"
              onClick={abrirMusicaPresentacion}
            >
              <span className="icono-opcion">
                🎵
              </span>

              <span>
                <strong>
                  Música de presentación
                </strong>

                <small>
                  Elegir música de espera y música del sorteo
                </small>
              </span>
            </button>

            {/* GENERAR SORTEO */}
            <button
              className="opcion-gestion opcion-preparar-sorteo"
              onClick={abrirPrepararSorteo}
            >
              <span className="icono-opcion">
                ✅
              </span>

              <span>
                <strong>
                  Generar sorteo
                </strong>

                <small>
                  Validar la configuración y crear una nueva combinación
                </small>
              </span>
            </button>

            {/* CONTROL DE PRESENTACIÓN
                Se muestra cuando el sorteo ya está en curso o finalizado,
                para poder volver al control aunque hayamos salido al panel. */}
            {['en_curso', 'finalizado'].includes(
              String(sorteoSeleccionado.estado ?? '').toLowerCase()
            ) && (
              <button
                className="opcion-gestion opcion-control-presentacion"
                onClick={abrirControlPresentacion}
              >
                <span className="icono-opcion">
                  🎬
                </span>

                <span>
                  <strong>
                    Control de presentación
                  </strong>

                  <small>
                    Presentar la ejecución generada y controlar la revelación
                  </small>
                </span>
              </button>
            )}

          </div>

        </section>
      </main>
    )
  }

  /*
  ============================================================
  PANEL DE ADMINISTRACIÓN
  ============================================================
  */

  if (
    pantalla === 'admin'
  ) {
    return (
      <main className="app app-admin">
        <section className="panel-admin">

          <header className="cabecera-admin">

            <div>

              <p className="etiqueta">
                ADMINISTRACIÓN
              </p>

              <h2>
                Panel de control
              </h2>

              <p className="descripcion-admin">
                Gestiona los sorteos y controla su presentación.
              </p>

            </div>

            <button
              className="boton boton-secundario"
              onClick={cerrarSesion}
            >
              Cerrar sesión
            </button>

          </header>

          <div className="barra-admin">

            <h3>
              Sorteos
            </h3>

            <div className="acciones-panel-admin">
              <button
                type="button"
                className="boton boton-secundario"
                onClick={
                  abrirGestionCatalogo
                }
              >
                👥 Catálogo de jugadores
              </button>

              <button
                className="boton boton-principal"
                onClick={() =>
                  setPantalla(
                    'nuevo-sorteo'
                  )
                }
              >
                + Nuevo sorteo
              </button>
            </div>

          </div>

          {cargandoSorteos && (
            <p className="estado">
              Cargando sorteos...
            </p>
          )}

          {errorSorteos && (
            <p className="mensaje-login">
              Error: {errorSorteos}
            </p>
          )}

          {!cargandoSorteos &&
            !errorSorteos &&
            sorteos.length === 0 && (
              <p className="estado">
                Todavía no hay sorteos creados.
              </p>
            )}

          <div className="lista-sorteos">

            {sorteos.map(
              (sorteo) => (
                <article
                  className="tarjeta-sorteo"
                  key={sorteo.id}
                >

                  <div className="tarjeta-sorteo-superior">

                    <div>

                      <h3>
                        {sorteo.nombre}
                      </h3>

                      {sorteo.descripcion && (
                        <p>
                          {
                            sorteo.descripcion
                          }
                        </p>
                      )}

                    </div>

                    <span
                      className={`badge-estado estado-${sorteo.estado}`}
                    >
                      {sorteo.estado}
                    </span>

                  </div>

                  <div className="datos-sorteo">

                    <span>
                      {String(
                        sorteo.formato_sorteo ?? 'grupos'
                      ).toLowerCase() === 'liga_unica'
                        ? 'Formato: Liga única'
                        : `Grupos: ${sorteo.numero_grupos} · ${
                            String(
                              sorteo.distribucion_grupos ??
                              'equilibrada'
                            ).toLowerCase() === 'aleatoria'
                              ? 'Aleatorio'
                              : 'Equilibrado'
                          }`}
                    </span>

                    <span>
                      Fecha:{' '}
                      {formatearFechaPantalla(
                        sorteo.fecha_evento
                      )}
                    </span>

                  </div>

                  <div className="acciones-tarjeta-sorteo">
                    <button
                      className="boton boton-secundario boton-gestionar"
                      onClick={() =>
                        gestionarSorteo(sorteo)
                      }
                    >
                      Gestionar
                    </button>

                    <button
                      type="button"
                      className="boton boton-eliminar-sorteo"
                      onClick={() => {
                        setMensajeEliminarSorteo('')
                        setSorteoPendienteEliminar(
                          sorteo
                        )
                      }}
                    >
                      🗑 Eliminar
                    </button>
                  </div>

                </article>
              )
            )}

          </div>

          {mensajeEliminarSorteo && (
            <p className="mensaje-eliminar-sorteo">
              {mensajeEliminarSorteo}
            </p>
          )}

          {sorteoPendienteEliminar && (
            <div
              className="modal-fondo"
              onClick={() =>
                !eliminandoSorteo &&
                setSorteoPendienteEliminar(
                  null
                )
              }
            >
              <div
                className="modal-confirmacion"
                onClick={(evento) =>
                  evento.stopPropagation()
                }
              >
                <div className="modal-icono modal-icono-peligro">
                  🗑
                </div>

                <h3>
                  ¿Eliminar este sorteo?
                </h3>

                <p>
                  Se eliminará completamente{' '}
                  <strong>
                    {sorteoPendienteEliminar.nombre}
                  </strong>{' '}
                  junto con sus participantes, bombos, reglas, grupos y ejecuciones.
                </p>

                <div className="modal-aviso modal-aviso-peligro">
                  Esta acción es definitiva. Los sorteos con una ejecución oficial no podrán borrarse.
                </div>

                <div className="modal-acciones">
                  <button
                    type="button"
                    className="boton boton-secundario"
                    onClick={() =>
                      setSorteoPendienteEliminar(
                        null
                      )
                    }
                    disabled={
                      eliminandoSorteo
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="boton boton-peligro"
                    onClick={
                      confirmarEliminarSorteo
                    }
                    disabled={
                      eliminandoSorteo
                    }
                  >
                    {eliminandoSorteo
                      ? 'Eliminando...'
                      : 'Eliminar definitivamente'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </section>
      </main>
    )
  }

  /*
  ============================================================
  PORTADA
  ============================================================
  */

  return (
    <main className="app">
      <section className="inicio">

        <div className="logo">
          🎾
        </div>

        <p className="etiqueta">
          SORTEO DE EQUIPOS
        </p>

        <h1>
          Sorteo Equipos
        </h1>

        <p className="descripcion">
          Gestión, generación y presentación de sorteos de equipos.
        </p>

        <div className="acciones">

          <button
            className="boton boton-principal"
            onClick={() =>
              setPantalla(
                'login'
              )
            }
          >
            Administración
          </button>

        </div>

        <p className="estado">
          {conexion}
        </p>

        {detalle && (
          <p className="estado">
            {detalle}
          </p>
        )}

      </section>
    </main>
  )
}

export default App
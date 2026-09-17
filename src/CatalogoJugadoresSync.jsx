import { useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import { supabaseCampeonato } from './lib/supabaseCampeonato'

function separarNombre(nombreOficial) {
  const texto = String(nombreOficial ?? '').trim()
  if (!texto) return { nombre: '', apellidos: null }
  const partes = texto.split(/\s+/)
  return {
    nombre: partes.shift() || texto,
    apellidos: partes.length ? partes.join(' ') : null,
  }
}

function nombreCompleto(item) {
  return [item?.nombre, item?.apellidos]
    .map((valor) => String(valor ?? '').trim())
    .filter(Boolean)
    .join(' ')
}

export default function CatalogoJugadoresSync() {
  const ejecutando = useRef(false)

  useEffect(() => {
    let cancelado = false

    async function marcar(id, error = null) {
      await supabase.rpc('admin_marcar_sincronizacion_catalogo', {
        p_id: id,
        p_error: error,
      })
    }

    async function procesarCola() {
      const respuesta = await supabase.rpc('admin_pendientes_sincronizacion_catalogo')
      if (respuesta.error || respuesta.data?.ok !== true) return

      for (const item of respuesta.data.pendientes ?? []) {
        if (cancelado) return
        try {
          let operacion
          if (item.operacion === 'eliminar') {
            operacion = await supabaseCampeonato.rpc(
              'admin_eliminar_o_desactivar_jugador_catalogo',
              { p_id_jugador: item.codigo_jugador }
            )
          } else {
            operacion = await supabaseCampeonato.rpc(
              'admin_sincronizar_jugador_catalogo',
              {
                p_id_jugador: item.codigo_jugador,
                p_nombre: nombreCompleto(item),
                p_alias: item.alias || item.nombre,
                p_activo: item.activo !== false,
              }
            )
          }

          if (operacion.error || operacion.data?.ok !== true) {
            throw new Error(
              operacion.error?.message || operacion.data?.error || 'No se pudo actualizar el catálogo maestro.'
            )
          }
          await marcar(item.id)
        } catch (error) {
          await marcar(item.id, error.message)
        }
      }
    }

    async function reconciliarDesdeMaestro() {
      const maestro = await supabaseCampeonato.rpc('admin_listar_catalogo_jugadores')
      if (maestro.error || maestro.data?.ok !== true) return

      const jugadoresMaestro = maestro.data.jugadores ?? []
      const codigosMaestro = new Set(jugadoresMaestro.map((j) => j.id_jugador))

      const locales = await supabase
        .from('jugadores')
        .select('id,codigo_jugador,foto_path,caricatura_path')
      if (locales.error) return

      for (const jugador of jugadoresMaestro) {
        if (cancelado) return
        const nombre = separarNombre(jugador.nombre_oficial)
        const aplicado = await supabase.rpc('admin_aplicar_jugador_maestro', {
          p_codigo: jugador.id_jugador,
          p_nombre: nombre.nombre,
          p_apellidos: nombre.apellidos,
          p_alias: jugador.alias || nombre.nombre,
          p_activo: jugador.activo !== false,
        })
        if (aplicado.error) {
          console.warn('No se pudo sincronizar el jugador', jugador.id_jugador, aplicado.error.message)
        }
      }

      for (const local of locales.data ?? []) {
        if (cancelado) return
        if (!codigosMaestro.has(local.codigo_jugador)) {
          const borrado = await supabase.rpc('admin_eliminar_jugador_local_por_codigo', {
            p_codigo: local.codigo_jugador,
          })
          if (borrado.error) {
            console.warn('No se pudo retirar del catálogo local', local.codigo_jugador, borrado.error.message)
          }
        }
      }
    }

    async function sincronizar() {
      if (ejecutando.current || cancelado) return
      ejecutando.current = true
      try {
        await procesarCola()
        await reconciliarDesdeMaestro()
      } catch (error) {
        console.warn('Sincronización de catálogo pendiente:', error.message)
      } finally {
        ejecutando.current = false
      }
    }

    const inicio = window.setTimeout(sincronizar, 500)
    const intervalo = window.setInterval(sincronizar, 5000)

    return () => {
      cancelado = true
      window.clearTimeout(inicio)
      window.clearInterval(intervalo)
    }
  }, [])

  return null
}

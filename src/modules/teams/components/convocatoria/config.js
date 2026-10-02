export const OPCIONES = [
  ['elegible', 'Me apunto'],
  ['no_disponible', 'No puedo'],
  ['pendiente', 'Todavía no sé'],
]

export function fechaHora(valor) {
  if (!valor) return ''
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

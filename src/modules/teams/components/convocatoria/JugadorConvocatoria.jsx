import { OPCIONES } from './config'

export default function JugadorConvocatoria({
  jugador,
  estados,
  origenes,
  accesos,
  codigos,
  equipos,
  preasignaciones,
  preOrigenes,
  usaPredeterminados,
  cambiar,
  cambiarEquipo,
  generarCodigo,
  copiarCodigo,
}) {
  const j = jugador
  const estado = estados[j.id_jugador] || ''
  const acceso = accesos[j.id_jugador] || {}
  const codigo = codigos[j.id_jugador]
  const equipoId = preasignaciones[j.id_jugador] || ''
  const origenEquipo = preOrigenes[j.id_jugador]

  return (
    <article
      className={'teams-jugador-estado ' + (estado || 'sin-respuesta')}
    >
      <div className="teams-jugador-identidad">
        <span className="teams-avatar">
          {(j.alias || j.nombre_oficial || '?').trim().charAt(0).toUpperCase()}
        </span>
        <span>
          <b>{j.alias || j.nombre_oficial}</b>
          {j.alias && j.nombre_oficial !== j.alias && (
            <small>{j.nombre_oficial}</small>
          )}
        </span>
      </div>

      {usaPredeterminados && (
        <div className="teams-equipo-convocatoria">
          <label>
            Equipo
            <select
              value={equipoId}
              onChange={e => cambiarEquipo(j.id_jugador,e.target.value)}
            >
              <option value="">Sin asignar</option>
              {equipos.map(e => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </label>
          {equipoId && (
            <small>
              {origenEquipo === 'web'
                ? 'Elegido por el jugador'
                : 'Asignado por administrador'}
            </small>
          )}
        </div>
      )}

      <div className="teams-estado-opciones">
        {OPCIONES.map(([v, t]) => (
          <button
            type="button"
            key={v}
            className={estado === v ? 'activo ' + v : ''}
            onClick={() => cambiar(j.id_jugador, v)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="teams-jugador-pie">
        <small className="teams-origen">
          {origenes[j.id_jugador] === 'web'
            ? 'Respondido en web'
            : estado
              ? 'Marcado por administrador'
              : 'Sin respuesta'}
        </small>

        <div className="teams-acceso-jugador">
          <span className={
            'teams-acceso-estado ' +
            (acceso.tiene_acceso ? 'activo' : acceso.codigo_pendiente ? 'pendiente' : '')
          }>
            {acceso.tiene_acceso
              ? 'Mi Zona activa'
              : acceso.codigo_pendiente
                ? 'Código pendiente'
                : 'Sin acceso'}
          </span>
          <button
            type="button"
            className="teams-pin-btn"
            onClick={() => generarCodigo(j)}
          >
            {acceso.acceso_creado ? '🔁 Restablecer acceso' : '🔐 Código manual'}
          </button>
        </div>
      </div>

      {codigo && (
        <div className="teams-codigo-alta">
          <span>Código de un solo uso</span>
          <strong>{codigo}</strong>
          <button type="button" onClick={() => copiarCodigo(codigo)}>
            Copiar
          </button>
          <small>Válido durante 48 horas</small>
        </div>
      )}
    </article>
  )
}

import { fechaHora } from './config'

export default function SolicitudesAcceso({
  solicitudes,
  codigos,
  copiarCodigo,
  generarCodigoSolicitud,
}) {
  if (!solicitudes.length) return null

  return (
    <section className="teams-solicitudes-alta">
      <div className="teams-solicitudes-cab">
        <div>
          <p className="etiqueta">MI ZONA</p>
          <h3>Solicitudes de acceso</h3>
          <p>
            Estos jugadores ya han elegido su PIN y están esperando el código
            de acceso del administrador.
          </p>
        </div>
        <strong>{solicitudes.length}</strong>
      </div>

      <div className="teams-solicitudes-lista">
        {solicitudes.map(s => {
          const codigo = codigos[s.id_jugador]

          return (
            <article className="teams-solicitud-alta" key={s.id_jugador}>
              <div>
                <b>{s.alias}</b>
                <span>{s.nombre_oficial}</span>
                <small>Solicitado: {fechaHora(s.solicitado_at)}</small>
              </div>

              <div className="teams-solicitud-acciones">
                {codigo ? (
                  <div className="teams-codigo-solicitud">
                    <strong>{codigo}</strong>
                    <button type="button" onClick={() => copiarCodigo(codigo)}>
                      Copiar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="boton boton-principal"
                    onClick={() => generarCodigoSolicitud(s)}
                  >
                    {s.codigo_pendiente ? 'Generar un código nuevo' : 'Generar código'}
                  </button>
                )}
                <small>
                  {codigo
                    ? 'Código de un solo uso · 48 h'
                    : s.codigo_pendiente
                      ? 'Ya existe un código pendiente, pero por seguridad no se vuelve a mostrar.'
                      : 'El jugador está esperando tu código.'}
                </small>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

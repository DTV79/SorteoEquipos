import Info from '../shared/Info'
import { FORMACION_INFO } from '../crear/config'

export default function PasoFormacion({ form, set, resumen, viabilidad }) {
  return (
<div className="teams-campos">
            <label>
              <span className="teams-label-info">
                Formación de los equipos
                <Info texto="Manual: reparte el administrador. Draft: eligen los capitanes. Sorteo: reparto aleatorio. Predeterminados: cada jugador pertenece a un lado desde la convocatoria." />
              </span>
              <select value={form.metodo_formacion} onChange={e => set('metodo_formacion',e.target.value)}>
                <option value="manual">Manual</option>
                <option value="draft">Draft de capitanes</option>
                <option value="sorteo">Sorteo</option>
                <option value="predeterminado">Equipos predeterminados</option>
              </select>
            </label>

            <div className="teams-ayuda-contextual">
              <b>{resumen.formacion}</b>
              <span>{FORMACION_INFO[form.metodo_formacion]}</span>
            </div>

            <label>
              <span className="teams-label-info">
                Designación de capitanes
                <Info texto="Administrador: los eliges tú. Definidos de antemano: quedan fijados expresamente antes de empezar. Elección del equipo: los jugadores votan desde Mi Zona y el administrador resuelve un posible empate. Sorteo: el sistema elige un capitán al azar dentro de cada equipo." />
              </span>
              <select
                value={form.modo_designacion_capitanes}
                onChange={e=>set('modo_designacion_capitanes',e.target.value)}
              >
                <option value="administrador">Los elige el administrador</option>
                <option value="predefinidos">Definidos de antemano</option>
                <option value="eleccion_equipo" disabled={form.metodo_formacion === 'draft'}>Los elige cada equipo</option>
                <option value="sorteo" disabled={form.metodo_formacion === 'draft'}>Sorteo entre los jugadores del equipo</option>
              </select>
            </label>

            <div className="teams-grid">
              <label>
                Jugadores por equipo
                <input type="number" min="1" value={form.jugadores_por_equipo} onChange={e=>set('jugadores_por_equipo',e.target.value)}/>
              </label>
              <label>
                Reservas por equipo
                <input type="number" min="0" value={form.reservas_por_equipo} onChange={e=>set('reservas_por_equipo',e.target.value)}/>
              </label>
            </div>

            {form.metodo_formacion === 'draft' && (
              <label>
                <span className="teams-label-info">
                  Tipo de draft
                  <Info texto="Alterno: A-B-A-B. Serpiente: A-B-B-A. Secreto por rondas: cada capitán elige sin conocer la elección rival. Conjunto: selección coordinada por la organización." />
                </span>
                <select value={form.tipo_draft} onChange={e=>set('tipo_draft',e.target.value)}>
                  <option value="alterno">Alterno · A-B-A-B</option>
                  <option value="serpiente">Serpiente · A-B-B-A</option>
                  <option value="secreto_rondas">Secreto por rondas</option>
                  <option value="conjunto">Selección conjunta</option>
                </select>
              </label>
            )}

            {form.metodo_formacion === 'predeterminado' && (
              <>
                <label>
                  <span className="teams-label-info">
                    ¿Quién decide el equipo?
                    <Info texto="Administrador: cada jugador tiene asignado su lado antes de apuntarse y no puede cambiarlo. Jugador: al apuntarse elige con qué equipo participa." />
                  </span>
                  <select
                    value={form.asignacion_predeterminada}
                    onChange={e=>set('asignacion_predeterminada',e.target.value)}
                  >
                    <option value="admin">Lo asigna el administrador</option>
                    <option value="jugador">Lo elige el jugador al apuntarse</option>
                  </select>
                </label>

                <div className="teams-grid">
                  <label>
                    Nombre Equipo A
                    <input value={form.nombre_equipo_a} onChange={e=>set('nombre_equipo_a',e.target.value)} placeholder="Centro Urbano"/>
                  </label>
                  <label>
                    Nombre Equipo B
                    <input value={form.nombre_equipo_b} onChange={e=>set('nombre_equipo_b',e.target.value)} placeholder="Rural"/>
                  </label>
                </div>

                <div className="teams-grid">
                  <label>
                    Color Equipo A
                    <input type="color" value={form.color_equipo_a} onChange={e=>set('color_equipo_a',e.target.value)}/>
                  </label>
                  <label>
                    Color Equipo B
                    <input type="color" value={form.color_equipo_b} onChange={e=>set('color_equipo_b',e.target.value)}/>
                  </label>
                </div>
              </>
            )}
          </div>
  )
}

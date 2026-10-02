# Teams · Administración

El módulo Teams está aislado del resto de la administración.

## Entrada

- `TeamsAdmin.jsx`: selector y enrutado interno del módulo.
- `teamsApi.js`: acceso a las RPC de Supabase.
- `TeamsAdmin.css`: índice de estilos; conserva el punto de importación original.

## Componentes principales

- `components/CrearTeams.jsx`: lógica y navegación del asistente.
- `components/crear/Paso*.jsx`: una pantalla por paso del asistente.
- `components/Convocatoria.jsx`: estado, carga y guardado de la convocatoria.
- `components/convocatoria/SolicitudesAcceso.jsx`: solicitudes de Mi Zona.
- `components/convocatoria/JugadorConvocatoria.jsx`: tarjeta individual de convocatoria.
- `components/Equipos.jsx`: coordinador de formación, capitanes y cierre.
- `components/equipos/Panel*.jsx`: paneles específicos de draft, manual, predeterminado, sorteo y capitanes.
- `components/Reglas.jsx`: edición y confirmación de reglas.
- `components/reglas/validacion.js`: validaciones de viabilidad.
- `components/Partidos.jsx`: lógica y coordinador del listado de partidos.
- `components/partidos/PartidoAdminCard.jsx`: tarjeta completa de un partido.
- `components/partidos/CampoFecha.jsx`: selector reutilizable de fecha/hora.
- `components/Incidencias.jsx`: resolución de incidencias.
- `components/GestionTeams.jsx`: coordinador de una edición.

## Configuración auxiliar

- `components/crear/config.js`: valores iniciales, pasos y textos de formación.
- `components/convocatoria/config.js`: opciones y formato de fechas.
- `components/equipos/config.js`: etiquetas de métodos de formación.
- `components/reglas/config.js`: textos específicos de reglas.
- `components/shared/Info.jsx`: ayuda contextual reutilizable.

## CSS

`TeamsAdmin.css` importa, en el mismo orden que antes del refactor:

1. `css/core.css`
2. `css/partidos.css`
3. `css/responsive.css`
4. `css/extras.css`

El refactor es estructural: no modifica reglas, textos visibles, estilos ni
flujos de la competición.

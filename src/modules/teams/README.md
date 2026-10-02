# Teams · Administración

El módulo Teams está aislado del resto de la administración.

## Entrada

- `TeamsAdmin.jsx`: selector y enrutado interno del módulo.
- `teamsApi.js`: acceso a las RPC de Supabase.
- `TeamsAdmin.css`: índice de estilos; conserva el punto de importación original.

## Componentes principales

- `components/CrearTeams.jsx`: lógica del asistente de alta.
- `components/crear/Paso*.jsx`: cada pantalla del asistente.
- `components/Convocatoria.jsx`: convocatoria y accesos de jugadores.
- `components/Equipos.jsx`: formación, capitanes y cierre de plantillas.
- `components/Reglas.jsx`: revisión de reglas.
- `components/Partidos.jsx`: gestión de partidos.
- `components/partidos/CampoFecha.jsx`: selector reutilizable de fecha/hora.
- `components/Incidencias.jsx`: resolución de incidencias.
- `components/GestionTeams.jsx`: coordinador de la edición.

## Configuración auxiliar

- `components/crear/config.js`: valores iniciales, pasos y textos de formación.
- `components/convocatoria/config.js`: opciones y formato de fechas.
- `components/equipos/config.js`: etiquetas de métodos de formación.
- `components/shared/Info.jsx`: ayuda contextual reutilizable.

## CSS

`TeamsAdmin.css` importa, en el mismo orden que antes del refactor:

1. `css/core.css`
2. `css/partidos.css`
3. `css/responsive.css`
4. `css/extras.css`

El refactor es estructural: no modifica reglas, textos visibles, estilos ni
flujos de la competición.

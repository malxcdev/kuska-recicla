# KUSKA Recicla

Prototipo (MVP) de una red de reciclaje para Santiago, Cusco. Conecta cuatro actores:

| Rol | Qué hace |
|---|---|
| **Comercio** | Programa recojos eligiendo día y franja en un calendario de 14 días; se le asigna un reciclador automáticamente. |
| **Reciclador** | Marca su disponibilidad semanal, sigue su ruta del día, registra recojos y puede liberar uno con "No puedo ir". |
| **Empresa** | Registra la recepción del material, administra lotes y ve reportes. |
| **Municipio** | Supervisa la operación, los indicadores y los actores, y registra feriados o cierres. |

> Es una demo: los datos viven en el navegador (localStorage). La migración a Supabase está prevista; la capa de datos (`src/data/repositories.ts`) ya es asíncrona para facilitarla.

## Probar la demo

En la pantalla de ingreso, elige el tipo de cuenta y entra con **cualquier correo y una contraseña de 6 caracteres o más**. Cada rol usa una cuenta de ejemplo. Desde **Perfil → Reiniciar demo** se restauran los datos de ejemplo.

## Desarrollo

Requisitos: Node.js 22+ y pnpm.

```bash
pnpm install
pnpm dev      # http://localhost:8443
pnpm check    # tipos + lint + tests
pnpm build    # genera dist/
```

## Stack

React 19 · react-router 8 · TypeScript · Vite 8 · Tailwind CSS 4 · Vitest + Testing Library.

## Estructura

- `src/pages/` — pantallas por rol (`comercio`, `reciclador`, `empresa`, `municipio`, `shared`, `auth`).
- `src/components/` — componentes reutilizables (formulario de recojo, detalle de pedido, diálogos).
- `src/state/` — contextos de React: sesión, pedidos, calendario y avisos.
- `src/data/` — repositorios, cálculo de disponibilidad, estadísticas y datos de ejemplo.
- `docs/plans/` — diseño y plan del calendario de disponibilidad.

## Despliegue en Vercel

Importa el repositorio en Vercel; `vercel.json` ya define el build (`pnpm build`, carpeta `dist`) y redirige todas las rutas a `index.html` para que funcionen los enlaces directos.

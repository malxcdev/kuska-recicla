# KUSKA Recicla

Prototipo (MVP) de una red de reciclaje para Santiago, Cusco. Conecta cuatro actores:

| Rol | Qué hace |
|---|---|
| **Comercio** | Programa recojos eligiendo día y franja en un calendario de 14 días; se le asigna un reciclador automáticamente. |
| **Reciclador** | Marca su disponibilidad semanal, sigue su ruta del día, registra recojos y puede liberar uno con "No puedo ir". |
| **Empresa** | Registra la recepción del material, administra lotes y ve reportes. |
| **Municipio** | Supervisa la operación, los indicadores y los actores, y registra feriados o cierres. |

> Sin variables de Supabase la app funciona como demo: los datos viven en el navegador (localStorage) y se entra con cualquier correo. Con Supabase configurado usa Postgres + Auth reales (ver [Supabase](#supabase)).

## Probar la demo

En la pantalla de ingreso, elige el tipo de cuenta y entra con **cualquier correo y una contraseña de 6 caracteres o más**. Cada rol usa una cuenta de ejemplo. Desde **Perfil → Reiniciar demo** se restauran los datos de ejemplo.

## Desarrollo

Requisitos: Node.js 22+ y pnpm.

```bash
pnpm install
pnpm dev            # http://localhost:8443
pnpm check          # tipos + lint + tests
pnpm build          # genera dist/
pnpm supabase:check # comprueba la conexión con Supabase
```

## Supabase

La app elige el backend en `src/data/repositories.ts`:

| Variables de entorno | Backend |
|---|---|
| sin `VITE_SUPABASE_*` | Demo con Web Storage (tests y desarrollo sin conexión) |
| con `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | Supabase (Postgres + Auth) |

1. Crea el proyecto en [supabase.com](https://supabase.com).
2. Aplica el esquema: ejecuta `supabase/migrations/20261112000000_kuska_init.sql` en el **SQL Editor**. Crea las tablas, las políticas RLS, el perfil automático al registrarse y los datos de configuración (lotes y horarios).
3. Copia `.env.example` como `.env.local` y completa las dos variables (Project Settings → API). Usa solo la clave pública *anon/publishable*, nunca la *service_role*.
4. Comprueba la conexión con `pnpm supabase:check`.
5. En **Authentication → URL Configuration**, agrega tu dominio como *Site URL* y en *Redirect URLs* para que funcione el correo de recuperación de contraseña.

```bash
# .env.local (no se versiona)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

La anon key es pública por diseño: viaja en el bundle y la seguridad la dan las políticas RLS. Con Supabase el registro crea un usuario real; si el proyecto tiene activada la confirmación de correo, hay que abrir el enlace del correo antes de entrar.

## Stack

React 19 · react-router 8 · TypeScript · Vite 8 · Tailwind CSS 4 · Vitest + Testing Library · Supabase (opcional).

## Estructura

- `src/pages/` — pantallas por rol (`comercio`, `reciclador`, `empresa`, `municipio`, `shared`, `auth`).
- `src/components/` — componentes reutilizables (formulario de recojo, detalle de pedido, diálogos).
- `src/state/` — contextos de React: sesión, pedidos, calendario y avisos.
- `src/data/` — repositorios (demo y Supabase), cálculo de disponibilidad, estadísticas y datos de ejemplo.
- `supabase/migrations/` — esquema SQL: tablas, políticas RLS y datos de configuración.
- `public/brand/` — logotipo y emblema; `scripts/prepare-logo.py` genera los derivados.
- `docs/plans/` — diseño y plan del calendario de disponibilidad.

## Despliegue en Vercel

Importa el repositorio en Vercel; `vercel.json` ya define el build (`pnpm build`, carpeta `dist`) y redirige todas las rutas a `index.html` para que funcionen los enlaces directos. Agrega las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en **Settings → Environment Variables**.

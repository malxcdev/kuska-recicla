# Calendario de disponibilidad — Diseño

**Fecha:** 2026-11-12
**Estado:** aprobado

## Objetivo

Reemplazar los horarios fijos de recojo (3 franjas y 3 cupos escritos en el código) por un calendario real de días y horas disponibles, construido a partir de lo que define el municipio y de la disponibilidad que publica cada reciclador.

## Decisiones

| Decisión | Elegido | Alternativas descartadas |
|---|---|---|
| Origen de los cupos | **Mixto:** el municipio fija días y franjas por zona; cada reciclador marca en cuáles trabaja | Solo recicladores (sin control de cobertura ni feriados); solo municipio (no refleja quién trabaja) |
| Asignación | **Automática** al reservar: el reciclador disponible con menos carga | Que el reciclador acepte (el comercio espera confirmación) |
| Capacidad | Recicladores disponibles en la franja × recojos por reciclador (configurable por zona, 3 por defecto) | — |
| Horizonte de reserva | 14 días desde mañana (configurable por zona) | — |
| Empresa | Sin cambios en esta etapa | Horario de recepción del centro (otra etapa) |

## Modelo de datos

Pensado para mapear uno a uno a tablas de Supabase.

```ts
interface SlotDefinition { id: string; start: string; end: string }   // "08:00", "10:00"

interface ZoneSchedule {               // lo edita el municipio
  zone: ZoneId;
  weekdays: number[];                  // 0 = domingo … 6 = sábado
  slots: SlotDefinition[];
  stopsPerCollector: number;           // recojos por reciclador y franja
  horizonDays: number;                 // cuántos días adelante se puede reservar
}

interface ServiceClosure {             // lo edita el municipio
  id: string;
  date: string;                        // YYYY-MM-DD
  zone: ZoneId | null;                 // null = todas las zonas
  reason: string;                      // "Feriado: Inmaculada Concepción"
}

interface CollectorAvailability {      // lo edita el reciclador
  collectorId: string;
  zone: ZoneId;
  weekly: Record<number, string[]>;    // weekday → ids de franja
}

interface CollectorTimeOff {           // lo edita el reciclador
  id: string;
  collectorId: string;
  date: string;
  reason?: string;
}
```

`PickupRequest.slot` pasa a guardar el **id de la franja** junto con su etiqueta, para no depender del texto.

## Núcleo de cálculo (funciones puras)

- `getAvailability({ zone, from, days, schedule, closures, availability, timeOff, requests })` devuelve, por cada fecha:
  - `status`: `"open" | "closed"`, con `reason` si está cerrado (feriado, domingo, fuera del horizonte);
  - por cada franja: los recicladores disponibles, `capacity`, `booked` y `remaining`.
- `pickCollector(dayAvailability, slotId, requests)` elige al reciclador disponible con menos recojos en esa franja. Si empatan, al que tenga menos recojos ese día; si siguen empatados, por id. Devuelve `null` si no hay cupo.
- `releaseRequest(request, ...)` reasigna con `pickCollector`, excluyendo al reciclador que libera. Si no hay nadie, el pedido vuelve a `solicitado` con `collectorId: null`.

La carga de cada reciclador se cuenta en todas las zonas (una persona no puede estar en dos lugares a la vez). `booked` son las reservas de la zona; la ocupación que se muestra junto al nivel del día es `capacity - remaining`.

## Experiencia por perfil

### Comercio
- El paso 2 del formulario de recojo muestra los próximos 14 días.
- Cada día lleva un indicador: con cupos, pocos cupos (1 o 2), lleno o sin servicio (con el motivo).
- Las franjas muestran los cupos que quedan; las llenas aparecen deshabilitadas.
- Al confirmar se asigna un reciclador automáticamente: el pedido nace **Asignado** y el aviso dice "Te visitará {reciclador}".

### Reciclador — nueva sección "Disponibilidad"
- Grilla de días × franjas para activar o desactivar; solo muestra lo que el municipio habilitó en su zona.
- Lista de días libres para agregar o quitar.
- Si marca libre un día en que ya tiene recojos, el sistema le avisa y le ofrece liberarlos (se reasignan).
- En el detalle de un pedido asignado aparece la acción **"No puedo ir"**, que libera el pedido.
- El botón "Editar horario" de Inicio lleva a esta sección.

### Municipio — nueva sección "Calendario"
- Configuración por zona: días con servicio, franjas, recojos por reciclador y horizonte.
- Gestión de cierres y feriados, por zona o para todas.
- Mapa de ocupación de 14 días por zona (reservado sobre capacidad), resaltando los días sin recicladores.
- Al quitar una franja o agregar un cierre donde ya hay reservas, se mantienen y se avisa cuántas son.

### Empresa
Sin cambios.

## Capa de datos

- Nuevo `scheduleRepo` en `src/data/repositories.ts`, con las mismas reglas que el resto: async, validación al leer y Web Storage como backend de demostración.
  - Municipio: `getZoneSchedules`, `saveZoneSchedule`, `listClosures`, `addClosure`, `removeClosure`.
  - Reciclador: `getAvailability(collectorId)`, `saveAvailability`, `listTimeOff`, `addTimeOff`, `removeTimeOff`.
- `requestsRepo.create` recibe el reciclador ya elegido y crea el pedido como `asignado`.
- `requestsRepo.release(id, collectorId)` hace la reasignación.
- Un nuevo `ScheduleProvider` expone estos datos a la app.
- Datos de ejemplo:
  - todas las zonas: lun–sáb, con las 3 franjas actuales y 3 recojos por reciclador;
  - Rosa en zona A (lun, mié y vie de 08 a 12, y sáb de 08 a 10), Mario en zona B (mar–sáb de 10 a 16), Kawsay en zona C (lun–sáb, todas las franjas);
  - un feriado de ejemplo el 8 de diciembre.

## Con Supabase (fuera de esta etapa)

- Reservar debe ser una operación atómica: una función `book_pickup(...)` que verifica la capacidad y asigna dentro de una transacción, para que dos comercios no tomen el último cupo a la vez.
- RLS (permisos por fila):
  - `zone_schedules` y `service_closures` las escribe solo el municipio;
  - `collector_availability` y `collector_time_off` las escribe solo su propio reciclador;
  - las lecturas de disponibilidad agregada son públicas para usuarios autenticados.

## Pruebas

- **Unitarias:**
  - `getAvailability`: domingos, feriados por zona y globales, días libres, horizonte, capacidad y cupos llenos;
  - `pickCollector`: menor carga, desempates y sin cupo;
  - liberación: reasignación y vuelta a solicitado.
- **De componentes:**
  - calendario del comercio: días cerrados deshabilitados y la reserva queda asignada;
  - grilla de disponibilidad del reciclador;
  - formulario de cierres del municipio.

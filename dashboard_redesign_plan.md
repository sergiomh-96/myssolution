# Re-diseño del Dashboard - Plan de Implementación

Este plan detalla los cambios necesarios para transformar el Dashboard principal según los requisitos del usuario.

## 1. Traducción y Estructura Principal (`app/dashboard/page.tsx`)
- [ ] Cambiar "Dashboard" por "Panel de Control".
- [ ] Cambiar "Resumen de las métricas de su negocio" por "Resumen de métricas de negocio".
- [ ] Implementar la lógica de obtención de datos para los nuevos indicadores:
    - [ ] **KPI A**: Total de clientes asignados al usuario.
    - [ ] **KPI B**: Total de ofertas del usuario o globales (según rol).
    - [ ] **KPI C**: Ofertas del mes actual vs mes anterior (+ porcentaje).
    - [ ] **KPI D**: Suma total de ofertas por estado en el año en curso.
- [ ] Ampliar el límite de "Ofertas recientes" a 10.
- [ ] Preparar los datos para el gráfico de "Total € por cliente" (Top 10).
- [ ] Preparar los datos para las "Notificaciones recientes" (Top 10).

## 2. Componentes de Indicadores (`components/dashboard/kpi-grid.tsx`)
- [ ] Traducir etiquetas a Español.
- [ ] Actualizar para mostrar el porcentaje de cambio en Ofertas del último mes.
- [ ] Añadir sub-sección de desglose por estado para el KPI de Total Ofertas €.

## 3. Gráfico de Clientes por Valor (`components/dashboard/customer-value-chart.tsx`) [NUEVO]
- [ ] Implementar un selector de estado (Borrador, Enviada, Aceptada, Rechazada).
- [ ] Mostrar un gráfico de barras horizontales con los 10 clientes con mayor importe sumado.
- [ ] Lógica para actualizar el gráfico al cambiar el filtro.

## 4. Tarjeta de Notificaciones (`components/dashboard/notifications-card.tsx`) [NUEVO]
- [ ] Mostrar listado de las últimas 10 notificaciones.
- [ ] Filtro de visualización: Todas / Leídas / No leídas.
- [ ] Traducción completa a Español.

## 5. Pulido y Ajustes Finales
- [ ] Asegurar que el diseño sea consistente y estéticamente premium.
- [ ] Verificar que todos los roles visualicen la información que les corresponde.

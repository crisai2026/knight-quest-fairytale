# Controles táctiles para jugar en el teléfono

Ahora mismo el juego solo escucha el teclado, así que en el móvil se ve pero no se puede mover al caballero. La solución es añadir botones táctiles en pantalla y ajustar el tamaño del juego al teléfono.

## Qué se añade

- **Botones en pantalla** superpuestos sobre el canvas, solo visibles en pantallas táctiles:
  - Izquierda: flechas ← y → para caminar.
  - Derecha: A = saltar (y nadar hacia arriba), F = atacar, E = interactuar, R = cambiar arma.
  - Botón extra: correr (Shift) y bajar/bucear (S) en el nivel del océano.
- **Toque en el canvas** para empezar el juego y para avanzar diálogos/cutscenes (ya existe el click, se amplía a touch).
- Los botones se mantienen pulsados mientras el dedo está encima (moverse continuo), no un solo toque.

## Ajuste de pantalla

- El canvas se escala al ancho del teléfono y se recomienda jugar en horizontal; si el teléfono está vertical se muestra un aviso discreto "Gira el teléfono para jugar mejor".
- Los botones no tapan el HUD (vidas, hambre, monedas): se colocan en las esquinas inferiores con transparencia.
- Se evita el zoom/scroll accidental al tocar los controles.

## Notas técnicas

- `GameCanvas.tsx`: añadir una capa de controles táctiles que llama a `handleKeyDown`/`handleKeyUp` con las mismas teclas (`a`, `d`, `" "`, `f`, `e`, `r`, `shift`, `s`), usando `onPointerDown`/`onPointerUp`/`onPointerCancel` y `touch-action: none`.
- Detección táctil con `useIsMobile` + `matchMedia('(pointer: coarse)')`; en escritorio los botones no se renderizan.
- Escalado: usar también la altura de la ventana (`min(ancho/CANVAS_WIDTH, alto/CANVAS_HEIGHT)`) para que quepa entero en horizontal.
- Sin cambios en la lógica del motor del juego; todo es capa de presentación.

Juego a pantalla completa en el teléfono

Hoy en móvil el juego se encoge a un rectángulo pequeño porque deja hueco para los botones debajo y para el texto de la página. La idea: en teléfono, el juego ocupa toda la pantalla y los botones flotan encima, en las esquinas, semitransparentes.

## Qué cambia en móvil

- El juego llena el 100% de la pantalla (sin márgenes, sin bordes, sin scroll de página).
- Se prioriza el modo horizontal: el lienzo se escala para llenar la pantalla; si sobra un poco por la proporción, se recorta ligeramente arriba/abajo en vez de dejar barras negras grandes.
- Los botones táctiles vuelven a estar encima del juego, pero:
  - pegados a las esquinas inferiores (izquierda: ← → Run; derecha: Jump, F, E, R, ↓),
  - semitransparentes, para molestar lo mínimo,
  - en una zona baja donde no está la acción ni el HUD.
- El botón de música pasa a ser un icono pequeño en la esquina superior derecha, para no tapar el HUD.
- El texto de instrucciones se oculta en móvil (sigue visible en escritorio).
- Aviso de "gira el teléfono" como capa encima, solo si está en vertical. En ingles.

## En escritorio

Sin cambios visibles: mismo lienzo centrado, borde, texto de instrucciones debajo.

## Detalle técnico

- `src/components/GameCanvas.tsx`: layout condicional por `isTouch`. En táctil, contenedor `fixed inset-0` con `overflow-hidden` y `overscroll-none`; escala = `max(vw/CANVAS_WIDTH, vh/CANVAS_HEIGHT)` con centrado (cover con recorte controlado), en vez del `min` actual menos 100px.
- Controles táctiles pasan a `absolute` dentro del contenedor, con `bottom`/`left`/`right` y `pb-[env(safe-area-inset-bottom)]`, opacidad ~55% y `touch-action: none` (ya existe).
- Se evita el scroll del documento en móvil mientras el juego está montado.
- Sin cambios en `src/lib/game/*`: solo presentación.
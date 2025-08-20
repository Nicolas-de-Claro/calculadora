# Calculadora de Precios de Servicios

Este proyecto es una calculadora interactiva para cotizar servicios de telecomunicaciones (Internet, TV y Telefonía) de forma rápida y sencilla.

## Roadmap de Mejoras

Aquí se detallan los pasos planificados para mejorar y escalar la aplicación.

### Fase 1: Refactorización de Precios (Prioridad Alta)

-   [ ] **Externalizar precios a `prices.json`**: Mover todas las constantes de precios desde `script.js` a un archivo `prices.json` dedicado.
-   [ ] **Carga asíncrona de precios**: Modificar `script.js` para que lea el archivo `prices.json` al cargar la página. Esto desacopla los datos de la lógica de la aplicación, permitiendo actualizaciones de precios sin tocar el código.

### Fase 2: Mejoras de Experiencia de Usuario (UX)

-   [ ] **Implementar desglose de precios**: Mostrar al usuario un resumen detallado de los costos que componen el precio total.
-   [ ] **Añadir botón "Copiar Resumen"**: Crear una funcionalidad para copiar el desglose y el total al portapapeles, facilitando compartir la cotización.

### Fase 3: Mejoras de Código y Mantenibilidad

-   [ ] **Refactorizar `addPortabilitySection`**: Reemplazar el método `cloneNode` por `template literals` de JavaScript para generar dinámicamente las nuevas secciones de línea. Esto mejora la legibilidad y robustez del código.
-   [ ] **Modularizar el cálculo**: Dividir la función `calculateTotalPrice` en funciones más pequeñas y específicas (ej. `calculateInternetPrice()`, `calculateTvPrice()`, etc.) para mejorar la claridad.

### Fase 4: Documentación

-   [x] **Crear `README.md` inicial**: Añadir este archivo con la descripción del proyecto y el roadmap.
-   [ ] **Comentar código**: Añadir comentarios en `script.js` para explicar las partes más complejas de la lógica.

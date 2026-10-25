# Atomic Design compartido

Todo componente visual reutilizable vive aquí; las páginas y contenedores de negocio pertenecen a `modules/*/presentation`.

- `atoms`: controles/directivas visuales pequeños (button, input, badge, card).
- `molecules`: combinaciones pequeñas (form-field, legal-footer).
- `organisms`: bloques de interacción con inputs/outputs tipados (sidebar, chart, resultados, conexiones).
- `templates`: distribución visual transversal (workspace-shell).

Crear `pages`/`patterns` solo con una necesidad transversal concreta. No crear carpetas vacías. No importar modelos de módulos, gateways, HttpClient ni servicios de negocio desde UI. Los organismos reciben modelos presentacionales y emiten eventos; el contenedor del módulo obtiene/persiste datos. HTML y SCSS externos; tokens globales en config/themes.ts. Mantener navegación accesible, etiquetas y botones nativos.

Validar `python3 scripts/check_architecture.py` desde la raíz y `npm run test:coverage`/`npm run build` desde frontend.

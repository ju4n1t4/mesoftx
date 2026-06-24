# Dependencias Del Frontend MesoftX

Instalar solamente los paquetes necesarios de Angular para ejecucion y compilacion:

```bash
npm install
```

Ejecucion:

```text
@angular/common
@angular/compiler
@angular/core
@angular/forms
@angular/platform-browser
@angular/router
rxjs
tslib
zone.js
```

Compilacion y desarrollo:

```text
@angular/build
@angular/cli
@angular/compiler-cli
typescript
```

No se requiere Angular Material, Bootstrap ni otra libreria externa de componentes visuales.

El login con Google usa el script oficial de Google Identity Services cargado en runtime desde `https://accounts.google.com/gsi/client`; no requiere paquete npm adicional.

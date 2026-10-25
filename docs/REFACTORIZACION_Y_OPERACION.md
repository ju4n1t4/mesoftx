# Refactorización y operación de MesoftX

Fecha: 2026-10-25. Requisitos aprobados: Atomic Design bajo shared/ui, capas independientes, APIs externas solo desde backend, conservación de esquema/datos y cobertura de funciones >=90% por frontend y cada MS.

## Arquitectura y contratos

La línea base vigente está en `.ai/documents_Agents/Current_Architecture_Baseline.md`. Los contratos exportados están en `docs/contracts/*.openapi.json`. Las rutas funcionales existentes se conservan; User_MS añade `/api/v1/integrations`. El login usa correo/contraseña y JWT/RBAC; sesión Angular en sessionStorage. Los componentes reutilizables viven exclusivamente en `frontend/src/app/shared/ui`, con recursos HTML/SCSS externos y átomos, moléculas, organismos y templates. Las páginas y contenedores de negocio pertenecen a módulos.

## Bases nuevas y existentes

Los despliegues habituales siguen separados: deployment/db, deployment/backend y deployment/frontend. Validar cada Compose antes de arrancar. DB crea la red mesoftx-network, consumida por los otros stacks. El Compose unificado productivo existente sigue siendo opcional.

Los cuatro scripts base permanecen intactos. La imagen DB añade al entrypoint, en orden:

1. `20261024_00_compatibility.sql`: period.active y ajuste compatible de identificadores/código de performance; traslada cambios que antes hacía el arranque de los MS.
2. `20261024_01_integrations.sql`: conexiones, ejecuciones, registros JSON e INTEGRATION_MANAGE para Administrativo.

El entrypoint solo se ejecuta al inicializar un volumen vacío. Para una base existente, primero respaldar ambas bases, comprobar una restauración en un ambiente separado y aplicar explícitamente las migraciones con psql. No ejecutar de nuevo los scripts base ni eliminar volúmenes. Los scripts usan meta-comandos `\connect` y requieren psql.

Ejemplo desde la raíz con el stack DB existente y el usuario PostgreSQL configurado (sustituir POSTGRES_USER según el despliegue):

```bash
umask 077
mkdir -p /ruta/segura/respaldo
# La redirección guarda archivos en el host; no guardar respaldos en Git.
docker compose -f deployment/db/docker-compose.yml exec -T mesoftx-db \
  pg_dump -U POSTGRES_USER -Fc users_db > /ruta/segura/respaldo/users.dump
docker compose -f deployment/db/docker-compose.yml exec -T mesoftx-db \
  pg_dump -U POSTGRES_USER -Fc assesment_mesoftx_db > /ruta/segura/respaldo/assessment.dump
for migration in deployment/db/migrations/*.sql; do
  docker compose -f deployment/db/docker-compose.yml exec -T mesoftx-db \
    psql -U POSTGRES_USER -v ON_ERROR_STOP=1 -d postgres < "$migration"
done
```

Detener escrituras durante la actualización y conservar las imágenes anteriores. Cada migración es transaccional por base e idempotente; si una base falla, corregir la causa y repetir en orden. Conservar copia del volumen y de las claves externas. Los respaldos contienen datos y credenciales cifradas: cifrar/restringir también el respaldo. Las claves Fernet se respaldan por separado.

Para comprobar recuperación, crear bases nuevas en PostgreSQL aislado y restaurar cada dump con `pg_restore --exit-on-error -U POSTGRES_USER -d BASE_RESTAURADA`, sin `--clean`, comparando conteos y registros. Nunca restaurar encima de la base operativa para una prueba. El smoke automatizado realiza dump/restore de users_db y compara cuentas, conexiones, ejecuciones y JSON; el verificador de migraciones conserva fixtures de ambas bases.

La reversión ordinaria consiste en volver a las imágenes anteriores y dejar las estructuras aditivas. No existe una migración destructiva de bajada. Recuperar un respaldo operativo exige una ventana coordinada, un destino nuevo validado y cambio de conexiones; no eliminar tablas/columnas para revertir código. Las migraciones compatibles pueden añadir/backfill de campos, pero no eliminan ni renombran objetos ni filas previas.

## Configuración y secretos

Completar las plantillas `.env.example` fuera de Git. El backend independiente exige USER_MS_DATABASE_URL, ASSESMENT_MS_DATABASE_URL, USER_MS_JWT_SECRET_KEY y SERVICE_TOKEN; PostgreSQL exige POSTGRES_PASSWORD. Producción rechaza valores de ejemplo y secretos de menos de 32 caracteres. CORS local: http://localhost:4200. Producción usa mismo origen mediante Nginx, terminación HTTPS externa y puertos internos según el stack elegido.

Para integraciones:

- INTEGRATIONS_ENCRYPTION_KEY: clave Fernet suministrada desde el entorno/gestor de secretos, separada de PostgreSQL. Se puede generar con `python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'` en un entorno privado. No compartir su salida ni guardarla en Git.
- EXTERNAL_API_ALLOWED_HOSTS: hosts exactos separados por coma, sin esquema/puerto/ruta. Vacío impide configurar conexiones. Restringir salida de red del backend al proveedor autorizado.
- INTEGRATIONS_PREVIOUS_KEYS: claves anteriores separadas por coma, solo durante rotación. Se cifra siempre con la actual; las anteriores permiten lectura temporal.

Rotación: respaldar DB y claves por separado; configurar nueva clave actual y anterior en PREVIOUS_KEYS, reiniciar User_MS y ejecutar `python -m app.tools.rotate_integration_secrets` dentro del contenedor. El comando recifra todas las credenciales en una transacción y solo imprime el conteo. Verificar lectura/sincronización; retirar la clave anterior del entorno y reiniciar. Conservarla protegida mientras existan respaldos antiguos que la requieran.

## Integraciones externas

Administrativo con INTEGRATION_MANAGE administra `/admin/integraciones`. La API no devuelve secretos; un reemplazo es de escritura. Una credencial vacía elimina la credencial solo cuando el contrato de autenticación lo permite; en la pantalla dejar vacío conserva la existente. Al cambiar autenticación a none se elimina el secreto cifrado de esa conexión.

El adaptador genérico realiza GET de JSON sobre HTTPS en un origen autorizado y un recurso separado; no admite queries, fragmentos, redirects ni direcciones privadas. TLS verificado; timeout de 15 segundos por operación de transporte, un reintento de conexión y respuesta máxima de 2 MB. Configurar records_path como ruta de propiedades separadas por punto (vacía para array raíz) y external_id_field como campo de identificación estable. Tipos de auth: none, bearer, api_key (X-API-Key). Límite: 10000 registros por lote, id string/int de máximo 255 caracteres; ids duplicados invalidan todo el lote.

POST `/{id}/probe` verifica conectividad sin persistir respuesta. POST `/{id}/sync` exige Idempotency-Key: repetirla devuelve la misma ejecución sin llamar al proveedor; una nueva clave inicia otro intento. Una ejecución concurrente devuelve 409. Un intento abandonado de más de diez minutos se marca failed/interrupted cuando llega el siguiente inicio; los timeouts normales son menores. Los registros y el estado de éxito se guardan en una transacción; un fallo conserva datos anteriores y registra solo código saneado. Un registro ausente de un lote posterior se conserva. No hay borrado/purga automática ni scheduler: sincronización manual autorizada. Consulta paginada de registros (hasta 500), últimas 100 ejecuciones; observar estados failed/error_code y fechas para operación.

No se han especificado proveedores reales, periodicidad ni retención. No existe adaptador concreto de un proveedor no definido. La plataforma está validada con proveedor simulado; el contrato y la autorización de cada proveedor deberán definirse antes de conexión real. La persistencia de lo sincronizado queda en PostgreSQL y sobrevive reinicios.

## Cuentas generales por perfil

Se implementan como cuentas demo independientes de usuarios nominales. Crear primero un programa real existente y ejecutar:

```bash
# Dentro de User_MS; sustituir ID_EXISTENTE por el programa validado.
python -m app.tools.seed_demo --program-id ID_EXISTENTE
```

Es idempotente y crea Administrativo, Coordinador, Profesor y Auditor sin modificar permisos de perfiles existentes. El profesor queda ligado al programa indicado; conflictos de identidad/estado/programa se rechazan. Cada correo sigue `demo.PERFIL@demo.mesoftx.local`, minúsculas sin tildes. La contraseña es aleatoria y desconocida; no se publica ni se usa para login normal. DEMO_MODE=false por defecto. Activarlo solo en demostración con datos de ejemplo; producción además exige DEMO_ALLOW_IN_PRODUCTION=true. Desactivarlo y reiniciar cierra nuevos accesos demo; si requiere revocación inmediata de sesiones ya emitidas, rotar la clave JWT coordinadamente. Los tokens existentes siguen su vencimiento normal.

El sembrador se probó dos veces sobre DB temporal y los cuatro perfiles pudieron autenticarse. No se han creado usuarios ni activado demo en un despliegue operativo.

## Verificación reproducible

Frontend con Node 22. Se usa directamente @angular/build:application (Angular 20) y Vitest 4.1.12; el override del peer opcional de @angular/build mantiene un único ejecutor. Las pruebas se invocan por Vitest directamente, no por el builder experimental de tests de Angular. Se retiró la cadena Webpack sin uso para evitar sus dependencias vulnerables. No cambiar al builder experimental sin revisar primero su compatibilidad con Vitest.

Comandos:

```bash
cd frontend
npm ci
npm run test:coverage
npm run build
```

Backend con Python 3.12 y PostgreSQL 16 aislado, inicializado con los cuatro SQL y las dos migraciones:

```bash
pip install -r backend/requirements-dev.txt
export USERS_TEST_DATABASE_URL='postgresql+psycopg2://USUARIO:CLAVE@HOST/users_db'
export ASSESSMENT_TEST_DATABASE_URL='postgresql+psycopg2://USUARIO:CLAVE@HOST/assesment_mesoftx_db'
bash scripts/test_backend.sh
python -m compileall -q backend/User_MS/app backend/Assesment_MS/app
```

Nunca apuntar tests a bases operativas. `scripts/verify_migrations.py` crea sus propias bases de ensayo en el servidor indicado y elimina solo esas bases. `scripts/check_architecture.py` comprueba dependencias prohibidas, ubicación de UI, recursos externos y ausencia de DROP/RENAME en migraciones.

Las pruebas backend se ejecutan en procesos separados porque ambos paquetes se llaman app. Funciones backend: inventario AST de todas las funciones nombradas ejecutables (incluidas anidadas), con entrada al primer statement ejecutable medida por coverage.py. Declaraciones vacías/Protocol no son funciones ejecutables; lambdas no se cuentan como funciones nombradas. Frontend: Istanbul sobre todo src/app, excluye solo specs; incluye funciones no importadas. El umbral de funciones no significa 90% de ramas ni cobertura exhaustiva de escenarios. CI exige el umbral por cada servicio y frontend, además de conservar chequeos de seguridad/dependencias existentes.

Para el smoke completo, construir imágenes con tags mesoftx-refactor-{db,user,assessment,frontend}:20261025 usando los Dockerfile correspondientes y ejecutar `python3 scripts/smoke_deployment.py`. Crea red/contenedores únicos sin puertos publicados, usa solo datos sintéticos y elimina exclusivamente esos recursos al terminar. Verifica arranque, cuatro cuentas, idempotencia, reinicio, dump/restore y proxies Nginx. No despliega cambios en ambientes existentes.

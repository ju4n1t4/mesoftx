# Endpoints Assesment_MS

Base local: `http://localhost:8002`

Prefijo API: `/api/v1`

Autenticacion:

- Version actual: no requiere token Bearer.
- Recomendacion de auditoria: proteger endpoints de negocio con JWT.

Arquitectura:

- `domain`: modelos/entidades y logica de dominio; no define puertos de salida.
- `application/ports`: contratos de repositorio.
- `application/services`: casos de uso y referencia de modelos.
- `infrastructure`: implementaciones SQLAlchemy/PostgreSQL y almacenamiento de documentos.
- `interfaces/api`: presentacion HTTP e inyeccion de dependencias.

Documentos:

- `DOCUMENT_BASE_URL`: carpeta base de documentos.
- `DOCUMENT_SUPPORT_ASSESMENT`: carpeta donde se almacenan los documentos anexados a evidencias.
- Si `DOCUMENT_SUPPORT_ASSESMENT` no se configura, el servicio usa `{DOCUMENT_BASE_URL}/ASSESMENT`.

## Health

### GET `/health`

Parametros: ninguno.

Respuesta `200`:

```json
{
  "status": "ok",
  "service": "Assesment_MS"
}
```

## Student Outcomes

### GET `/api/v1/student-outcomes`

Parametros: ninguno.

Respuesta `200`: lista de student outcomes.

```json
[
  {
    "id": 1,
    "code": "SO1",
    "description": "Descripcion del outcome"
  }
]
```

### POST `/api/v1/student-outcomes`

Body:

```json
{
  "code": "SO1",
  "description": "Descripcion del outcome"
}
```

Respuesta `201`: student outcome creado.

### PUT `/api/v1/student-outcomes/{entity_id}`

Path params:

- `entity_id`: id numerico del student outcome.

Body parcial:

```json
{
  "code": "SO1",
  "description": "Descripcion actualizada"
}
```

Respuesta `200`: student outcome actualizado.

### DELETE `/api/v1/student-outcomes/{entity_id}`

Path params:

- `entity_id`: id numerico del student outcome.

Respuesta `204`: sin contenido.

## Performance Indicators

### GET `/api/v1/performance-indicators`

Respuesta `200`: lista de indicadores.

### POST `/api/v1/performance-indicators`

Body:

```json
{
  "code": "ID1",
  "name": "Nombre del indicador"
}
```

Respuesta `201`: indicador creado.

### PUT `/api/v1/performance-indicators/{entity_id}`

Path params:

- `entity_id`: id numerico del indicador.

Body parcial:

```json
{
  "code": "ID1",
  "name": "Nombre actualizado"
}
```

Respuesta `200`: indicador actualizado.

### DELETE `/api/v1/performance-indicators/{entity_id}`

Elimina el indicador y sus detalles de parametrizacion asociados.

Respuesta `204`: sin contenido.

## Performance Indicator Details

### GET `/api/v1/performance-indicator-details`

Respuesta `200`: lista de detalles de indicadores.

### POST `/api/v1/performance-indicator-details`

Body:

```json
{
  "performance_indicator_id": 1,
  "student_outcome_id": 1,
  "description": "Descripcion del detalle"
}
```

Respuesta `201`: detalle creado.

### PUT `/api/v1/performance-indicator-details/{entity_id}`

Path params:

- `entity_id`: id numerico del detalle.

Body parcial:

```json
{
  "performance_indicator_id": 1,
  "student_outcome_id": 1,
  "description": "Descripcion actualizada"
}
```

Respuesta `200`: detalle actualizado.

### DELETE `/api/v1/performance-indicator-details/{entity_id}`

Respuesta `204`: sin contenido.

## Performance Evaluations

### GET `/api/v1/performance-evaluations`

Respuesta `200`: lista de evaluaciones.

### POST `/api/v1/performance-evaluations`

Body:

```json
{
  "evaluation_value": "Bueno"
}
```

Respuesta `201`: evaluacion creada.

### PUT `/api/v1/performance-evaluations/{entity_id}`

Path params:

- `entity_id`: id numerico de la evaluacion.

Body parcial:

```json
{
  "evaluation_value": "Supera las Expectativas"
}
```

Respuesta `200`: evaluacion actualizada.

### DELETE `/api/v1/performance-evaluations/{entity_id}`

Respuesta `204`: sin contenido.

## Performance Evaluation Details

### GET `/api/v1/performance-evaluation-details`

Respuesta `200`: lista de detalles de evaluacion.

### POST `/api/v1/performance-evaluation-details`

Body:

```json
{
  "performance_evaluation_id": 1,
  "performance_indicator_id": 1,
  "student_outcome_id": 1,
  "description": "Descripcion del detalle de evaluacion"
}
```

Respuesta `201`: detalle de evaluacion creado.

### PUT `/api/v1/performance-evaluation-details/{entity_id}`

Path params:

- `entity_id`: id numerico del detalle.

Body parcial:

```json
{
  "description": "Descripcion actualizada"
}
```

Respuesta `200`: detalle actualizado.

### DELETE `/api/v1/performance-evaluation-details/{entity_id}`

Respuesta `204`: sin contenido.

## Assesment Evidence

### GET `/api/v1/assesment-evidence`

Respuesta `200`: lista de evidencias.

```json
[
  {
    "id": 1,
    "evidence_name_doc": "evidence_9f5d.pdf",
    "student_code": "STU001",
    "student_outcome_id": 1,
    "created_at": "2026-09-08T10:00:00"
  }
]
```

### POST `/api/v1/assesment-evidence`

Crea evidencia sin cargar archivo fisico. Mantiene compatibilidad con clientes que ya envian JSON.

Body:

```json
{
  "evidence_name_doc": "evidence.pdf",
  "student_code": "STU001",
  "student_outcome_id": 1
}
```

Respuesta `201`: evidencia creada.

### POST `/api/v1/assesment-evidence/upload`

Crea evidencia y almacena el documento anexado en `DOCUMENT_SUPPORT_ASSESMENT`.

Content-Type: `multipart/form-data`

Form params:

- `file`: archivo de evidencia.
- `student_code`: codigo del estudiante, maximo 25 caracteres.
- `student_outcome_id`: id numerico del student outcome.

Ejemplo cURL:

```bash
curl -X POST "http://localhost:8002/api/v1/assesment-evidence/upload" \
  -F "file=@C:/Users/luis-/Downloads/evidence.pdf" \
  -F "student_code=STU001" \
  -F "student_outcome_id=1"
```

Respuesta `201`:

```json
{
  "id": 1,
  "evidence_name_doc": "evidence_9f5d7a0c1b2e4c3d8a9b.pdf",
  "student_code": "STU001",
  "student_outcome_id": 1,
  "created_at": "2026-09-08T10:00:00"
}
```

### POST `/api/v1/assesment-evidence/with-results`

Crea evidencia y resultados en una sola transaccion. Esta ruta no carga archivo fisico; recibe el nombre del documento por JSON.

Body:

```json
{
  "evidence_name_doc": "evidence.pdf",
  "student_code": "STU001",
  "student_outcome_id": 1,
  "results": [
    {
      "subject_code": "ASW001",
      "student_outcome_id": 1,
      "performance_evaluation_detail_id": 1
    }
  ]
}
```

Respuesta `201`:

```json
{
  "evidence": {
    "id": 1,
    "evidence_name_doc": "evidence.pdf",
    "student_code": "STU001",
    "student_outcome_id": 1,
    "created_at": "2026-09-08T10:00:00"
  },
  "results": [
    {
      "id": 1,
      "subject_code": "ASW001",
      "assesment_evidence_id": 1,
      "student_outcome_id": 1,
      "performance_evaluation_detail_id": 1,
      "created_at": "2026-09-08T10:00:00"
    }
  ]
}
```

### PUT `/api/v1/assesment-evidence/{entity_id}`

Path params:

- `entity_id`: id numerico de la evidencia.

Body parcial:

```json
{
  "evidence_name_doc": "updated-evidence.pdf",
  "student_code": "STU001",
  "student_outcome_id": 1
}
```

Respuesta `200`: evidencia actualizada.

## Assesment Results

### GET `/api/v1/assesment-results`

Respuesta `200`: lista de resultados.

### POST `/api/v1/assesment-results`

Body:

```json
{
  "subject_code": "ASW001",
  "assesment_evidence_id": 1,
  "student_outcome_id": 1,
  "performance_evaluation_detail_id": 1
}
```

Respuesta `201`: resultado creado.

### PUT `/api/v1/assesment-results/{entity_id}`

Path params:

- `entity_id`: id numerico del resultado.

Body parcial:

```json
{
  "performance_evaluation_detail_id": 2
}
```

Respuesta `200`: resultado actualizado.

Errores comunes:

- `400`: documento invalido, error al almacenar documento, referencia invalida o valor duplicado.
- `404`: registro no encontrado.
- `422`: error de validacion del body, form params o path params.

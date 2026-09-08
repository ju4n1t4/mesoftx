# Endpoints User_MS

Base local: `http://localhost:8001`

Prefijo API: `/api/v1`

Autenticacion:

- Publicos: `GET /health`, `POST /api/v1/auth/login`, `POST /api/v1/auth/google`.
- Protegidos: todos los demas endpoints requieren `Authorization: Bearer <access_token>`.

Arquitectura:

- `domain`: modelos/entidades y logica de dominio; no define puertos de salida.
- `application/ports`: contratos de repositorio y seguridad.
- `application/services`: casos de uso.
- `infrastructure`: implementaciones SQLAlchemy, bcrypt, JWT y Google Identity.
- `interfaces/api`: presentacion HTTP e inyeccion de dependencias.

## Health

### GET `/health`

Parametros: ninguno.

Respuesta `200`:

```json
{
  "status": "ok",
  "service": "User_MS"
}
```

## Auth

### POST `/api/v1/auth/login`

Body:

```json
{
  "email": "admin@example.com",
  "password": "admin"
}
```

Respuesta `200`:

```json
{
  "access_token": "jwt-token",
  "token_type": "bearer"
}
```

Errores: `401` credenciales invalidas, `403` usuario inactivo.

### POST `/api/v1/auth/google`

Body:

```json
{
  "id_token": "google-id-token"
}
```

Respuesta `200`:

```json
{
  "access_token": "jwt-token",
  "token_type": "bearer"
}
```

Errores: `401` token Google invalido o correo no registrado, `403` usuario inactivo.

## Users

### GET `/api/v1/users`

Parametros: ninguno.

Respuesta `200`: lista de usuarios.

```json
[
  {
    "id": 1,
    "name": "Admin",
    "surname": "MesoftX",
    "code": "ADM001",
    "email": "admin@example.com",
    "active": true,
    "role_id": 1,
    "career_id": 1,
    "subject_ids": [1],
    "created_at": "2026-09-08T10:00:00"
  }
]
```

### GET `/api/v1/users/{user_id}`

Path params:

- `user_id`: id numerico del usuario.

Respuesta `200`: usuario.

Errores: `404` usuario no encontrado.

### POST `/api/v1/users`

Body:

```json
{
  "name": "Juan",
  "surname": "Perez",
  "code": "USR001",
  "email": "juan.perez@example.com",
  "password": "StrongPass123",
  "role_id": 1,
  "career_id": 1,
  "subject_ids": [1, 2]
}
```

Respuesta `201`: usuario creado sin exponer password.

Errores: `400` datos referenciados invalidos o valor duplicado.

### PUT `/api/v1/users/{user_id}`

Path params:

- `user_id`: id numerico del usuario.

Body parcial:

```json
{
  "name": "Juan Carlos",
  "password": "NewStrongPass123",
  "role_id": 2,
  "career_id": 1,
  "subject_ids": [2, 3]
}
```

Respuesta `200`: usuario actualizado.

Errores: `400` referencia invalida o duplicado, `404` usuario no encontrado.

### PATCH `/api/v1/users/{user_id}/activate`

Path params:

- `user_id`: id numerico del usuario.

Body: `{}`.

Respuesta `200`: usuario activo.

### PATCH `/api/v1/users/{user_id}/deactivate`

Path params:

- `user_id`: id numerico del usuario.

Body: `{}`.

Respuesta `200`: usuario inactivo.

## Catalogos

### Roles

- `GET /api/v1/roles`: retorna lista de roles.
- `POST /api/v1/roles`: crea rol con `name` y `description`.
- `PUT /api/v1/roles/{entity_id}`: actualiza rol.

Body create:

```json
{
  "name": "Docente",
  "description": "Rol docente"
}
```

Respuesta: objeto rol con `id`, `name`, `description`.

### Years

- `GET /api/v1/years`: retorna lista de anos.
- `POST /api/v1/years`: crea ano con `year`.
- `PUT /api/v1/years/{entity_id}`: actualiza ano.

Body create:

```json
{
  "year": 2026
}
```

Respuesta: objeto ano con `id`, `year`.

### Periods

- `GET /api/v1/periods`: retorna lista de periodos.
- `POST /api/v1/periods`: crea periodo con `period`.
- `PUT /api/v1/periods/{entity_id}`: actualiza periodo.

Body create:

```json
{
  "period": "10"
}
```

Respuesta: objeto periodo con `id`, `period`.

### Academic Periods

- `GET /api/v1/academic-periods`: retorna lista de periodos academicos.
- `POST /api/v1/academic-periods`: crea periodo academico.
- `PUT /api/v1/academic-periods/{entity_id}`: actualiza periodo academico.

Body create:

```json
{
  "name": "1er SEM PREGRAD Y PREUN",
  "code": "202610",
  "period_id": 1,
  "year_id": 1
}
```

Respuesta: objeto con `id`, `name`, `code`, `period_id`, `year_id`.

### Faculty

- `GET /api/v1/faculty`: retorna lista de facultades.
- `POST /api/v1/faculty`: crea facultad.
- `PUT /api/v1/faculty/{entity_id}`: actualiza facultad.

Body create:

```json
{
  "name": "Ingenieria",
  "code": "ING",
  "description": "Descripcion de facultad"
}
```

Respuesta: objeto facultad con `id`, `name`, `code`, `description`.

### Careers

- `GET /api/v1/careers`: retorna lista de carreras.
- `POST /api/v1/careers`: crea carrera.
- `PUT /api/v1/careers/{entity_id}`: actualiza carrera.
- `DELETE /api/v1/careers/{entity_id}`: elimina carrera.

Body create:

```json
{
  "name": "Ingenieria de Sistemas",
  "code": "IS",
  "faculty_id": 1,
  "description": "Descripcion de carrera",
  "accreditation": "Acreditado ABET vigente 2024-2030",
  "progress": 88,
  "status": "acreditado"
}
```

Respuesta: objeto carrera con `id`, `name`, `code`, `faculty_id`, `description`, `accreditation`, `progress` y `status`.

### Subjects

- `GET /api/v1/subjects`: retorna lista de materias.
- `POST /api/v1/subjects`: crea materia.
- `PUT /api/v1/subjects/{entity_id}`: actualiza materia.

Body create:

```json
{
  "name": "Arquitectura de Software",
  "code": "ASW001",
  "career_id": 1,
  "description": "Descripcion de materia"
}
```

Respuesta: objeto materia con `id`, `name`, `code`, `career_id`, `description`.

Errores comunes de endpoints protegidos:

- `401`: token ausente, invalido, expirado, usuario inexistente o inactivo.
- `400`: datos invalidos o referencias inexistentes.
- `422`: error de validacion del body o parametros.

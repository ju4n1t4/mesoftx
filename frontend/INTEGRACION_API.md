# Fase 2 — Integración del frontend con la API real

Plan para conectar el frontend Angular de MESOFTX con los microservicios reales
(`User_MS` en :8001 y `Assesment_MS` en :8002), sustituyendo los datos mock por
llamadas HTTP. Las vistas se mostrarán vacías hasta que el coordinador parametrice
los catálogos y se registren valoraciones.

## Endpoints reales confirmados

### User_MS (`:8001/api/v1`) — requieren JWT salvo login
| Recurso            | Método | Ruta                        |
|--------------------|--------|-----------------------------|
| Login              | POST   | `/auth/login`               |
| Usuarios           | GET    | `/users`                    |
| Usuario            | GET    | `/users/{id}`               |
| Crear usuario      | POST   | `/users`                    |
| Activar/Desactivar | PATCH  | `/users/{id}/activate` · `/deactivate` |
| Roles              | GET    | `/roles`                    |
| Años               | GET    | `/years`                    |
| Periodos           | GET    | `/periods`                  |
| Periodos académicos| GET    | `/academic-periods`         |
| Facultades         | GET    | `/faculty`  ⚠ singular      |
| Carreras           | GET    | `/careers`                  |
| Asignaturas        | GET    | `/subjects`                 |

### Assesment_MS (`:8002/api/v1`) — sin auth
| Recurso                         | Método | Ruta                                |
|---------------------------------|--------|-------------------------------------|
| Student Outcomes                | GET/POST/PUT | `/student-outcomes`           |
| Performance Indicators          | GET/POST/PUT | `/performance-indicators`     |
| Performance Indicator Details   | GET/POST/PUT | `/performance-indicator-details` |
| Performance Evaluations (N1–N4) | GET/POST/PUT | `/performance-evaluations`    |
| Performance Evaluation Details  | GET/POST/PUT | `/performance-evaluation-details` |
| Assesment Evidence              | GET/POST/PUT | `/assesment-evidence`         |
| Evidence + Results (anidado)    | POST   | `/assesment-evidence/with-results`  |
| Assesment Results               | GET/POST/PUT | `/assesment-results`          |

## Tareas

1. Corregir `UserApiService`: `/faculty` (singular), añadir `getUser`, activate/deactivate.
2. Corregir `AssesmentApiService`: métodos CRUD completos y tipados.
3. `Inicio · Acreditación` → API real (hecho, Opción B).
4. Parametrización de rúbrica (coordinador) → cargar SO desde API, crear/editar contra API.
5. Docentes (coordinador) → `GET /users` + `/roles` + `/careers`.
6. Programas (coordinador) → `GET /faculty` + `/careers`.
7. Configuración (coordinador) → `/periods`, `/academic-periods`, `/roles`, usuarios.
8. Registrar valoración (docente) → SO + rúbrica desde API; guardar con `/assesment-evidence/with-results`.
9. Mis indicadores (docente) → cálculo desde `/assesment-results`.
10. Estados de carga/vacío/error consistentes en todas las vistas conectadas.

## Criterio de "vacío"
Cuando la API responde `[]`, la vista muestra un estado vacío explicativo
(no datos inventados). Cuando el microservicio no responde, muestra estado de error
con el puerto afectado.

\connect users_db

-- ---------------------------------------------------------------
-- 1. CATÁLOGO DE PERMISOS DEL SISTEMA
--    Estos códigos están escritos en el código de los endpoints.
--    No son datos de negocio: son la definición de lo que el
--    sistema sabe hacer. Sin ellos la aplicación queda bloqueada.
-- ---------------------------------------------------------------
INSERT INTO permissions (code, name, description) VALUES
  ('RUBRIC_FILL',        'Llenar rúbrica',              'Registrar valoraciones'),
  ('RUBRIC_VIEW',        'Ver resultados de rúbricas',  'Consultar valoraciones'),
  ('STUDENT_UPLOAD',     'Cargar estudiantes',          'Subir listado por NRC'),
  ('INDICATOR_VIEW',     'Ver indicadores',             'Consultar indicadores'),
  ('INDICATOR_CHART',    'Ver gráficas de indicadores', 'Gráficas de desempeño'),
  ('MY_COURSES_VIEW',    'Ver mis cursos',              'Cursos asignados al profesor'),
  ('SO_TO_ASSESS_VIEW',  'Ver SO a valorar',            'SO programados vigentes'),
  ('EVIDENCE_UPLOAD',    'Subir evidencias',            'Funcionalidad futura'),
  ('TEACHER_CRUD',       'CRUD profesores',             NULL),
  ('PROGRAM_CRUD',       'CRUD estructura académica',   'Facultades, programas y periodos'),
  ('SUBJECT_CRUD',       'CRUD materias',               NULL),
  ('SO_CRUD',            'CRUD student outcomes',       NULL),
  ('SO_SCHEDULE_MANAGE', 'Programar student outcomes',  'Crear la programación y cambiar su estado'),
  ('DASHBOARD_PROGRAM',  'Dashboard por programa',      NULL),
  ('DASHBOARD_TEACHER',  'Dashboard por profesor',      NULL),
  ('DASHBOARD_SO',       'Dashboard por student outcome', NULL),
  ('USER_CRUD',          'Crear usuarios y perfiles',   NULL),
  ('PERMISSION_ASSIGN',  'Asignar permisos a perfiles', NULL);

-- ---------------------------------------------------------------
-- 2. ROL ADMINISTRATIVO (el único que se crea por SQL)
--    Los demás roles los crea el administrador desde la aplicación.
-- ---------------------------------------------------------------
INSERT INTO roles (name, description)
VALUES ('Administrativo', 'Administrador del sistema');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'Administrativo'
  AND p.code IN ('USER_CRUD', 'PERMISSION_ASSIGN');

-- ---------------------------------------------------------------
-- 3. USUARIO ADMINISTRADOR INICIAL
--    program_id va en NULL: un administrativo no pertenece a un
--    programa académico.
-- ---------------------------------------------------------------
INSERT INTO users (document_number, name, email, password,
                   role_id, program_id, created_by)
-- password: bcrypt de 'Mesoftx2026!' (contraseña inicial documentada en COMO_EJECUTAR.md)
SELECT '1000000000', 'Administrador', 'admin@unab.edu.co',
       '$2b$12$WsoimVRQt5PwhyQstNE5puHWjiliLurOLkfGoiQz.2ZAP.ekRGyOq', r.id, NULL, NULL   -- created_by NULL: a él no lo creó nadie
FROM roles r WHERE r.name = 'Administrativo';

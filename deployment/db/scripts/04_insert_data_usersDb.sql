\connect users_db

-- ============================================================================
-- Datos mínimos indispensables para el arranque del sistema.
-- ----------------------------------------------------------------------------
-- Solo se cargan:
--   1. Los roles del sistema (catálogo fijo requerido para asignar permisos).
--   2. Una facultad y carrera "por defecto" necesarias por las FK de los
--      usuarios iniciales.
--   3. Los usuarios iniciales (administrador y coordinador) para poder
--      autenticarse y comenzar la parametrización.
--
-- NINGÚN otro dato se genera por script. Student Outcomes, indicadores,
-- niveles, materias, periodos, demás usuarios, facultades y carreras reales,
-- evidencias y valoraciones se crean EXCLUSIVAMENTE desde la aplicación por
-- el coordinador o el administrador.
-- ============================================================================

-- Roles del sistema (solo los que usa la plataforma)
insert into roles (name, description)
values
('Admin', 'Rol administrador con acceso total'),
('Coordinador', 'Rol coordinador de acreditación'),
('Docente', 'Rol docente')
on conflict (name) do nothing;

-- Facultad y carrera por defecto (requeridas por las FK de los usuarios iniciales)
insert into faculty (name, code, description)
values
('Default Faculty', 'DEF', 'Facultad por defecto requerida para los usuarios iniciales.')
on conflict (code) do nothing;

insert into career (name, code, faculty_id, description, accredited, accreditation_end_year)
select 'Default Career', 'DEF-CAR', f.id, 'Carrera por defecto requerida para los usuarios iniciales.', true, 2030
from faculty f
where f.code = 'DEF'
on conflict (code) do nothing;

-- Usuario administrador inicial
-- email: admin@example.com   contraseña: 123
insert into users (name, surname, code, email, password, role_id, career_id)
select
    'Admin',
    'Admin',
    'ADMIN001',
    'admin@example.com',
    '$2b$12$BtON9Df4igMqeqFEimgqHu8.4755G6U7GFLpm7mn5aKi8TQQk48NS',
    r.id,
    c.id
from roles r
cross join career c
where r.name = 'Admin'
  and c.code = 'DEF-CAR'
on conflict (email) do nothing;

-- Usuario coordinador inicial
-- email: orueda741@unab.edu.co   contraseña: 123
insert into users (name, surname, code, email, password, role_id, career_id)
select
    'Óscar',
    'Rueda',
    'COORD001',
    'orueda741@unab.edu.co',
    '$2b$12$BtON9Df4igMqeqFEimgqHu8.4755G6U7GFLpm7mn5aKi8TQQk48NS',
    r.id,
    c.id
from roles r
cross join career c
where r.name = 'Coordinador'
  and c.code = 'DEF-CAR'
on conflict (email) do nothing;

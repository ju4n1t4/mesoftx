\connect users_db

insert into roles (name, description)
values
('Admin', 'Administrator role with full access'),
('Coordinador', 'Coordinator role with limited access'),
('Docente', 'Teacher role with limited access'),
('Evaluador', 'Evaluator role with limited access'),
('Estudiante', 'Student role with limited access')
on conflict (name) do nothing;

insert into years (year)
values
(2026)
on conflict (year) do nothing;

insert into periods (code)
values
('10'),
('20')
on conflict (code) do nothing;

insert into faculty (name, code, description)
values
('Default Faculty', 'DEF', 'Default faculty required for the initial admin user.')
on conflict (code) do nothing;

insert into career (name, code, faculty_id, description)
select 'Default Career', 'DEF-CAR', f.id, 'Default career required for the initial admin user.'
from faculty f
where f.code = 'DEF'
on conflict (code) do nothing;

insert into users (name, surname, code, email, password, role_id, career_id)
select
    'Admin',
    'Admin',
    'ADMIN001',
    'admin@example.com',
    '$2b$12$CB7VijJO7m0Yf.YQR5qkT.Dc5AinZo75yIJOsjwLLhXpM5vh4sGK2',
    r.id,
    c.id
from roles r
cross join career c
where r.name = 'Admin'
  and c.code = 'DEF-CAR'
on conflict (email) do nothing;

/connect users_db;

insert into roles (name, description)
values
('Admin', 'Administrator role with full access'),
('Coordinador', 'Coordinator role with limited access'),
('Docente', 'Teacher role with limited access'),
('Evaluador', 'Evaluator role with limited access'),
('Estudiante', 'Student role with limited access');

insert into users (name, surname, code, email, password, role_id)
values
('Admin', 'Admin', 'ADMIN001', 'admin@example.com', 'admin', 1);
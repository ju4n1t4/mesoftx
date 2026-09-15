\connect users_db

-- Facultad. Ej: ING = Facultad de Ingeniería
CREATE TABLE college (
    id      varchar(3)   PRIMARY KEY,
    name    varchar(255) NOT NULL UNIQUE,
    active  boolean      NOT NULL DEFAULT true
);

-- Programa académico. Ej: ISI = Ingeniería de Sistemas
CREATE TABLE program (
    id                      varchar(3)   PRIMARY KEY,
    name                    varchar(255) NOT NULL UNIQUE,
    college_id              varchar(3)   NOT NULL REFERENCES college(id) ON DELETE CASCADE,
    accredited              boolean      NOT NULL DEFAULT false,
    accreditation_end_year  integer,
    active                  boolean      NOT NULL DEFAULT true
);

-- Periodo académico. Ej: 202610
CREATE TABLE periods (
    id      serial      PRIMARY KEY,
    code    varchar(6)  NOT NULL UNIQUE
);

-- Tipo de usuario: Profesor, Coordinador, Administrativo, Auditor
-- (los estudiantes NO son usuarios: no inician sesión, ver tabla students)
CREATE TABLE roles (
    id          serial       PRIMARY KEY,
    name        varchar(255) NOT NULL UNIQUE,
    description varchar(255)
);

-- Permiso suelto. Ej: RUBRIC_FILL = puede llenar rúbricas
CREATE TABLE permissions (
    id          serial       PRIMARY KEY,
    code        varchar(50)  NOT NULL UNIQUE,
    name        varchar(255) NOT NULL,
    description varchar(255)
);

-- Qué permisos tiene cada rol
CREATE TABLE role_permissions (
    id            serial  PRIMARY KEY,
    role_id       integer NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
    permission_id integer NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);

-- Quienes INICIAN SESIÓN: profesores, coordinador, admin, auditores.
-- Los estudiantes NO van aquí.
CREATE TABLE users (
    id              serial       PRIMARY KEY,
    document_number varchar(25)  NOT NULL UNIQUE,
    name            varchar(255) NOT NULL,
    email           varchar(255) UNIQUE,
    password        varchar(255),
    active          boolean      NOT NULL DEFAULT true,
    role_id         integer      NOT NULL REFERENCES roles(id)   ON DELETE RESTRICT,
    program_id      varchar(3)   REFERENCES program(id) ON DELETE CASCADE,  -- SOLO Profesor. NULL para los demás
    accredited      boolean,                      -- solo se llena para Profesor
    created_by      integer      REFERENCES users(id) ON DELETE SET NULL,  -- NULL solo para el admin inicial
    created_at      timestamp    NOT NULL DEFAULT current_timestamp
);

-- Materia / curso. El NRC es el código único de la SECCIÓN en ese periodo.
-- materia_curso = código institucional de la materia (ej. "ISI-2301").
--                 Varios NRC del mismo periodo pueden compartirlo (secciones).
-- name          = nombre de la materia (ej. "Bases de Datos").
-- Son campos DISTINTOS, no redundantes.
CREATE TABLE subjects (
    nrc           integer      PRIMARY KEY,
    materia_curso varchar(25)  NOT NULL,
    name          varchar(255) NOT NULL,
    periods_id    integer      NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
    program_id    varchar(3)   NOT NULL REFERENCES program(id) ON DELETE CASCADE
);

-- ESTUDIANTES. NO son usuarios: no tienen login, email ni contraseña.
-- Solo existen para poder registrar sus valoraciones.
-- Los carga el profesor (created_by) al subir la lista de su NRC.
CREATE TABLE students (
    id              serial       PRIMARY KEY,
    document_number varchar(25)  NOT NULL UNIQUE,
    name            varchar(255) NOT NULL,
    program_id      varchar(3)   NOT NULL REFERENCES program(id) ON DELETE CASCADE,
    created_by      integer      REFERENCES users(id)   ON DELETE SET NULL,  -- si se borra el profesor, el estudiante sobrevive
    created_at      timestamp    NOT NULL DEFAULT current_timestamp
);

-- Qué estudiante está matriculado en qué NRC
CREATE TABLE students_subjects (
    id          serial    PRIMARY KEY,
    student_id  integer   NOT NULL REFERENCES students(id)  ON DELETE CASCADE,
    subjects_id integer   NOT NULL REFERENCES subjects(nrc) ON DELETE CASCADE,
    created_at  timestamp NOT NULL DEFAULT current_timestamp,
    CONSTRAINT uq_student_subject UNIQUE (student_id, subjects_id)
);

-- Qué profesor tiene asignado qué NRC (lo asigna el coordinador)
CREATE TABLE teacher_subjects (
    id          serial    PRIMARY KEY,
    user_id     integer   NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    subjects_id integer   NOT NULL REFERENCES subjects(nrc) ON DELETE CASCADE,
    assigned_by integer   REFERENCES users(id)     ON DELETE SET NULL,  -- traza de quién asignó; no bloquea
    created_at  timestamp NOT NULL DEFAULT current_timestamp,
    CONSTRAINT uq_teacher_subject UNIQUE (user_id, subjects_id)
);

CREATE INDEX idx_users_role      ON users(role_id);
CREATE INDEX idx_users_program   ON users(program_id);
CREATE INDEX idx_ss_subject      ON students_subjects(subjects_id);
CREATE INDEX idx_students_prog   ON students(program_id);
CREATE INDEX idx_ts_user         ON teacher_subjects(user_id);
CREATE INDEX idx_subjects_period ON subjects(periods_id);
CREATE INDEX idx_subjects_code   ON subjects(materia_curso);

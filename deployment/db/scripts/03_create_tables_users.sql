\connect users_db

create table if not exists roles (
    id serial primary key,
    name varchar(255) not null unique,
    description text
);

create table if not exists years (
    id serial primary key,
    year integer not null unique
);

create table if not exists periods (
    id serial primary key,
    code varchar(2) not null unique
);

create table if not exists academic_periods (
    id serial primary key,
    name varchar(255) not null unique,
    code varchar(25) not null unique,
    period_id integer not null,
    year_id integer not null
);

create table if not exists faculty (
    id serial primary key,
    name varchar(255) not null unique,
    code varchar(25) not null unique,
    description text
);

create table if not exists career (
    id serial primary key,
    name varchar(255) not null unique,
    code varchar(25) not null unique,
    faculty_id integer not null,
    description text,
    accredited boolean not null default false,
    accreditation_end_year integer
);

create table if not exists subjects (
    id serial primary key,
    name varchar(255) not null unique,
    code varchar(25) not null unique,
    career_id integer not null,
    description text
);

create table if not exists users (
    id serial primary key,
    name varchar(255) not null,
    surname varchar(255) not null,
    code varchar(25) not null unique,
    email varchar(255) not null unique,
    password varchar(255),
    active boolean default true,
    role_id integer not null,
    career_id integer not null,
    created_at timestamp default current_timestamp
);

create table if not exists users_subjects (
    id serial primary key,
    user_id integer not null,
    subject_id integer not null,
    created_at timestamp default current_timestamp
);

alter table career
    add constraint fk_career_faculty
    foreign key (faculty_id) references faculty(id);

alter table subjects
    add constraint fk_subject_career
    foreign key (career_id) references career(id);

alter table users
    add constraint fk_user_role
    foreign key (role_id) references roles(id);
    
-- Borrado en cascada: al eliminar un programa academico (career) se eliminan
-- automaticamente los usuarios asociados, retirandoles el acceso al sistema.
alter table users
    add constraint fk_user_career
    foreign key (career_id) references career(id) on delete cascade;

-- Al eliminar el usuario se limpian tambien sus asignaciones de materias.
alter table users_subjects
    add constraint fk_users_subject_user
    foreign key (user_id) references users(id) on delete cascade;

alter table users_subjects
    add constraint fk_users_subject_subject
    foreign key (subject_id) references subjects(id);

alter table academic_periods
    add constraint fk_academic_period_period
    foreign key (period_id) references periods(id);

alter table academic_periods
    add constraint fk_academic_period_year
    foreign key (year_id) references years(id);



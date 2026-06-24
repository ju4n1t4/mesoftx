/connect users_db;

create table if not exists roles (
    id serial primary key,
    name varchar(255) not null unique,
    description text
);

create table if not exists years (
    id serial primary key,
    year number not null unique
);

create table if not exists periods (
    id serial primary key,
    period varchar(255) not null unique
);

create table if not exists academic_periods (
    id serial primary key,
    name varchar(255) not null unique,
    period_id integer not null,
    year_id integer not null,
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
    description text
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
    
alter table users
    add constraint fk_user_career
    foreign key (career_id) references career(id);

alter table users_subjects
    add constraint fk_users_subject_user
    foreign key (user_id) references users(id);

alter table users_subjects
    add constraint fk_users_subject_subject
    foreign key (subject_id) references subjects(id);
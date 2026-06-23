/connect users_db;

create table if not exists roles (
    id serial primary key,
    name varchar(255) not null unique,
    description text
);

create table if not exists users (
    id serial primary key,
    name varchar(255) not null,
    surname varchar(255) not null,
    username varchar(255) not null unique,
    email varchar(255) not null unique,
    password varchar(255) not null,
    subject integer not null,
    role_id integer not null,
    created_at timestamp default current_timestamp
); 

alter table users
    add constraint fk_user_role
    foreign key (role_id) references roles(id);
create database if not exists mesoftx_db
    with 
        owner = postgres
        encoding = 'UTF8'
        lc_collate = 'en_US.UTF-8'
        lc_ctype = 'en_US.UTF-8'
        template = template0;

create database if not exists users_db
    with 
        owner = postgres
        encoding = 'UTF8'
        lc_collate = 'en_US.UTF-8'
        lc_ctype = 'en_US.UTF-8'
        template = template0;

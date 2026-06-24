SELECT 'CREATE DATABASE assesment_mesoftx_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'assesment_mesoftx_db')\gexec

SELECT 'CREATE DATABASE users_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'users_db')\gexec

#!/bin/sh
set -eu

SCRIPT_DIR="/opt/mesoftx-db/scripts"
WORK_DIR="/tmp/mesoftx-db-init"

mkdir -p "$WORK_DIR"

create_database() {
  db_name="$1"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
SELECT 'CREATE DATABASE ${db_name}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${db_name}')\gexec
SQL
}

sanitize_sql() {
  source_file="$1"
  target_file="$2"

  sed \
    -e 's#^/connect[[:space:]]\+\([^;]*\);#\\connect \1#' \
    -e 's/year number/year integer/g' \
    -e 's/^[[:space:]]*year[[:space:]]\+number/year integer/g' \
    -e 's/year_id integer not null,/year_id integer not null/g' \
    -e "s/^\(.*'SO6'.*\)$/\1,/" \
    "$source_file" > "$target_file"
}

run_sql_script() {
  source_file="$1"
  target_file="$WORK_DIR/$(basename "$source_file")"
  sanitize_sql "$source_file" "$target_file"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres --file "$target_file"
}

seed_default_user_catalogs() {
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname users_db <<'SQL'
INSERT INTO faculty (name, code, description)
VALUES ('Default Faculty', 'DEF', 'Default faculty required for the initial admin user.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO career (name, code, faculty_id, description)
SELECT 'Default Career', 'DEF-CAR', f.id, 'Default career required for the initial admin user.'
FROM faculty f
WHERE f.code = 'DEF'
ON CONFLICT (code) DO NOTHING;

INSERT INTO users (name, surname, code, email, password, role_id, career_id)
SELECT 'Admin', 'Admin', 'ADMIN001', 'admin@example.com', '$2b$12$wPWm3gyFdWkjz0hSxQeAQuH7HBs7hTb7ji6CV5.SNaQ1g4oFEaDQy', r.id, c.id
FROM roles r
CROSS JOIN career c
WHERE r.name = 'Admin' AND c.code = 'DEF-CAR'
ON CONFLICT (email) DO NOTHING;
SQL
}

create_database "assesment_mesoftx_db"
create_database "users_db"

run_sql_script "$SCRIPT_DIR/02_create_tables_assesmentMesoftx.sql"
run_sql_script "$SCRIPT_DIR/03_create_tables_users.sql"
run_sql_script "$SCRIPT_DIR/05_insert_data_assesmentMesoftxDB.sql"

run_sql_script "$SCRIPT_DIR/04_insert_data_usersDb.sql" || seed_default_user_catalogs

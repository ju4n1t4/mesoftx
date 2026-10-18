"""
Verificación automática de la estructura de base de datos MESOFTX.

Comprueba la estructura, las restricciones y los datos de arranque de las dos
bases del sistema: users_db y assesment_mesoftx_db.

Cómo ejecutarlo:

    pip install pytest psycopg2-binary
    export USERS_DB_URL="postgresql://postgres:postgres@localhost:5432/users_db"
    export ASSESMENT_DB_URL="postgresql://postgres:postgres@localhost:5432/assesment_mesoftx_db"
    pytest tests/verify_db_structure.py -v

Los tests que insertan datos lo hacen dentro de una transacción que se revierte
al final, de modo que la base de datos queda igual que antes de ejecutarlos.
"""

import os

import psycopg2
import pytest

USERS_DB_URL = os.environ.get(
    "USERS_DB_URL", "postgresql://postgres:postgres@localhost:5432/users_db"
)
ASSESMENT_DB_URL = os.environ.get(
    "ASSESMENT_DB_URL",
    "postgresql://postgres:postgres@localhost:5432/assesment_mesoftx_db",
)

# =============================================================================
# VALORES ESPERADOS (fijos; vienen del documento de instrucciones, no del código)
# =============================================================================

USERS_TABLES = {
    "college", "program", "periods", "roles", "permissions", "role_permissions",
    "users", "students", "subjects", "students_subjects", "teacher_subjects",
}

ASSESMENT_TABLES = {
    "so", "performance", "level", "so_schedule", "schedule_subjects",
    "rubric", "evidence", "period_target",
}

OLD_TABLES_THAT_MUST_NOT_EXIST = {
    "faculty", "career", "years", "academic_periods", "users_subjects",
    "student_outcomes", "performance_indicators", "performance_indicator_details",
    "performance_evaluations", "performance_evaluation_details",
    "assesment_evidence", "assesment_results", "teachers",
}

PERMISSION_CODES = {
    "RUBRIC_FILL", "RUBRIC_VIEW", "STUDENT_UPLOAD", "INDICATOR_VIEW",
    "INDICATOR_CHART", "MY_COURSES_VIEW", "SO_TO_ASSESS_VIEW", "EVIDENCE_UPLOAD",
    "TEACHER_CRUD", "PROGRAM_CRUD", "SUBJECT_CRUD", "SO_CRUD", "SO_SCHEDULE_MANAGE",
    "DASHBOARD_PROGRAM", "DASHBOARD_TEACHER", "DASHBOARD_SO",
    "USER_CRUD", "PERMISSION_ASSIGN",
}

ADMIN_PERMISSIONS = {"USER_CRUD", "PERMISSION_ASSIGN", "PROGRAM_CRUD"}

# tabla -> filas esperadas justo después del bootstrap
EXPECTED_ROWS_USERS = {
    "college": 0, "program": 0, "periods": 0, "roles": 1, "permissions": 18,
    "role_permissions": 3, "users": 1, "students": 0, "subjects": 0,
    "students_subjects": 0, "teacher_subjects": 0,
}
EXPECTED_ROWS_ASSESMENT = {t: 0 for t in ASSESMENT_TABLES}

# constraint_name -> delete_rule esperada
FK_DELETE_RULES_USERS = {
    # (tabla, columna) -> regla
    ("program", "college_id"): "CASCADE",
    ("users", "role_id"): "RESTRICT",
    ("users", "program_id"): "CASCADE",
    ("users", "created_by"): "SET NULL",
    ("students", "program_id"): "CASCADE",
    ("students", "created_by"): "SET NULL",
    ("subjects", "periods_id"): "CASCADE",
    ("subjects", "program_id"): "CASCADE",
    ("students_subjects", "student_id"): "CASCADE",
    ("students_subjects", "subjects_id"): "CASCADE",
    ("teacher_subjects", "user_id"): "CASCADE",
    ("teacher_subjects", "subjects_id"): "CASCADE",
    ("teacher_subjects", "assigned_by"): "SET NULL",
    ("role_permissions", "role_id"): "CASCADE",
    ("role_permissions", "permission_id"): "CASCADE",
}
FK_DELETE_RULES_ASSESMENT = {
    ("performance", "so_id"): "CASCADE",
    ("level", "performance_id"): "CASCADE",
    ("so_schedule", "so_id"): "CASCADE",
    ("schedule_subjects", "schedule_id"): "CASCADE",
    ("evidence", "schedule_id"): "CASCADE",
    ("rubric", "schedule_id"): "CASCADE",
}
NAMED_CONSTRAINT_RULES_ASSESMENT = {
    "fk_rubric_level": "CASCADE",
    "fk_rubric_evidence": "SET NULL",
}

CONSTRAINTS_USERS = {
    "uq_role_permission", "uq_student_subject", "uq_teacher_subject",
}
CONSTRAINTS_ASSESMENT = {
    "uq_level_performance", "uq_level_rank", "ck_level_rank",
    "uq_so_schedule", "ck_schedule_status", "uq_schedule_subject",
    "uq_evidence_ctx", "fk_rubric_level", "fk_rubric_evidence", "uq_rubric",
}

# columnas cross-service: NO deben tener FK (viven en la otra base).
# rubric.student_id y rubric.subjects_id no están aquí a propósito: forman
# parte de la FK compuesta fk_rubric_evidence (local), así que sí tienen FK.
CROSS_SERVICE_COLUMNS = {
    ("so", "college_id"),
    ("so_schedule", "period_id"), ("so_schedule", "coordinator_user_id"),
    ("so_schedule", "updated_by"),
    ("schedule_subjects", "subjects_id"),
    ("rubric", "evaluator_user_id"),
    ("evidence", "subjects_id"), ("evidence", "student_id"), ("evidence", "uploaded_by"),
}


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture(scope="module")
def users_ro():
    conn = psycopg2.connect(USERS_DB_URL)
    conn.set_session(readonly=True, autocommit=True)
    yield conn.cursor()
    conn.close()


@pytest.fixture(scope="module")
def assesment_ro():
    conn = psycopg2.connect(ASSESMENT_DB_URL)
    conn.set_session(readonly=True, autocommit=True)
    yield conn.cursor()
    conn.close()


@pytest.fixture
def users_tx():
    """Transacción que SIEMPRE se revierte: la base queda intacta."""
    conn = psycopg2.connect(USERS_DB_URL)
    conn.autocommit = False
    cur = conn.cursor()
    yield cur
    conn.rollback()
    conn.close()


@pytest.fixture
def assesment_tx():
    conn = psycopg2.connect(ASSESMENT_DB_URL)
    conn.autocommit = False
    cur = conn.cursor()
    yield cur
    conn.rollback()
    conn.close()


def tables(cur):
    cur.execute(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema='public' AND table_type='BASE TABLE'"
    )
    return {r[0] for r in cur.fetchall()}


def columns(cur, table):
    cur.execute(
        "SELECT column_name, data_type, is_nullable, character_maximum_length "
        "FROM information_schema.columns WHERE table_name=%s", (table,)
    )
    return {r[0]: (r[1], r[2], r[3]) for r in cur.fetchall()}


def fk_rule(cur, table, column):
    cur.execute(
        """
        SELECT rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type='FOREIGN KEY'
          AND tc.table_name=%s AND kcu.column_name=%s
        """,
        (table, column),
    )
    rows = cur.fetchall()
    return rows[0][0] if rows else None


def constraint_rule(cur, name):
    cur.execute(
        "SELECT delete_rule FROM information_schema.referential_constraints "
        "WHERE constraint_name=%s", (name,)
    )
    r = cur.fetchone()
    return r[0] if r else None


def constraint_names(cur):
    cur.execute(
        "SELECT constraint_name FROM information_schema.table_constraints "
        "WHERE table_schema='public'"
    )
    return {r[0] for r in cur.fetchall()}


def raises_integrity(cur, sql, params=None, must_contain=None):
    """Ejecuta un INSERT/UPDATE/DELETE que DEBE fallar. Devuelve True si falló."""
    try:
        cur.execute("SAVEPOINT sp")
        cur.execute(sql, params)
        cur.execute("RELEASE SAVEPOINT sp")
        return False
    except psycopg2.Error as e:
        cur.execute("ROLLBACK TO SAVEPOINT sp")
        if must_contain:
            assert must_contain in str(e), f"Falló pero no por {must_contain}: {e}"
        return True


# =============================================================================
# A. ESTRUCTURA — users_db
# =============================================================================

def test_users_db_has_exactly_the_11_tables(users_ro):
    assert tables(users_ro) == USERS_TABLES


def test_users_db_has_no_old_tables(users_ro):
    assert not (tables(users_ro) & OLD_TABLES_THAT_MUST_NOT_EXIST)


def test_users_program_id_is_nullable(users_ro):
    assert columns(users_ro, "users")["program_id"][1] == "YES"


def test_users_has_no_period_id_column(users_ro):
    assert "period_id" not in columns(users_ro, "users")


def test_users_created_by_is_integer_nullable(users_ro):
    dtype, nullable, _ = columns(users_ro, "users")["created_by"]
    assert dtype == "integer" and nullable == "YES"


def test_students_is_a_separate_table_with_expected_columns(users_ro):
    cols = columns(users_ro, "students")
    assert set(cols) == {"id", "document_number", "name", "program_id",
                         "created_by", "created_at"}
    assert "email" not in cols and "password" not in cols and "role_id" not in cols


def test_subjects_field_sizes_are_correct(users_ro):
    cols = columns(users_ro, "subjects")
    assert cols["materia_curso"][2] == 25, "materia_curso es un código: varchar(25)"
    assert cols["name"][2] == 255, "name es el nombre: varchar(255)"


def test_subjects_periods_id_is_not_unique(users_ro):
    users_ro.execute(
        """
        SELECT count(*) FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name='subjects' AND tc.constraint_type='UNIQUE'
          AND kcu.column_name='periods_id'
        """
    )
    assert users_ro.fetchone()[0] == 0, "subjects.periods_id NO debe ser UNIQUE"


@pytest.mark.parametrize("table_col,rule", FK_DELETE_RULES_USERS.items())
def test_users_db_fk_delete_rules(users_ro, table_col, rule):
    assert fk_rule(users_ro, *table_col) == rule, f"{table_col} debe ser ON DELETE {rule}"


def test_users_db_named_constraints_exist(users_ro):
    assert CONSTRAINTS_USERS <= constraint_names(users_ro)


# =============================================================================
# B. ESTRUCTURA — assesment_mesoftx_db
# =============================================================================

def test_assesment_db_has_exactly_the_8_tables(assesment_ro):
    assert tables(assesment_ro) == ASSESMENT_TABLES


def test_assesment_db_has_no_old_tables(assesment_ro):
    assert not (tables(assesment_ro) & OLD_TABLES_THAT_MUST_NOT_EXIST)


def test_evidence_has_no_rubric_id(assesment_ro):
    assert "rubric_id" not in columns(assesment_ro, "evidence")


def test_evidence_has_file_columns(assesment_ro):
    cols = columns(assesment_ro, "evidence")
    assert {"file_url", "mime_type", "uploaded_by", "schedule_id",
            "subjects_id", "student_id"} <= set(cols)


def test_level_has_rank(assesment_ro):
    assert columns(assesment_ro, "level")["rank"][0] == "smallint"


def test_rubric_evidence_id_is_nullable(assesment_ro):
    assert columns(assesment_ro, "rubric")["evidence_id"][1] == "YES"


def test_so_schedule_has_audit_columns(assesment_ro):
    cols = columns(assesment_ro, "so_schedule")
    assert "updated_by" in cols and "updated_at" in cols


@pytest.mark.parametrize("table_col,rule", FK_DELETE_RULES_ASSESMENT.items())
def test_assesment_db_fk_delete_rules(assesment_ro, table_col, rule):
    assert fk_rule(assesment_ro, *table_col) == rule


@pytest.mark.parametrize("name,rule", NAMED_CONSTRAINT_RULES_ASSESMENT.items())
def test_assesment_composite_fk_rules(assesment_ro, name, rule):
    assert constraint_rule(assesment_ro, name) == rule, f"{name} debe ser ON DELETE {rule}"


def test_assesment_db_named_constraints_exist(assesment_ro):
    assert CONSTRAINTS_ASSESMENT <= constraint_names(assesment_ro)


@pytest.mark.parametrize("table_col", sorted(CROSS_SERVICE_COLUMNS))
def test_cross_service_columns_have_no_fk(assesment_ro, table_col):
    assert fk_rule(assesment_ro, *table_col) is None, \
        f"{table_col} es cross-service: NO debe tener REFERENCES"


# =============================================================================
# C. BASE VIRGEN — solo bootstrap
# =============================================================================

@pytest.mark.parametrize("table,expected", EXPECTED_ROWS_USERS.items())
def test_users_db_row_counts(users_ro, table, expected):
    users_ro.execute(f"SELECT count(*) FROM {table}")
    assert users_ro.fetchone()[0] == expected, f"{table} debe tener {expected} filas"


@pytest.mark.parametrize("table,expected", EXPECTED_ROWS_ASSESMENT.items())
def test_assesment_db_is_completely_empty(assesment_ro, table, expected):
    assesment_ro.execute(f"SELECT count(*) FROM {table}")
    assert assesment_ro.fetchone()[0] == expected


def test_permission_codes_are_exactly_the_18(users_ro):
    users_ro.execute("SELECT code FROM permissions")
    assert {r[0] for r in users_ro.fetchall()} == PERMISSION_CODES


def test_only_role_is_administrativo(users_ro):
    users_ro.execute("SELECT name FROM roles")
    assert [r[0] for r in users_ro.fetchall()] == ["Administrativo"]


def test_no_estudiante_role(users_ro):
    users_ro.execute("SELECT count(*) FROM roles WHERE lower(name) LIKE 'estudiante%'")
    assert users_ro.fetchone()[0] == 0


def test_admin_has_exactly_its_two_permissions(users_ro):
    users_ro.execute(
        """
        SELECT p.code FROM role_permissions rp
        JOIN roles r ON r.id = rp.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE r.name = 'Administrativo'
        """
    )
    assert {r[0] for r in users_ro.fetchall()} == ADMIN_PERMISSIONS


def test_admin_user_is_correct(users_ro):
    users_ro.execute(
        """
        SELECT u.email, u.program_id, u.created_by, u.password, r.name
        FROM users u JOIN roles r ON r.id = u.role_id
        """
    )
    rows = users_ro.fetchall()
    assert len(rows) == 1
    email, program_id, created_by, password, role = rows[0]
    assert role == "Administrativo"
    assert program_id is None, "el admin no pertenece a un programa"
    assert created_by is None, "al admin no lo creó nadie"
    assert password and "<<HASH" not in password, "el hash NO se reemplazó (paso 7)"
    assert password.startswith(("$2", "$argon", "$pbkdf2")), "no parece un hash real"


# =============================================================================
# D. COMPORTAMIENTO — users_db (todo dentro de transacción revertida)
# =============================================================================

def _seed_academic(cur):
    cur.execute("INSERT INTO college (id, name) VALUES ('TST', 'Facultad Test')")
    cur.execute(
        "INSERT INTO program (id, name, college_id) VALUES ('TP1', 'Programa Test', 'TST')"
    )
    cur.execute("INSERT INTO periods (code) VALUES ('999910') RETURNING id")
    period = cur.fetchone()[0]
    cur.execute("SELECT id FROM roles WHERE name='Administrativo'")
    role = cur.fetchone()[0]
    cur.execute(
        "INSERT INTO users (document_number, name, role_id, program_id, created_by) "
        "VALUES ('T-PROF', 'Profesor Test', %s, 'TP1', 1) RETURNING id", (role,)
    )
    prof = cur.fetchone()[0]
    cur.execute(
        "INSERT INTO subjects (nrc, materia_curso, name, periods_id, program_id) "
        "VALUES (99001, 'TST-001', 'Materia Test', %s, 'TP1')", (period,)
    )
    cur.execute(
        "INSERT INTO students (document_number, name, program_id, created_by) "
        "VALUES ('T-STU', 'Estudiante Test', 'TP1', %s) RETURNING id", (prof,)
    )
    stu = cur.fetchone()[0]
    cur.execute(
        "INSERT INTO students_subjects (student_id, subjects_id) VALUES (%s, 99001)", (stu,)
    )
    cur.execute(
        "INSERT INTO teacher_subjects (user_id, subjects_id, assigned_by) "
        "VALUES (%s, 99001, 1)", (prof,)
    )
    return dict(period=period, prof=prof, stu=stu)


def test_two_nrc_in_same_period_is_allowed(users_tx):
    s = _seed_academic(users_tx)
    users_tx.execute(
        "INSERT INTO subjects (nrc, materia_curso, name, periods_id, program_id) "
        "VALUES (99002, 'TST-001', 'Otra seccion', %s, 'TP1')", (s["period"],)
    )
    users_tx.execute("SELECT count(*) FROM subjects WHERE periods_id=%s", (s["period"],))
    assert users_tx.fetchone()[0] == 2


def test_same_student_in_two_nrc_is_one_student_row(users_tx):
    s = _seed_academic(users_tx)
    users_tx.execute(
        "INSERT INTO subjects (nrc, materia_curso, name, periods_id, program_id) "
        "VALUES (99002, 'TST-002', 'Materia 2', %s, 'TP1')", (s["period"],)
    )
    users_tx.execute(
        "INSERT INTO students_subjects (student_id, subjects_id) VALUES (%s, 99002)", (s["stu"],)
    )
    users_tx.execute("SELECT count(*) FROM students WHERE document_number='T-STU'")
    assert users_tx.fetchone()[0] == 1
    users_tx.execute("SELECT count(*) FROM students_subjects WHERE student_id=%s", (s["stu"],))
    assert users_tx.fetchone()[0] == 2


def test_duplicate_enrollment_fails(users_tx):
    s = _seed_academic(users_tx)
    assert raises_integrity(
        users_tx,
        "INSERT INTO students_subjects (student_id, subjects_id) VALUES (%s, 99001)",
        (s["stu"],), must_contain="uq_student_subject",
    )


def test_duplicate_student_document_fails(users_tx):
    _seed_academic(users_tx)
    assert raises_integrity(
        users_tx,
        "INSERT INTO students (document_number, name, program_id, created_by) "
        "VALUES ('T-STU', 'Otro', 'TP1', 1)",
    )


def test_deleting_program_cascades_everything(users_tx):
    _seed_academic(users_tx)
    users_tx.execute("DELETE FROM program WHERE id='TP1'")
    for t, where in [("subjects", "nrc=99001"), ("students", "document_number='T-STU'"),
                     ("users", "document_number='T-PROF'"),
                     ("students_subjects", "subjects_id=99001"),
                     ("teacher_subjects", "subjects_id=99001")]:
        users_tx.execute(f"SELECT count(*) FROM {t} WHERE {where}")
        assert users_tx.fetchone()[0] == 0, f"{t} debió borrarse en cascada"


def test_deleting_role_with_users_is_blocked(users_tx):
    users_tx.execute("SELECT id FROM roles WHERE name='Administrativo'")
    role = users_tx.fetchone()[0]
    assert raises_integrity(users_tx, "DELETE FROM roles WHERE id=%s", (role,))


def test_deleting_professor_keeps_student_with_null_created_by(users_tx):
    s = _seed_academic(users_tx)
    users_tx.execute("DELETE FROM users WHERE id=%s", (s["prof"],))
    users_tx.execute("SELECT created_by FROM students WHERE id=%s", (s["stu"],))
    row = users_tx.fetchone()
    assert row is not None, "el estudiante debe sobrevivir"
    assert row[0] is None, "created_by debe quedar NULL"


# =============================================================================
# E. COMPORTAMIENTO — assesment_mesoftx_db (todo dentro de transacción revertida)
# =============================================================================

def _seed_assessment(cur):
    cur.execute("INSERT INTO so (id, description, college_id) VALUES ('T.SO1', 'SO test', 'TST')")
    cur.execute("INSERT INTO performance (id, description, so_id) VALUES ('TI1', 'Ind 1', 'T.SO1')")
    cur.execute("INSERT INTO performance (id, description, so_id) VALUES ('TI2', 'Ind 2', 'T.SO1')")
    for rank, name in enumerate(["INSATISFACTORIO", "EN DESARROLLO", "BUENO", "SUPERA"], 1):
        cur.execute(
            "INSERT INTO level (id, description, rank, performance_id) VALUES (%s, %s, %s, 'TI1')",
            (f"T.SO1TI1{name}", name, rank),
        )
    cur.execute(
        "INSERT INTO level (id, description, rank, performance_id) "
        "VALUES ('T.SO1TI2BUENO', 'Bueno', 3, 'TI2')"
    )
    cur.execute(
        "INSERT INTO so_schedule (so_id, period_id, coordinator_user_id, status) "
        "VALUES ('T.SO1', 1, 1, 'EN_CURSO') RETURNING id"
    )
    sched = cur.fetchone()[0]
    cur.execute("INSERT INTO schedule_subjects (schedule_id, subjects_id) VALUES (%s, 99001)", (sched,))
    cur.execute(
        "INSERT INTO evidence (schedule_id, subjects_id, student_id, name, file_url, uploaded_by) "
        "VALUES (%s, 99001, 500, 'ev.pdf', 'https://x/ev.pdf', 1) RETURNING id", (sched,)
    )
    ev = cur.fetchone()[0]
    return dict(sched=sched, ev=ev)


RUBRIC_SQL = (
    "INSERT INTO rubric (schedule_id, evaluator_user_id, student_id, subjects_id, "
    "performance_id, level_id, evidence_id) VALUES (%s, 1, %s, 99001, %s, %s, %s)"
)


def test_level_rank_out_of_range_fails(assesment_tx):
    _seed_assessment(assesment_tx)
    assert raises_integrity(
        assesment_tx,
        "INSERT INTO level (id, description, rank, performance_id) VALUES ('X', 'x', 5, 'TI1')",
        must_contain="ck_level_rank",
    )


def test_duplicate_rank_for_same_indicator_fails(assesment_tx):
    _seed_assessment(assesment_tx)
    assert raises_integrity(
        assesment_tx,
        "INSERT INTO level (id, description, rank, performance_id) VALUES ('X', 'x', 3, 'TI1')",
        must_contain="uq_level_rank",
    )


def test_invalid_schedule_status_fails(assesment_tx):
    _seed_assessment(assesment_tx)
    assert raises_integrity(
        assesment_tx,
        "INSERT INTO so_schedule (so_id, period_id, coordinator_user_id, status) "
        "VALUES ('T.SO1', 2, 1, 'ABIERTO')", must_contain="ck_schedule_status",
    )


def test_duplicate_schedule_same_so_same_period_fails(assesment_tx):
    _seed_assessment(assesment_tx)
    assert raises_integrity(
        assesment_tx,
        "INSERT INTO so_schedule (so_id, period_id, coordinator_user_id, status) "
        "VALUES ('T.SO1', 1, 1, 'PLANIFICADO')", must_contain="uq_so_schedule",
    )


def test_rubric_without_evidence_is_ok(assesment_tx):
    s = _seed_assessment(assesment_tx)
    assesment_tx.execute(RUBRIC_SQL, (s["sched"], 500, "TI1", "T.SO1TI1BUENO", None))
    assesment_tx.execute("SELECT count(*) FROM rubric")
    assert assesment_tx.fetchone()[0] == 1


def test_rubric_level_of_other_indicator_fails(assesment_tx):
    """LA PRUEBA MÁS IMPORTANTE: el nivel 'T.SO1TI2BUENO' es de TI2, no de TI1."""
    s = _seed_assessment(assesment_tx)
    assert raises_integrity(
        assesment_tx, RUBRIC_SQL, (s["sched"], 500, "TI1", "T.SO1TI2BUENO", None),
        must_contain="fk_rubric_level",
    )


def test_rubric_with_evidence_of_other_student_fails(assesment_tx):
    s = _seed_assessment(assesment_tx)
    # la evidencia es del estudiante 500; intento enlazarla al 501
    assert raises_integrity(
        assesment_tx, RUBRIC_SQL, (s["sched"], 501, "TI1", "T.SO1TI1BUENO", s["ev"]),
        must_contain="fk_rubric_evidence",
    )


def test_rubric_with_matching_evidence_is_ok(assesment_tx):
    s = _seed_assessment(assesment_tx)
    assesment_tx.execute(RUBRIC_SQL, (s["sched"], 500, "TI1", "T.SO1TI1BUENO", s["ev"]))
    assesment_tx.execute("SELECT evidence_id FROM rubric")
    assert assesment_tx.fetchone()[0] == s["ev"]


def test_duplicate_rubric_same_student_same_indicator_fails(assesment_tx):
    s = _seed_assessment(assesment_tx)
    assesment_tx.execute(RUBRIC_SQL, (s["sched"], 500, "TI1", "T.SO1TI1BUENO", None))
    assert raises_integrity(
        assesment_tx, RUBRIC_SQL, (s["sched"], 500, "TI1", "T.SO1TI1SUPERA", None),
        must_contain="uq_rubric",
    )


def test_deleting_evidence_sets_rubric_evidence_id_null(assesment_tx):
    s = _seed_assessment(assesment_tx)
    assesment_tx.execute(RUBRIC_SQL, (s["sched"], 500, "TI1", "T.SO1TI1BUENO", s["ev"]))
    assesment_tx.execute("DELETE FROM evidence WHERE id=%s", (s["ev"],))
    assesment_tx.execute("SELECT count(*), max(evidence_id) FROM rubric")
    count, ev = assesment_tx.fetchone()
    assert count == 1, "la rúbrica NO debe borrarse"
    assert ev is None, "evidence_id debe quedar NULL"


def test_deleting_so_cascades_to_everything(assesment_tx):
    s = _seed_assessment(assesment_tx)
    assesment_tx.execute(RUBRIC_SQL, (s["sched"], 500, "TI1", "T.SO1TI1BUENO", s["ev"]))
    assesment_tx.execute("DELETE FROM so WHERE id='T.SO1'")
    for t in ["performance", "level", "so_schedule", "schedule_subjects", "rubric", "evidence"]:
        assesment_tx.execute(f"SELECT count(*) FROM {t}")
        assert assesment_tx.fetchone()[0] == 0, f"{t} debió borrarse en cascada"


def test_duplicate_schedule_subject_fails(assesment_tx):
    s = _seed_assessment(assesment_tx)
    assert raises_integrity(
        assesment_tx,
        "INSERT INTO schedule_subjects (schedule_id, subjects_id) VALUES (%s, 99001)",
        (s["sched"],), must_contain="uq_schedule_subject",
    )

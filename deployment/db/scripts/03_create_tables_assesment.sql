\connect assesment_mesoftx_db

-- Student Outcome. Ej: S.O.1
CREATE TABLE so (
    id          varchar(5)   PRIMARY KEY,
    description varchar(255) NOT NULL,
    college_id  varchar(3)   NOT NULL   -- cross-service -> users_db.college.id
);

-- Indicador de desempeño. Ej: ID1
CREATE TABLE performance (
    id          varchar(3)   PRIMARY KEY,
    description varchar(255) NOT NULL,
    so_id       varchar(5)   NOT NULL REFERENCES so(id) ON DELETE CASCADE
);

-- Nivel de desempeño + su descriptor.
-- Cada indicador tiene 4: INSATISFACTORIO, EN DESARROLLO, BUENO, SUPERA
-- rank = orden numérico (1 el más bajo, 4 el más alto). Sin esto no se pueden
-- ordenar las gráficas ni calcular promedios.
CREATE TABLE level (
    id             varchar(100) PRIMARY KEY,
    description    varchar(255) NOT NULL,
    rank           smallint     NOT NULL,
    performance_id varchar(3)   NOT NULL REFERENCES performance(id) ON DELETE CASCADE,
    CONSTRAINT ck_level_rank        CHECK (rank BETWEEN 1 AND 4),
    CONSTRAINT uq_level_performance UNIQUE (performance_id, id),
    CONSTRAINT uq_level_rank        UNIQUE (performance_id, rank)
);

-- PROGRAMACIÓN: qué SO se valoran en qué periodo. La crea el coordinador.
-- El coordinador cambia el status (abrir / cerrar / reabrir). Es histórico:
-- los periodos CERRADOS se conservan y se pueden consultar siempre.
CREATE TABLE so_schedule (
    id                  serial       PRIMARY KEY,
    so_id               varchar(5)   NOT NULL REFERENCES so(id) ON DELETE CASCADE,
    period_id           integer      NOT NULL,   -- cross-service -> users_db.periods.id
    coordinator_user_id integer      NOT NULL,   -- cross-service -> users_db.users.id
    status              varchar(20)  NOT NULL,
    created_at          timestamp    NOT NULL DEFAULT current_timestamp,
    updated_by          integer,                 -- cross-service. Quién cambió el status por última vez
    updated_at          timestamp,
    CONSTRAINT uq_so_schedule UNIQUE (so_id, period_id),
    CONSTRAINT ck_schedule_status CHECK (status IN ('PLANIFICADO','EN_CURSO','CERRADO'))
);

-- META DE LOGRO DEL PERIODO.
-- Porcentaje mínimo de estudiantes en niveles altos (Bueno + Supera) que el
-- coordinador fija para considerar cumplido un indicador en el periodo. Una
-- fila por periodo; sirve de línea de referencia en las gráficas de
-- indicadores de todas las vistas (pública, profesor, coordinador y auditor).
CREATE TABLE period_target (
    period_id   integer   PRIMARY KEY,          -- cross-service -> users_db.periods.id
    target_pct  smallint  NOT NULL,
    updated_by  integer   NOT NULL,             -- cross-service -> users_db.users.id
    updated_at  timestamp NOT NULL DEFAULT current_timestamp,
    CONSTRAINT ck_period_target_pct CHECK (target_pct BETWEEN 1 AND 100)
);

-- QUÉ MATERIAS (NRC) VALORAN CADA SO PROGRAMADO.
-- El coordinador, al programar "SO 2 en 202660", le asigna los NRC que lo
-- miden. Sin esta tabla no se sabe qué debe valorar cada profesor.
CREATE TABLE schedule_subjects (
    id          serial  PRIMARY KEY,
    schedule_id integer NOT NULL REFERENCES so_schedule(id) ON DELETE CASCADE,
    subjects_id integer NOT NULL,   -- cross-service -> users_db.subjects.nrc
    CONSTRAINT uq_schedule_subject UNIQUE (schedule_id, subjects_id)
);

-- EVIDENCIA (funcionalidad futura, estructura lista).
-- Se cuelga del estudiante en un NRC para una programación: un solo archivo
-- sirve para valorar varios indicadores. NO se cuelga de la rúbrica.
CREATE TABLE evidence (
    id          serial       PRIMARY KEY,
    schedule_id integer      NOT NULL REFERENCES so_schedule(id) ON DELETE CASCADE,
    subjects_id integer      NOT NULL,   -- cross-service (NRC)
    student_id  integer      NOT NULL,   -- cross-service (students.id)
    name        varchar(255) NOT NULL,
    file_url    varchar(500) NOT NULL,   -- ruta o URL en el almacenamiento (OneDrive, blob, etc.)
    mime_type   varchar(100),            -- application/pdf, video/mp4, image/jpeg...
    uploaded_by integer      NOT NULL,   -- cross-service (users.id, el profesor)
    created_at  timestamp    NOT NULL DEFAULT current_timestamp,
    -- Necesaria para la FK compuesta desde rubric (ver abajo)
    CONSTRAINT uq_evidence_ctx UNIQUE (schedule_id, subjects_id, student_id, id)
);

-- VALORACIÓN: el profesor califica a un estudiante en un indicador
CREATE TABLE rubric (
    id                serial       PRIMARY KEY,
    schedule_id       integer      NOT NULL REFERENCES so_schedule(id) ON DELETE CASCADE,
    evaluator_user_id integer      NOT NULL,   -- cross-service -> users_db.users.id (profesor)
    student_id        integer      NOT NULL,   -- cross-service -> users_db.students.id
    subjects_id       integer      NOT NULL,   -- cross-service -> users_db.subjects.nrc
    performance_id    varchar(3)   NOT NULL,
    level_id          varchar(100) NOT NULL,
    evidence_id       integer,                   -- opcional
    created_at        timestamp    NOT NULL DEFAULT current_timestamp,
    CONSTRAINT fk_rubric_level
        FOREIGN KEY (performance_id, level_id)
        REFERENCES level(performance_id, id) ON DELETE CASCADE,
    -- Garantiza que la evidencia enlazada sea del MISMO estudiante, NRC y
    -- programación que la rúbrica. Sin esto sería redundancia sin control.
    CONSTRAINT fk_rubric_evidence
        FOREIGN KEY (schedule_id, subjects_id, student_id, evidence_id)
        REFERENCES evidence(schedule_id, subjects_id, student_id, id)
        ON DELETE SET NULL (evidence_id),   -- SOLO evidence_id; las otras 3 son NOT NULL
    CONSTRAINT uq_rubric
        UNIQUE (schedule_id, student_id, subjects_id, performance_id)
);

CREATE INDEX idx_perf_so       ON performance(so_id);
CREATE INDEX idx_level_perf    ON level(performance_id);
CREATE INDEX idx_sched_period  ON so_schedule(period_id);
CREATE INDEX idx_rubric_sched  ON rubric(schedule_id);
CREATE INDEX idx_rubric_eval   ON rubric(evaluator_user_id);
CREATE INDEX idx_rubric_stud   ON rubric(student_id);
CREATE INDEX idx_schsub_subject ON schedule_subjects(subjects_id);
CREATE INDEX idx_evid_student  ON evidence(student_id, subjects_id);
CREATE INDEX idx_rubric_subj   ON rubric(subjects_id);

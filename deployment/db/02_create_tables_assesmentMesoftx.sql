/connect assesment_mesoftx_db;

create table if not exists student_outcomes (
    id serial primary key,
    code varchar(255) not null unique,
    description text
);

create table if not exists performance_indicators (
    id serial primary key,
    code varchar(255) not null unique,
    name text
);

create table if not exists performance_indicator_details (
    id serial primary key,
    performance_indicator_id integer not null,
    student_outcome_id integer not null,
    description text not null
);

create table if not exists performance_evaluations (
    id serial primary key,
    evaluation_value varchar(255) not null
);

create table if not exists performance_evaluation_details (
    id serial primary key,
    performance_evaluation_id integer not null,
    performance_indicator_id integer not null,
    student_outcome_id integer not null,
    description text not null
);

create table if not exists assesment_evidence (
    id serial primary key,
    evidence_name_doc text not null,
    student_code varchar(25) not null,
    student_outcome_id integer not null,
    created_at timestamp default current_timestamp
);

create table if not exists assesment_results (
    id serial primary key,
    subject_code varchar(25) not null,
    assesment_evidence_id integer not null,
    student_outcome_id integer not null,
    performance_evaluation_detail_id integer not null,
    created_at timestamp default current_timestamp
);


alter table performance_indicator_details
    add constraint fk_PI_details_PI
    foreign key (performance_indicator_id) references performance_indicators(id);

alter table performance_indicator_details
    add constraint fk_PI_details_SO
    foreign key (student_outcome_id) references student_outcomes(id);

alter table performance_evaluation_details
    add constraint fk_PE_details_PE
    foreign key (performance_evaluation_id) references performance_evaluations(id);

alter table performance_evaluation_details
    add constraint fk_PE_details_PI
    foreign key (performance_indicator_id) references performance_indicators(id);

alter table performance_evaluation_details
    add constraint fk_PE_details_SO
    foreign key (student_outcome_id) references student_outcomes(id);

alter table assesment_evidence
    add constraint fk_assesment_evidence_SO
    foreign key (student_outcome_id) references student_outcomes(id);

alter table assesment_results
    add constraint fk_assesment_results_evidence
    foreign key (assesment_evidence_id) references assesment_evidence(id);

alter table assesment_results
    add constraint fk_assesment_results_SO
    foreign key (student_outcome_id) references student_outcomes(id);

alter table assesment_results
    add constraint fk_assesment_results_PE_details
    foreign key (performance_evaluation_detail_id) references performance_evaluation_details(id);

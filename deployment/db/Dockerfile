FROM postgres:16-alpine

LABEL org.opencontainers.image.title="MesoftX PostgreSQL"
LABEL org.opencontainers.image.description="PostgreSQL image initialized with MesoftX database scripts."

ENV POSTGRES_DB=postgres

COPY scripts/*.sql /docker-entrypoint-initdb.d/

RUN chown -R postgres:postgres /docker-entrypoint-initdb.d/*.sql \
    && chmod 400 /docker-entrypoint-initdb.d/*.sql

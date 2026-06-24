FROM postgres:16-alpine

LABEL org.opencontainers.image.title="MesoftX PostgreSQL"
LABEL org.opencontainers.image.description="PostgreSQL image initialized with MesoftX database scripts."

ENV POSTGRES_DB=postgres

COPY scripts /opt/mesoftx-db/scripts
COPY init/00_init_mesoftx.sh /docker-entrypoint-initdb.d/00_init_mesoftx.sh

RUN chown -R postgres:postgres /opt/mesoftx-db /docker-entrypoint-initdb.d/00_init_mesoftx.sh \
    && chmod 500 /docker-entrypoint-initdb.d/00_init_mesoftx.sh \
    && chmod -R 400 /opt/mesoftx-db/scripts/*.sql

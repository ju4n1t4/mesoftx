"""Catálogo de roles del sistema.

Los identificadores corresponden al orden de inserción en el script de datos
iniciales (deployment/db/scripts/04_insert_data_usersDb.sql), donde los roles se
crean como: Admin, Coordinador, Docente.
"""


class Role:
    ADMIN = 1
    COORDINADOR = 2
    DOCENTE = 3

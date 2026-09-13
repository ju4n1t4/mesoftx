"""Catálogo de roles del sistema.

La identidad y el catálogo de roles viven en User_MS. Estos identificadores
reflejan el orden de inserción en deployment/db/scripts/04_insert_data_usersDb.sql
(Admin, Coordinador, Docente) y se usan aquí para autorizar por rol a partir del
claim ``role_id`` que transporta el JWT emitido por User_MS.
"""


class Role:
    ADMIN = 1
    COORDINADOR = 2
    DOCENTE = 3

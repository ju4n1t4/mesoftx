"""
Prepara el modo exposición: crea (si faltan) los perfiles Coordinador / Profesor / Auditor con los
permisos recomendados y una cuenta de demostración por perfil. Las cuentas llevan una contraseña
aleatoria que nadie conoce: solo se usan mediante POST /auth/demo-login cuando DEMO_MODE=true.

    docker compose exec user-ms python -m app.tools.seed_demo --program-id ISI

--program-id es el programa académico del Profesor de demostración (debe existir).
Es idempotente: se puede ejecutar varias veces. Con --remove borra las cuentas de demostración.
No modifica perfiles que ya existan (respeta los permisos que usted haya definido).
"""
import argparse
import secrets
import sys

from app.core.demo_accounts import DEMO_ROLES, demo_email
from app.infrastructure.database.session import SessionLocal
from app.infrastructure.repositories.sqlalchemy_repositories import (
    PermissionRepository, ProgramRepository, RoleRepository, UserRepository,
)
from app.infrastructure.security.password_service import hash_password

TEACHER = ["MY_COURSES_VIEW", "STUDENT_UPLOAD", "SO_TO_ASSESS_VIEW", "RUBRIC_VIEW", "RUBRIC_FILL",
           "EVIDENCE_UPLOAD", "INDICATOR_VIEW", "INDICATOR_CHART"]
AUDITOR = ["DASHBOARD_PROGRAM", "DASHBOARD_TEACHER", "DASHBOARD_SO", "INDICATOR_VIEW", "INDICATOR_CHART",
           "RUBRIC_VIEW", "SO_TO_ASSESS_VIEW"]
COORDINATOR = ["TEACHER_CRUD", "PROGRAM_CRUD", "SUBJECT_CRUD", "SO_CRUD", "SO_SCHEDULE_MANAGE",
               "DASHBOARD_PROGRAM", "DASHBOARD_TEACHER", "DASHBOARD_SO", "INDICATOR_VIEW", "INDICATOR_CHART",
               "RUBRIC_VIEW", "SO_TO_ASSESS_VIEW", "STUDENT_UPLOAD"]
PERMS = {"Coordinador": COORDINATOR, "Profesor": TEACHER, "Auditor": AUDITOR}
NAMES = {"administrativo": "Demo Administrativo", "coordinador": "Demo Coordinador",
         "profesor": "Demo Profesor", "auditor": "Demo Auditor"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--program-id", help="Programa del profesor de demostración (p. ej. ISI)")
    ap.add_argument("--remove", action="store_true", help="Elimina las cuentas de demostración")
    args = ap.parse_args()

    with SessionLocal() as db:
        users, roles, perms = UserRepository(db), RoleRepository(db), PermissionRepository(db)

        if args.remove:
            for key in DEMO_ROLES:
                u = users.get_by_email(demo_email(key))
                if u:
                    users.delete(u.id)
                    print(f"Eliminada {demo_email(key)}")
            return 0

        programs = [p.id for p in ProgramRepository(db).list_all()]
        if not args.program_id or args.program_id not in programs:
            print("Indique --program-id con un programa existente. Programas disponibles:", programs or "ninguno (créelo primero)")
            return 1

        if not roles.get_by_name("Administrativo"):
            print("Falta el perfil Administrativo: ejecute primero los scripts SQL de deployment/db.")
            return 1

        # Preflight prevents silently reusing a reserved identity with the wrong profile.
        by_document = {user.document_number: user for user in users.list_all()}
        for i, (key, role_name) in enumerate(DEMO_ROLES.items(), start=1):
            user = users.get_by_email(demo_email(key))
            collision = by_document.get(f"DEMO{i:03d}")
            if (user and (user.role.name != role_name or not user.active)) or (collision and collision.email != demo_email(key)):
                print("Identidad de demostración en conflicto; revise las cuentas reservadas antes de continuar.")
                return 1
            if key == "profesor" and user and user.program_id != args.program_id:
                print("El profesor demo ya pertenece a otro programa; no se modifica su alcance automáticamente.")
                return 1

        for role_name, codes in PERMS.items():
            if roles.get_by_name(role_name):
                print(f"Perfil {role_name}: ya existe (no se modifica)")
                continue
            role = roles.create({"name": role_name})
            roles.set_permissions(role.id, perms.ids_for_codes(codes))
            print(f"Perfil {role_name}: creado con {len(codes)} permisos")

        for i, (key, role_name) in enumerate(DEMO_ROLES.items(), start=1):
            email = demo_email(key)
            if users.get_by_email(email):
                print(f"Cuenta {email}: ya existe")
                continue
            role = roles.get_by_name(role_name)
            users.create_user({
                "document_number": f"DEMO{i:03d}",
                "name": NAMES[key],
                "email": email,
                "password": hash_password(secrets.token_urlsafe(48)),   # nadie la conoce
                "active": True,
                "role_id": role.id,
                "program_id": args.program_id if key == "profesor" else None,
            })
            print(f"Cuenta {email}: creada")
    print("Listo. Active el modo exposición con DEMO_MODE=true y reinicie user-ms.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

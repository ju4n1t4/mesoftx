"""Re-encrypt stored credentials with the current external key, retaining all records."""
from sqlalchemy import select

from app.core.config import get_settings
from app.infrastructure.database.integration_models import IntegrationConnectionModel
from app.infrastructure.database import models  # register users foreign keys in shared metadata
from app.infrastructure.database.session import SessionLocal
from app.infrastructure.security.integration_vault import FernetSecretVault


def main() -> int:
    settings = get_settings()
    vault = FernetSecretVault(settings.integrations_encryption_key,
        [key.strip() for key in settings.integrations_previous_keys.split(',') if key.strip()])
    with SessionLocal() as db:
        rows = db.scalars(select(IntegrationConnectionModel).where(
            IntegrationConnectionModel.encrypted_secret.is_not(None)).with_for_update()).all()
        try:
            for row in rows:
                row.encrypted_secret = vault.encrypt(vault.decrypt(row.encrypted_secret))
            db.commit()
        except Exception:
            db.rollback()
            raise
    print(f'Credentials rotated: {len(rows)}. No secrets were printed.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())

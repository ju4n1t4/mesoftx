"""Provider-neutral synchronization; all persistence goes through an application port."""
from typing import Any

from app.application.ports.errors import ApplicationError, EntityNotFoundError
from app.application.ports.integrations import ExternalJsonClient, IntegrationRepository, SecretVault

class IntegrationService:
    def __init__(self, repository: IntegrationRepository, vault: SecretVault, client: ExternalJsonClient):
        self.repository, self.vault, self.client = repository, vault, client

    def get(self, connection_id: int) -> Any:
        connection = self.repository.get_connection(connection_id)
        if connection is None:
            raise EntityNotFoundError('Connection not found.')
        return connection

    def save(self, data: dict[str, Any], connection_id: int | None = None) -> Any:
        existing = self.get(connection_id) if connection_id is not None else None
        self.client.validate_url(data.get('base_url', existing.base_url if existing else ''),
            data.get('resource_path', existing.resource_path if existing else '/'))
        secret = data.pop('secret', None)
        if secret is not None:
            data['encrypted_secret'] = self.vault.encrypt(secret) if secret else None
        auth_type = data.get('auth_type', existing.auth_type if existing else 'none')
        configured = data.get('encrypted_secret', existing.encrypted_secret if existing else None)
        if auth_type != 'none' and not configured:
            raise ApplicationError('invalid', 'This authentication type requires a credential.')
        if auth_type == 'none':
            data['encrypted_secret'] = None
        return self.repository.save_connection(data, connection_id)

    async def probe(self, connection_id: int) -> dict[str, bool]:
        connection = self.get(connection_id)
        secret = self.vault.decrypt(connection.encrypted_secret) if connection.encrypted_secret else None
        await self.client.fetch(connection, secret)
        return {'reachable': True}

    async def sync(self, connection_id: int, key: str, actor_id: int) -> Any:
        connection = self.get(connection_id)
        if not connection.enabled:
            raise ApplicationError('conflict', 'Connection is disabled.')
        run, replay = self.repository.start_run(connection_id, key, actor_id)
        if replay:
            return run
        try:
            secret = self.vault.decrypt(connection.encrypted_secret) if connection.encrypted_secret else None
            payload = await self.client.fetch(connection, secret)
            for field in filter(None, connection.records_path.split('.')):
                if not isinstance(payload, dict) or field not in payload:
                    raise ApplicationError('invalid_response', 'Configured records path was not found.')
                payload = payload[field]
            if not isinstance(payload, list) or len(payload) > 10000:
                raise ApplicationError('invalid_response', 'Expected a JSON array with at most 10000 records.')
            records: list[tuple[str, dict[str, Any]]] = []
            seen: set[str] = set()
            for record in payload:
                if not isinstance(record, dict):
                    raise ApplicationError('invalid_response', 'Each record must be an object.')
                value = record.get(connection.external_id_field)
                if isinstance(value, bool) or not isinstance(value, (str, int)) or not str(value) or len(str(value)) > 255:
                    raise ApplicationError('invalid_response', 'Each record needs a stable external identifier.')
                identifier = str(value)
                if identifier in seen:
                    raise ApplicationError('invalid_response', 'Duplicate external identifiers in response.')
                seen.add(identifier)
                records.append((identifier, record))
            return self.repository.finish_run(run.id, records)
        except ApplicationError as exc:
            self.repository.fail_run(run.id, exc.code)
            raise
        except Exception as exc:
            # Never persist transport exceptions: their message may contain URLs, headers or secrets.
            self.repository.fail_run(run.id, 'synchronization_failed')
            raise ApplicationError('unavailable', 'Synchronization failed; consult the run status.') from exc

import ipaddress
import json
import socket
from urllib.parse import urlsplit

import httpx

from app.application.ports.errors import ApplicationError

class HttpExternalJsonClient:
    """Only operator-allowlisted HTTPS origins; redirects and environment proxies are disabled."""
    def __init__(self, allowed_hosts: list[str]):
        self.allowed_hosts = {host.lower() for host in allowed_hosts}

    def validate_url(self, base_url: str, resource_path: str) -> str:
        try:
            parts = urlsplit(base_url)
            port = parts.port
        except ValueError as exc:
            raise ApplicationError('invalid', 'Invalid external origin.') from exc
        if (parts.scheme != 'https' or not parts.hostname or parts.hostname.lower() not in self.allowed_hosts
            or parts.username or parts.password or parts.query or parts.fragment or port not in (None, 443)):
            raise ApplicationError('invalid', 'Use an HTTPS origin on the server allowlist.')
        if parts.path not in ('', '/') or not resource_path.startswith('/') or resource_path.startswith('//') or '\\' in resource_path:
            raise ApplicationError('invalid', 'Use an origin and a separate relative resource path.')
        resource = urlsplit(resource_path)
        if resource.scheme or resource.netloc or resource.fragment or resource.query:
            raise ApplicationError('invalid', 'Resource paths cannot contain an origin, query or fragment.')
        return base_url.rstrip('/') + resource_path

    async def fetch(self, connection, secret: str | None):
        url = self.validate_url(connection.base_url, connection.resource_path)
        host = urlsplit(url).hostname
        addresses = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
        if not addresses or any(not ipaddress.ip_address(address[4][0]).is_global for address in addresses):
            raise ApplicationError('invalid', 'The external host must resolve to public addresses.')
        headers = {'Accept': 'application/json'}
        if connection.auth_type == 'bearer':
            headers['Authorization'] = f'Bearer {secret}'
        elif connection.auth_type == 'api_key':
            headers['X-API-Key'] = secret or ''
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=False, trust_env=False,
                transport=httpx.AsyncHTTPTransport(retries=1)) as client:
                async with client.stream('GET', url, headers=headers) as response:
                    response.raise_for_status()
                    if response.is_redirect:
                        raise ApplicationError('invalid_response', 'Redirects are not accepted.')
                    body = bytearray()
                    async for chunk in response.aiter_bytes():
                        body.extend(chunk)
                        if len(body) > 2 * 1024 * 1024:
                            raise ApplicationError('invalid_response', 'External response exceeds 2 MB.')
                    return json.loads(body)
        except (httpx.HTTPError, ValueError) as exc:
            raise ApplicationError('unavailable', 'External provider failed or returned invalid JSON.') from exc

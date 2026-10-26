"""Anna Executa Python SDK — Platform Credentials (multi-account) support.

`CredentialsClient` lets an Executa plugin issue reverse JSON-RPC requests
for ``credentials/listAccounts`` and ``credentials/getToken`` to its host
Agent — the Agent proxies to Nexus's
``/api/v1/executa/credentials/{accounts,token}`` endpoints using a
short-lived ``credentials_token`` (aud=executa-credentials) the host minted
at invoke time.

Authorization model (design ``platform-credentials-multi-account.md`` §7.2):
the host mints the token only when the plugin's manifest declares a
``credentials`` name (e.g. ``GOOGLE_ACCESS_TOKEN``) that maps to an OAuth
provider; the token's ``providers`` claim whitelists exactly those provider
ids. The user must have authorized the provider on the platform's unified
authorizations page.

Multi-account pattern::

    from executa_sdk import CredentialsClient, CredentialsError

    creds = CredentialsClient()
    # 1. Discover accounts (metadata only — never tokens)
    out = await creds.list_accounts(provider="google")
    # out = {"accounts": [{"account_id": "...", "email": "...",
    #                      "is_default": True, "status": "active", ...}]}

    # 2. Exchange for a short-lived access_token, per account
    tok = await creds.get_token(provider="google", account_id=out["accounts"][1]["account_id"])
    # tok = {"access_token": "ya29....", "account_id": "...",
    #        "expires_at": "2026-07-09T12:34:56"}

Tools that declare ``"multi_account": true`` in their manifest receive an
optional ``account`` argument injected by the platform; pass it through as
``account_id`` here (an email also works if you resolve it against
``list_accounts`` first).

Transport-compatible with the other clients: register in one
:func:`make_response_router` call.

Error codes — keep in sync with ``matrix/src/executa/credentials.py``::

    CREDENTIALS_ERR_NOT_GRANTED     = -32061
    CREDENTIALS_ERR_INVALID_REQUEST = -32062
    CREDENTIALS_ERR_UPSTREAM        = -32063
"""

from __future__ import annotations

import asyncio
import threading
import uuid
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional

from .context import attach_invoke_context
from .sampling import _write_frame

# ─── Method names — keep in sync with matrix/src/executa/protocol.py ──

METHOD_CREDENTIALS_LIST_ACCOUNTS = "credentials/listAccounts"
METHOD_CREDENTIALS_GET_TOKEN = "credentials/getToken"


# ─── Error codes ──────────────────────────────────────────────────────

CREDENTIALS_ERR_NOT_GRANTED = -32061
CREDENTIALS_ERR_INVALID_REQUEST = -32062
CREDENTIALS_ERR_UPSTREAM = -32063
CREDENTIALS_ERR_TIMEOUT = -32064  # SDK-local: generated when await times out


class CredentialsError(Exception):
    """Wraps a JSON-RPC error returned by the host for ``credentials/*``."""

    def __init__(self, code: int, message: str, data: Optional[dict] = None):
        super().__init__(f"[{code}] {message}")
        self.code = code
        self.message = message
        self.data = data or {}


@dataclass
class _Pending:
    future: "asyncio.Future[dict]"


class CredentialsClient:
    """Reverse-RPC client for platform-credentials multi-account access.

    Like the other clients, you must register a stdin reader that calls
    :meth:`dispatch_response` (or use :func:`make_response_router`).
    """

    DEFAULT_TIMEOUT = 30.0

    def __init__(
        self,
        *,
        write_frame: Callable[[dict], None] | None = None,
    ) -> None:
        self._write_frame = write_frame or _write_frame
        self._pending: Dict[str, _Pending] = {}
        self._lock = threading.Lock()
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._disabled_reason: Optional[str] = None

    # — public wiring —

    def disable(self, reason: str) -> None:
        """Mark credentials namespace as unavailable."""
        self._disabled_reason = reason

    def dispatch_response(self, msg: dict) -> bool:
        if not isinstance(msg, dict) or "method" in msg:
            return False
        req_id = msg.get("id")
        if req_id is None:
            return False
        with self._lock:
            pending = self._pending.pop(req_id, None)
        if pending is None:
            return False
        loop = self._loop
        if loop is None or pending.future.done():
            return True

        def _resolve():
            if pending.future.done():
                return
            err = msg.get("error")
            if err:
                pending.future.set_exception(
                    CredentialsError(
                        code=int(err.get("code", -32603)),
                        message=str(err.get("message", "unknown error")),
                        data=err.get("data"),
                    )
                )
            else:
                pending.future.set_result(msg.get("result") or {})

        try:
            loop.call_soon_threadsafe(_resolve)
        except RuntimeError:
            _resolve()
        return True

    # — public API —

    async def list_accounts(
        self,
        *,
        provider: str,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> dict:
        """List the user's authorized accounts for ``provider``.

        Returns metadata only — never tokens::

            {"accounts": [
                {"account_id": "1069...", "email": "work@company.com",
                 "label": "work@company.com", "is_default": True,
                 "status": "active", "scopes": ["gmail.readonly", ...]},
                ...
            ]}
        """
        return await self._call(
            METHOD_CREDENTIALS_LIST_ACCOUNTS, {"provider": provider}, timeout
        )

    async def get_token(
        self,
        *,
        provider: str,
        account_id: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> dict:
        """Exchange for a short-lived access_token of one account.

        ``account_id`` omitted → the user's default account. Returns::

            {"access_token": "ya29....", "account_id": "1069...",
             "expires_at": "2026-07-09T12:34:56"}

        Raises :class:`CredentialsError` — ``CREDENTIALS_ERR_NOT_GRANTED``
        when the provider is not covered by this invoke, the account does
        not exist, or the credential needs re-authorization.
        """
        params: Dict[str, Any] = {"provider": provider}
        if account_id is not None:
            params["account_id"] = account_id
        return await self._call(METHOD_CREDENTIALS_GET_TOKEN, params, timeout)

    # — internal —

    async def _call(self, method: str, params: dict, timeout: float) -> dict:
        if self._disabled_reason:
            raise CredentialsError(CREDENTIALS_ERR_NOT_GRANTED, self._disabled_reason)
        loop = asyncio.get_running_loop()
        self._loop = loop
        req_id = uuid.uuid4().hex
        future: asyncio.Future[dict] = loop.create_future()
        with self._lock:
            self._pending[req_id] = _Pending(future=future)

        envelope = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": method,
            "params": attach_invoke_context(params),
        }
        try:
            self._write_frame(envelope)
        except Exception:
            with self._lock:
                self._pending.pop(req_id, None)
            raise

        try:
            return await asyncio.wait_for(future, timeout=timeout)
        except asyncio.TimeoutError:
            with self._lock:
                self._pending.pop(req_id, None)
            raise CredentialsError(
                CREDENTIALS_ERR_TIMEOUT,
                f"{method} timed out after {timeout}s",
            )


__all__ = [
    "CredentialsClient",
    "CredentialsError",
    "METHOD_CREDENTIALS_LIST_ACCOUNTS",
    "METHOD_CREDENTIALS_GET_TOKEN",
    "CREDENTIALS_ERR_NOT_GRANTED",
    "CREDENTIALS_ERR_INVALID_REQUEST",
    "CREDENTIALS_ERR_UPSTREAM",
    "CREDENTIALS_ERR_TIMEOUT",
]

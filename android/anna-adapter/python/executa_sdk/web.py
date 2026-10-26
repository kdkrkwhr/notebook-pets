"""Anna Executa Python SDK — Web Search & Fetch support

``WebClient`` 让一个长时间运行的 Executa 插件向其 host Agent 发起反向
JSON-RPC ``web/search`` / ``web/fetch``，由 host 完成搜索 / 网页抽取并
把结果回送。

为什么这样设计：
- Plugin **不需要**自己的搜索 API key —— provider 路由 / SSRF 防护 /
  配额 / 计费 / 审计都由 host (Anna) 持有。
- 响应 schema 与 provider 无关（``search_depth`` 是质量意图而非
  provider 选择）；plugin 永远看不到 provider 差异。
- stdio 通道预算收紧：fetch 默认 8,000 字符/页、单响应 256 KB。

线程模型与 :class:`SamplingClient` / :class:`EmbeddingsClient` 完全一致：
- plugin stdin reader 必须把所有"无 method"的帧调度到
  :meth:`WebClient.dispatch_response`
- 单个 WebClient 实例即可（多路复用所有未决请求）

Wire format 见 ``matrix-nexus/docs/design/app-web-search.md`` §2 / §4。
"""

from __future__ import annotations

import asyncio
import threading
import uuid
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Sequence

# 复用 sampling 模块里已经实现的帧写出（保持单一来源，避免格式漂移）
from .context import attach_invoke_context
from .sampling import _write_frame


# ─── 与 matrix/src/executa/protocol.py 同步 ───────────────────────────

METHOD_WEB_SEARCH = "web/search"
METHOD_WEB_FETCH = "web/fetch"
# Phase 2（app-web-search.md §2.3 / §2.4）
METHOD_WEB_IMAGE_SEARCH = "web/image_search"
METHOD_WEB_IMAGE_FETCH = "web/image_fetch"

WEB_ERR_NOT_GRANTED = -32521
WEB_ERR_QUOTA_EXCEEDED = -32522
WEB_ERR_PROVIDER_ERROR = -32523
WEB_ERR_INVALID_REQUEST = -32524
WEB_ERR_TIMEOUT = -32525
WEB_ERR_NOT_NEGOTIATED = -32526
WEB_ERR_USER_DENIED = -32527
WEB_ERR_TOKEN_EXPIRED = -32528


class WebError(Exception):
    """host 返回的 JSON-RPC error 包装。"""

    def __init__(self, code: int, message: str, data: Optional[dict] = None):
        super().__init__(f"[{code}] {message}")
        self.code = code
        self.message = message
        self.data = data or {}


@dataclass
class _Pending:
    future: "asyncio.Future[dict]"


class WebClient:
    """向 host 发起反向 ``web/search`` / ``web/fetch`` 的客户端。

    用法：

        client = WebClient()

        # 在 plugin stdin reader 中：
        async def on_stdin_message(msg):
            if client.is_response_envelope(msg):
                client.dispatch_response(msg)
                return
            # ... 处理普通 invoke 等

        # 在 tool handler 内：
        found = await client.search(query="anna ai platform", max_results=5)
        for r in found["results"]:
            print(r["title"], r["url"])

        pages = await client.fetch(urls=[found["results"][0]["url"]])
        print(pages["pages"][0]["content"])
    """

    def __init__(self, *, write_frame: Callable[[dict], None] | None = None) -> None:
        self._write_frame = write_frame or _write_frame
        self._pending: Dict[str, _Pending] = {}
        self._lock = threading.Lock()
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._disabled_reason: Optional[str] = None

    # — 调用 —

    async def search(
        self,
        *,
        query: str,
        max_results: Optional[int] = None,
        search_depth: Optional[str] = None,  # "basic" | "advanced"
        topic: Optional[str] = None,  # "general" | "news"
        time_range: Optional[str] = None,  # "day" | "week" | "month" | "year"
        region: Optional[str] = None,
        include_domains: Optional[Sequence[str]] = None,
        exclude_domains: Optional[Sequence[str]] = None,
        timeout: float = 30.0,
    ) -> dict:
        """网页搜索（需要 manifest 声明 ``host_capabilities: ["web.search"]``
        且用户在 Permissions 面板开启 Web 授权）。

        Returns:
            ``{"results": [{"title","url","snippet","site",
              "published_at?","score?"}], "provider_tier": "basic|advanced",
              "quota_consumed": <CU>}``

        Raises:
            WebError: host 返回 JSON-RPC error 时（如 -32521 未授权 /
                -32522 CU 配额耗尽 / -32523 provider 全挂）
        """
        if not isinstance(query, str) or not query.strip():
            raise ValueError("query must be a non-empty string")
        params: Dict[str, Any] = {"query": query}
        if max_results is not None:
            params["max_results"] = int(max_results)
        if search_depth is not None:
            params["search_depth"] = search_depth
        if topic is not None:
            params["topic"] = topic
        if time_range is not None:
            params["time_range"] = time_range
        if region is not None:
            params["region"] = region
        if include_domains:
            params["include_domains"] = list(include_domains)
        if exclude_domains:
            params["exclude_domains"] = list(exclude_domains)
        return await self._request(METHOD_WEB_SEARCH, params, timeout=timeout)

    async def fetch(
        self,
        *,
        urls: Sequence[str],
        format: Optional[str] = None,  # "markdown" | "text"
        max_chars: Optional[int] = None,
        timeout_ms: Optional[int] = None,
        timeout: float = 90.0,
    ) -> dict:
        """网页抽取（需要 ``host_capabilities: ["web.fetch"]`` + 用户授权）。

        per-URL 失败隔离：整体调用成功时逐页检查 ``pages[i].ok``。
        stdio 通道预算：每页默认 8,000 字符、单响应 256 KB（超限截断
        并标记 ``truncated`` / ``RESPONSE_BUDGET_EXCEEDED``）。

        Returns:
            ``{"pages": [{"url","final_url?","ok","title?","content?",
              "truncated?","error?"}], "quota_consumed": <CU>}``
        """
        if not urls:
            raise ValueError("urls must be a non-empty sequence")
        items: List[str] = list(urls)
        params: Dict[str, Any] = {"urls": items}
        if format is not None:
            params["format"] = format
        if max_chars is not None:
            params["max_chars"] = int(max_chars)
        if timeout_ms is not None:
            params["timeout_ms"] = int(timeout_ms)
        return await self._request(METHOD_WEB_FETCH, params, timeout=timeout)

    async def image_search(
        self,
        *,
        query: str,
        max_results: Optional[int] = None,
        min_width: Optional[int] = None,
        min_height: Optional[int] = None,
        aspect: Optional[str] = None,  # "any" | "wide" | "tall" | "square"
        timeout: float = 30.0,
    ) -> dict:
        """图片搜索（需 ``host_capabilities: ["web.image_search"]`` +
        用户开启 ``web_grant.allowImageSearch``，默认关）。

        safe_search 由平台强制开启，无法关闭。``license_hint`` 是
        best-effort 透传 —— 平台不做版权担保。

        Returns:
            ``{"results": [{"image_url","thumbnail_url?","source_url",
              "title?","width?","height?","mime_type?","license_hint?"}],
              "quota_consumed": <CU>, "cached?": bool}``
        """
        if not isinstance(query, str) or not query.strip():
            raise ValueError("query must be a non-empty string")
        params: Dict[str, Any] = {"query": query}
        if max_results is not None:
            params["max_results"] = int(max_results)
        if min_width is not None:
            params["min_width"] = int(min_width)
        if min_height is not None:
            params["min_height"] = int(min_height)
        if aspect is not None:
            params["aspect"] = aspect
        return await self._request(METHOD_WEB_IMAGE_SEARCH, params, timeout=timeout)

    async def image_fetch(
        self,
        *,
        url: str,
        max_bytes: Optional[int] = None,
        purpose: Optional[str] = None,
        timeout: float = 60.0,
    ) -> dict:
        """图片下载 → APS files 工件（需 ``web.image_fetch`` cap +
        ``web_grant.allowImageFetch``，默认关）。

        响应只回工件引用（``path`` + 短时效 ``get_url``），从不回字节 ——
        stdio 帧安全（§4.4）。产物计入工具的存储配额。

        Returns:
            ``{"path","get_url","mime_type","bytes_size","sha256",
              "source_url","final_url","quota_consumed"}``
        """
        if not isinstance(url, str) or not url.startswith(("http://", "https://")):
            raise ValueError("url must be an http(s) URL")
        params: Dict[str, Any] = {"url": url}
        if max_bytes is not None:
            params["max_bytes"] = int(max_bytes)
        if purpose is not None:
            params["purpose"] = purpose
        return await self._request(METHOD_WEB_IMAGE_FETCH, params, timeout=timeout)

    async def _request(self, method: str, params: dict, *, timeout: float) -> dict:
        if self._disabled_reason:
            raise WebError(WEB_ERR_NOT_NEGOTIATED, self._disabled_reason)

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
            raise WebError(
                WEB_ERR_TIMEOUT,
                f"{method} timed out after {timeout}s",
            )

    # — 协调 —

    def disable(self, reason: str) -> None:
        """标记 web 不可用（例如 host 未协商 v2 协议）。"""
        self._disabled_reason = reason

    def is_response_envelope(self, msg: dict) -> bool:
        if not isinstance(msg, dict):
            return False
        if "method" in msg:
            return False
        return "id" in msg and msg.get("id") in self._pending

    def dispatch_response(self, msg: dict) -> bool:
        """把 host 回来的响应 future-resolve 掉。返回是否处理。"""
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

        def _resolve() -> None:
            if pending.future.done():
                return
            err = msg.get("error")
            if err:
                pending.future.set_exception(
                    WebError(
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


__all__ = [
    "WebClient",
    "WebError",
    "METHOD_WEB_SEARCH",
    "METHOD_WEB_FETCH",
    "METHOD_WEB_IMAGE_SEARCH",
    "METHOD_WEB_IMAGE_FETCH",
    "WEB_ERR_NOT_GRANTED",
    "WEB_ERR_QUOTA_EXCEEDED",
    "WEB_ERR_PROVIDER_ERROR",
    "WEB_ERR_INVALID_REQUEST",
    "WEB_ERR_TIMEOUT",
    "WEB_ERR_NOT_NEGOTIATED",
    "WEB_ERR_USER_DENIED",
    "WEB_ERR_TOKEN_EXPIRED",
]

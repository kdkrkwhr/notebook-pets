"""Slow image work runs outside the game lock; failed evolution retains prior art."""
import copy
import os
from pathlib import Path
import struct
import tempfile
import zlib
import art
import engine
from runtime import GameError, atomic_write_json, store_lock, validate_user_id

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
MAX_IMAGE_BYTES = 20 * 1024 * 1024


def validate_png(data):
    if not isinstance(data, bytes) or not data.startswith(PNG_SIGNATURE) or len(data) > MAX_IMAGE_BYTES:
        raise GameError("invalid_image", "유효한 PNG 이미지가 아닙니다.")
    offset, seen_header, seen_pixels = 8, False, False
    while offset + 12 <= len(data):
        size = struct.unpack(">I", data[offset:offset + 4])[0]
        kind = data[offset + 4:offset + 8]
        end = offset + 12 + size
        if end > len(data):
            break
        body = data[offset + 8:offset + 8 + size]
        crc = struct.unpack(">I", data[offset + 8 + size:end])[0]
        if zlib.crc32(kind + body) & 0xffffffff != crc:
            break
        if not seen_header:
            if kind != b"IHDR" or size != 13:
                break
            width, height = struct.unpack(">II", body[:8])
            if not 1 <= width <= 4096 or not 1 <= height <= 4096:
                break
            seen_header = True
        if kind == b"IDAT":
            seen_pixels = True
        if kind == b"IEND" and size == 0 and end == len(data) and seen_header and seen_pixels:
            return data
        offset = end
    raise GameError("invalid_image", "이미지 파일이 손상되었거나 지원 범위를 벗어났습니다.")


def atomic_png(path, data):
    validate_png(data)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".image-", suffix=".tmp", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
        temporary = None
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


class ImageService:
    def __init__(self, provider=None, *, root=None, examples=None, attempts=3):
        self.provider = provider
        self.root = Path(root) if root else Path(engine.STATE_DIR).parent / "artwork"
        self.examples = Path(examples) if examples else art.ROOT / "assets/examples"
        if type(attempts) is not int or not 1 <= attempts <= 3:
            raise ValueError("attempts must be 1..3")
        self.attempts = attempts

    def current(self, actor_id, request):
        with store_lock(engine.STATE_DIR):
            allowed, _ = engine.access_check(actor_id)
            st = engine.load_state(actor_id) if allowed else None
            return st is not None and art.describe(st) == request

    def render(self, actor_id, request):
        """Synchronous worker API. Call from a background thread, never gateway loop."""
        try:
            validate_user_id(actor_id)
            if not isinstance(request, dict) or request.get("user_id") != actor_id or not self.current(actor_id, request):
                return {"status": "stale"}
            # Lock order is image lock -> short game lock, never the reverse.
            with store_lock(self.root / ".locks" / actor_id, timeout=0.1):
                return self._render_locked(actor_id, request)
        except GameError as exc:
            return {"status": "busy" if exc.code == "busy" else "unavailable", "code": exc.code}
        except OSError:
            return {"status": "unavailable", "code": "image_storage_error"}

    def _render_locked(self, actor_id, request):
        folder = self.root / actor_id / request["pet_id"] / request["revision"]
        previous = None
        for stage in range(1, request["stage"] + 1):
            if not self.current(actor_id, request):
                return {"status": "stale"}
            spec = copy.deepcopy(request)
            spec["stage"] = stage
            spec["branch"] = request["branch"] if stage == 4 else None
            spec["key"] = art.image_key(spec["species"], spec["element"], stage, spec["branch"])
            destination = folder / (spec["key"] + ".png")
            if destination.is_file():
                try:
                    validate_png(destination.read_bytes())
                    previous = destination
                    continue
                except GameError:
                    pass  # replace a corrupt cache only with a valid new image
            prompt = art.build_prompt(spec["species"], spec["element"], stage, spec["branch"], previous is not None)
            example = self.examples / (spec["key"] + ".png")
            failure = "image_unavailable"
            for _ in range(self.attempts):
                try:
                    if stage == 1 and example.is_file():
                        data = example.read_bytes()
                        provider_name = "curated-example"
                    elif self.provider is not None:
                        folder.mkdir(parents=True, exist_ok=True)
                        data = self.provider.generate(spec, prompt, previous, destination.with_suffix(".job.json"))
                        provider_name = self.provider.name
                    else:
                        raise GameError("provider_not_configured", "이미지 생성기가 설정되지 않았습니다.")
                    validate_png(data)
                    if not self.current(actor_id, request):
                        return {"status": "stale"}
                    atomic_png(destination, data)
                    atomic_write_json(destination.with_suffix(".json"), {
                        "request": spec, "prompt": prompt, "seed": art.image_seed(spec),
                        "reference": previous.name if previous else None, "provider": provider_name,
                    })
                    previous = destination
                    break
                except (GameError, OSError) as exc:
                    failure = exc.code if isinstance(exc, GameError) else "image_storage_error"
            else:
                if not self.current(actor_id, request):
                    return {"status": "stale"}
                result = {"status": "fallback" if previous else "unavailable", "code": failure,
                          "requested_stage": request["stage"], "stage": stage - 1}
                if previous:
                    result["path"] = str(previous.resolve())
                return result
        if not self.current(actor_id, request):
            return {"status": "stale"}
        return {"status": "ready", "path": str(previous.resolve()), "stage": request["stage"], "key": request["key"]}

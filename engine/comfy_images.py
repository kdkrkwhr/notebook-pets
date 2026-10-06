"""Standard-library ComfyUI text/image-to-image client with resumable jobs."""
import hashlib
import json
import math
import os
from pathlib import Path
import time
from urllib import error, parse, request
import uuid
import art
from image_service import MAX_IMAGE_BYTES, validate_png
from runtime import GameError, MISSING, atomic_write_json, read_json


def build_workflow(prompt, seed, *, reference_name=None, checkpoint=None, denoise=None, stage=1, species=None):
    settings = art.render_settings(stage, reference_name is not None, species)
    denoise = settings["denoise"] if denoise is None else denoise
    if not math.isfinite(denoise) or not 0 < denoise <= 1:
        raise ValueError("denoise must be > 0 and <= 1")
    wf = json.loads((art.ROOT / "tools/sd15_txt2img.json").read_text(encoding="utf-8"))
    wf.pop("_comment", None)
    wf["6"]["inputs"]["text"] = prompt
    wf["7"]["inputs"]["text"] = art.TEMPLATE["negative"]
    if species in art.TEMPLATE.get("species_negative", {}):
        wf["7"]["inputs"]["text"] += ", " + art.TEMPLATE["species_negative"][species]
    wf["3"]["inputs"]["seed"] = seed
    wf["3"]["inputs"].update(steps=settings["steps"], cfg=settings["cfg"],
                              sampler_name=settings["sampler"], scheduler=settings["scheduler"])
    wf["5"]["inputs"].update(width=settings["width"], height=settings["height"])
    wf["9"]["inputs"]["filename_prefix"] = "notebook-pets"
    if checkpoint:
        wf["4"]["inputs"]["ckpt_name"] = checkpoint
    if reference_name is not None:
        wf.pop("5")
        wf["10"] = {"class_type": "LoadImage", "inputs": {"image": reference_name}}
        wf["11"] = {"class_type": "ImageScale", "inputs": {
            "image": ["10", 0], "upscale_method": "bicubic", "width": settings["reference_size"], "height": settings["reference_size"], "crop": "disabled"}}
        wf["13"] = {"class_type": "EmptyImage", "inputs": {"width": settings["width"], "height": settings["height"], "batch_size": 1, "color": 16777215}}
        wf["14"] = {"class_type": "InvertMask", "inputs": {"mask": ["10", 1]}}
        pad = (settings["width"] - settings["reference_size"]) // 2
        wf["15"] = {"class_type": "ImageCompositeMasked", "inputs": {
            "destination": ["13", 0], "source": ["11", 0], "mask": ["14", 0],
            "x": pad, "y": pad, "resize_source": False}}
        wf["12"] = {"class_type": "VAEEncode", "inputs": {"pixels": ["15", 0], "vae": ["4", 2]}}
        wf["3"]["inputs"].update({"latent_image": ["12", 0], "denoise": denoise})
    return {"prompt": wf}


class ComfyUIProvider:
    name = "comfyui"

    def __init__(self, host=None, *, checkpoint=None, timeout=180, poll_interval=1, denoise=None):
        self.host = (host or os.environ.get("NOTEBOOK_COMFY_URL", "http://127.0.0.1:8188")).rstrip("/")
        url = parse.urlsplit(self.host)
        if url.scheme not in ("http", "https") or not url.netloc or url.username or url.query or url.fragment:
            raise ValueError("Invalid ComfyUI URL")
        self.checkpoint = checkpoint or os.environ.get("NOTEBOOK_COMFY_CHECKPOINT")
        if not math.isfinite(timeout) or timeout <= 0 or not math.isfinite(poll_interval) or poll_interval < 0:
            raise ValueError("Invalid timeout/poll interval")
        if denoise is not None and (not math.isfinite(denoise) or not 0 < denoise <= 1):
            raise ValueError("Invalid denoise")
        self.timeout, self.poll_interval, self.denoise = timeout, poll_interval, denoise

    def _http(self, route, data=None, content_type=None, *, binary=False, timeout=15):
        headers = {"Content-Type": content_type} if content_type else {}
        req = request.Request(self.host + route, data=data, headers=headers)
        try:
            with request.urlopen(req, timeout=timeout) as response:
                limit = MAX_IMAGE_BYTES if binary else 4 * 1024 * 1024
                body = response.read(limit + 1)
                if len(body) > limit:
                    raise GameError("image_response_too_large", "이미지 서버 응답이 너무 큽니다.")
            return body if binary else json.loads(body)
        except (error.URLError, TimeoutError, OSError) as exc:
            raise GameError("image_server_unavailable", "이미지 서버에 연결할 수 없습니다.") from exc
        except (ValueError, UnicodeError) as exc:
            raise GameError("invalid_image_response", "이미지 서버 응답을 확인해 주세요.") from exc

    def upload(self, reference):
        image = validate_png(Path(reference).read_bytes())
        filename = "notebook-" + hashlib.sha256(image).hexdigest()[:24] + ".png"
        boundary = "Notebook" + uuid.uuid4().hex
        body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{filename}\"\r\n"
                "Content-Type: image/png\r\n\r\n").encode() + image
        body += f"\r\n--{boundary}--\r\n".encode()
        result = self._http("/upload/image", body, "multipart/form-data; boundary=" + boundary)
        name = result.get("name") if isinstance(result, dict) else None
        subfolder = result.get("subfolder", "") if isinstance(result, dict) else ""
        if not isinstance(name, str) or not name or "/" in name or "\\" in name or name in (".", ".."):
            raise GameError("invalid_image_response", "업로드 결과가 올바르지 않습니다.")
        if not isinstance(subfolder, str) or subfolder.startswith(("/", "\\")) or ".." in subfolder or "\\" in subfolder:
            raise GameError("invalid_image_response", "업로드 폴더가 올바르지 않습니다.")
        return f"{subfolder}/{name}" if subfolder else name

    def generate(self, spec, prompt, reference, job_path):
        seed = art.image_seed(spec)
        reference_hash = hashlib.sha256(Path(reference).read_bytes()).hexdigest() if reference else None
        workflow_template_hash = hashlib.sha256((art.ROOT / "tools/sd15_txt2img.json").read_bytes()).hexdigest()
        fingerprint = hashlib.sha256(json.dumps([spec, prompt, reference_hash, self.host,
                                                self.checkpoint, self.denoise,
                                                art.render_settings(spec["stage"], reference is not None, spec["species"]),
                                                art.TEMPLATE["negative"], art.TEMPLATE.get("species_negative", {}).get(spec["species"]),
                                                workflow_template_hash], sort_keys=True).encode()).hexdigest()
        job = read_json(job_path)
        if job is MISSING:
            job = {}
        if not isinstance(job, dict):
            raise GameError("invalid_image_job", "이미지 작업 기록을 확인해 주세요.")
        if job.get("fingerprint") != fingerprint or job.get("state") == "failed":
            reference_name = self.upload(reference) if reference else None
            workflow = build_workflow(prompt, seed, reference_name=reference_name,
                                      checkpoint=self.checkpoint, denoise=self.denoise, stage=spec["stage"], species=spec["species"])
            result = self._http("/prompt", json.dumps(workflow).encode(), "application/json")
            prompt_id = result.get("prompt_id") if isinstance(result, dict) else None
            if not isinstance(prompt_id, str) or not prompt_id or result.get("node_errors"):
                raise GameError("image_workflow_rejected", "이미지 워크플로우를 실행할 수 없습니다.")
            job = {"fingerprint": fingerprint, "prompt_id": prompt_id, "state": "queued"}
            atomic_write_json(job_path, job)
        prompt_id = job.get("prompt_id")
        if not isinstance(prompt_id, str) or not prompt_id:
            raise GameError("invalid_image_job", "이미지 작업 ID가 없습니다.")
        deadline = time.monotonic() + self.timeout
        while time.monotonic() < deadline:
            remaining = max(0.01, deadline - time.monotonic())
            history = self._http("/history/" + parse.quote(prompt_id, safe=""), timeout=min(15, remaining))
            if not isinstance(history, dict):
                raise GameError("invalid_image_response", "이미지 작업 결과가 올바르지 않습니다.")
            entry = history.get(prompt_id)
            if entry is not None:
                if not isinstance(entry, dict):
                    raise GameError("invalid_image_response", "이미지 작업 결과가 올바르지 않습니다.")
                status = entry.get("status", {})
                outputs = entry.get("outputs", {})
                if not isinstance(status, dict) or not isinstance(outputs, dict) or not isinstance(outputs.get("9", {}), dict):
                    raise GameError("invalid_image_response", "이미지 작업 결과가 올바르지 않습니다.")
                if status.get("status_str") == "error":
                    job["state"] = "failed"
                    atomic_write_json(job_path, job)
                    raise GameError("image_generation_failed", "이미지 생성에 실패했습니다.")
                # Read our SaveImage node only, never an arbitrary preview output.
                images = outputs.get("9", {}).get("images", [])
                if not isinstance(images, list):
                    raise GameError("invalid_image_response", "이미지 목록이 올바르지 않습니다.")
                if images:
                    info = images[0]
                    if not isinstance(info, dict) or not isinstance(info.get("filename"), str):
                        raise GameError("invalid_image_response", "이미지 파일 정보가 올바르지 않습니다.")
                    query = parse.urlencode({"filename": info["filename"], "subfolder": info.get("subfolder", ""),
                                             "type": info.get("type", "output")})
                    data = validate_png(self._http("/view?" + query, binary=True))
                    job["state"] = "complete"
                    atomic_write_json(job_path, job)
                    return data
                if status.get("completed"):
                    job["state"] = "failed"
                    atomic_write_json(job_path, job)
                    raise GameError("image_missing_output", "완료된 작업에 이미지가 없습니다.")
            time.sleep(min(self.poll_interval, max(0, deadline - time.monotonic())))
        # Keep prompt_id so retry polls the same job instead of generating again.
        raise GameError("image_timeout", "이미지 생성이 진행 중입니다. 다음 요청에서 이어서 확인합니다.")

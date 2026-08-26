#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""생성된 512px 이미지를 4x-UltraSharp로 2배 업스케일 → assets/samples_hd/ 저장"""
import json, os, time, urllib.request, shutil

BASE = r"D:\develop\project\notebook-monster"
SRC = os.path.join(BASE, "assets", "samples")
DST = os.path.join(BASE, "assets", "samples_hd")
HOST = "http://127.0.0.1:8188"

def upscale(filename):
    # 1) 업로드
    import mimetypes, uuid
    boundary = uuid.uuid4().hex
    with open(os.path.join(SRC, filename), "rb") as f:
        data = f.read()
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{filename}\"\r\n"
            f"Content-Type: image/png\r\n\r\n").encode() + data + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(f"{HOST}/upload/image", data=body,
                                 headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req, timeout=120) as r:
        up = json.loads(r.read())["name"]
    # 2) 업스케일 워크플로우
    wf = {
      "1": {"class_type": "LoadImage", "inputs": {"image": up}},
      "2": {"class_type": "UpscaleModelLoader", "inputs": {"model_name": "4x-UltraSharp.pth"}},
      "3": {"class_type": "ImageUpscaleWithModel", "inputs": {"upscale_model": ["2", 0], "image": ["1", 0]}},
      "4": {"class_type": "ImageScale", "inputs": {"image": ["3", 0], "upscale_method": "lanczos", "width": 1024, "height": 1024, "crop": "disabled"}},
      "5": {"class_type": "SaveImage", "inputs": {"images": ["4", 0], "filename_prefix": f"hd_{filename[:-4]}"}}
    }
    req = urllib.request.Request(f"{HOST}/api/prompt", data=json.dumps({"prompt": wf}).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        pid = json.loads(r.read())["prompt_id"]
    for _ in range(120):
        time.sleep(5)
        with urllib.request.urlopen(f"{HOST}/history/{pid}", timeout=30) as r:
            h = json.loads(r.read())
        if pid in h:
            for node_id, o in h[pid]["outputs"].items():
                for img in o.get("images", []):
                    url = f"{HOST}/view?filename={img['filename']}&subfolder={img.get('subfolder','')}&type={img.get('type','output')}"
                    os.makedirs(DST, exist_ok=True)
                    dst = os.path.join(DST, filename)
                    with urllib.request.urlopen(url, timeout=60) as resp, open(dst, "wb") as f:
                        shutil.copyfileobj(resp, f)
                    print(json.dumps({"ok": True, "saved": dst}, ensure_ascii=False))
                    return
            print(json.dumps({"ok": False, "error": "no output"})); return
    print(json.dumps({"ok": False, "error": "timeout"}))

if __name__ == "__main__":
    for f in os.listdir(SRC):
        if f.endswith(".png"):
            dst = os.path.join(DST, f)
            if os.path.exists(dst):
                print("skip", f); continue
            upscale(f)

"""Shared image identity and prompts. No network, files written, or game mutation."""
import hashlib
import json
from pathlib import Path
import re
from runtime import GameError, validate_user_id

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = json.loads((ROOT / "data/image_prompts.json").read_text(encoding="utf-8"))


def pet_identity(st):
    if "pet_id" in st:
        value = st["pet_id"]
        if not isinstance(value, str) or not re.fullmatch(r"[a-f0-9]{32}", value):
            raise GameError("invalid_state", "몬스터 식별자가 올바르지 않습니다.")
        return value
    # Deterministic migration identity for existing saves, without overwriting them.
    birth = next((h.get("ts") for h in st.get("history", []) if h.get("event") == "hatched"), None)
    raw = json.dumps([st["user_id"], birth, st["species"], st["element"], st["name"]], ensure_ascii=False)
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def image_key(species, element, stage, branch=None):
    if species not in TEMPLATE["species"] or element not in TEMPLATE["elements"] or type(stage) is not int or stage not in range(1, 5):
        raise GameError("invalid_image_request", "이미지 종족·속성·단계를 확인해 주세요.")
    if (stage == 4 and branch not in TEMPLATE["branches"]) or (stage != 4 and branch is not None):
        raise GameError("invalid_image_request", "진화 분기를 확인해 주세요.")
    return f"{species}_{element}_stage{stage}" + (f"_{branch}" if branch else "")


def describe(st):
    stage = st["stage"]
    # Some historical stage-four saves did not include a branch.
    branch = (st.get("evolution_branch") or "dark") if stage == 4 else None
    return {"user_id": validate_user_id(st["user_id"]), "pet_id": pet_identity(st),
            "species": st["species"], "element": st["element"], "stage": stage, "branch": branch,
            "key": image_key(st["species"], st["element"], stage, branch), "revision": TEMPLATE["revision"]}


def build_prompt(species, element, stage, branch=None, reference=False):
    image_key(species, element, stage, branch)
    pieces = [TEMPLATE["stages"][str(stage)], TEMPLATE["species"][species],
              TEMPLATE["elements"][element], TEMPLATE["style"]]
    if branch:
        pieces.append(TEMPLATE["branches"][branch])
    if reference:
        pieces.append(TEMPLATE["reference"])
    return "\n".join(pieces)


def image_seed(request):
    if "seed" in request:
        seed = request["seed"]
        if type(seed) is not int or not 0 <= seed < 2 ** 64:
            raise GameError("invalid_image_seed", "이미지 시드가 올바르지 않습니다.")
        return seed
    raw = f"{request['pet_id']}:{request['key']}:{request['revision']}"
    return int.from_bytes(hashlib.sha256(raw.encode()).digest()[:4], "big")

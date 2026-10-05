#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
공책 AI 키우기 — 결정론 게임 엔진 (v0.2)
판정은 전부 이 스크립트가 한다. LLM(에이전트)은 결과 JSON을 받아 서사만 붙인다.
사용법: python engine.py <user_id> <command> [args...]
출력: 단일 JSON (Discord 중계용)
"""
import json, math, os, random, sys, time
from datetime import date, timedelta
from runtime import MISSING, GameError, atomic_write_json, game_clock, game_date, read_json, store_lock, validate_user_id

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, "data", "game_data.json")
DATA_ROOT = os.path.abspath(os.environ.get("NOTEBOOK_DATA_DIR", BASE))
STATE_DIR = os.path.join(DATA_ROOT, "state")

with open(DATA, encoding="utf-8") as f:
    G = json.load(f)

def state_path(uid):
    return os.path.join(STATE_DIR, f"{validate_user_id(uid)}.json")

def load_state(uid):
    st = read_json(state_path(uid))
    if st is MISSING:
        return None
    validate_state(st, uid)
    # Old sleep_buff has no reliable activation date: expire it on migration.
    # Preserve all progression, inventory and records; never guess old rewards.
    if st.get("version") == 2:
        st["version"] = 3
        st["sleep_bonus_dates"] = []
        st["daily"].pop("sleep_buff", None)
    st.setdefault("last_decay_date", None)
    return st

def save_state(st):
    validate_state(st, st.get("user_id"))
    atomic_write_json(state_path(st["user_id"]), st)

def today(): return game_date().isoformat()


def validate_state(st, uid):
    """Reject incompatible/corrupt saves without overwriting them."""
    validate_user_id(uid)
    def require(condition):
        if not condition:
            raise ValueError("Invalid save field")
    try:
        require(isinstance(st, dict) and st["user_id"] == uid)
        require(type(st["version"]) is int and st["version"] in (2, 3))
        require(isinstance(st["name"], str))
        require(st["species"] in G["species"] and st["element"] in G["elements"])
        for key in ("level", "stage", "xp", "satiety", "intimacy"):
            require(type(st[key]) is int)
        require(1 <= st["level"] <= G["max_level"] and st["stage"] == stage_of(st["level"])[0])
        require(st["xp"] >= 0 and 0 <= st["satiety"] <= 100 and 0 <= st["intimacy"] <= 100)
        for key in ("daily", "inventory", "record", "cooldowns", "stats"):
            require(isinstance(st[key], dict))
        date.fromisoformat(st["daily"]["date"])
        for key, value in st["daily"].items():
            if key not in ("date", "sleep_buff"):
                require(type(value) is int and value >= 0)
        for value in st["cooldowns"].values():
            require(type(value) in (int, float) and math.isfinite(value) and value >= 0)
        for key in ("normal_feed", "rare_feed"):
            require(type(st["inventory"][key]) is int and st["inventory"][key] >= 0)
        for key in ("win", "lose"):
            require(type(st["record"][key]) is int and st["record"][key] >= 0)
        require(isinstance(st["history"], list) and all(isinstance(h, dict) for h in st["history"]))
        require(st["evolution_branch"] in (None, "light", "dark"))
        wild = st.get("_wild")
        if wild is not None:
            require(isinstance(wild, dict))
            require(wild["species_key"] in G["species"] and wild["element_key"] in G["elements"])
            require(type(wild["level"]) is int and wild["level"] > 0)
            require(isinstance(wild["species"], str) and isinstance(wild["element"], str))
        if st.get("last_decay_date") is not None:
            date.fromisoformat(st["last_decay_date"])
        if st["version"] == 3:
            require(isinstance(st["sleep_bonus_dates"], list))
            for value in st["sleep_bonus_dates"]:
                date.fromisoformat(value)
    except (KeyError, TypeError, ValueError, OverflowError) as exc:
        raise GameError("invalid_state", "세이브 형식이 올바르지 않습니다. 원본을 보존하고 관리자에게 문의해 주세요.") from exc

def fresh_daily(st):
    if st["daily"]["date"] != today():
        st["daily"] = {"date": today(), "train": 0, "battle": 0, "snack": 0,
                       "walk": 0, "attendance": 0, "sleep": 0}
    st["daily"].pop("sleep_buff", None)
    st["sleep_bonus_dates"] = [d for d in st.get("sleep_bonus_dates", []) if d >= today()]

def xp_needed(lv):
    s = G["stages"]
    for st in reversed(s):
        if lv >= st["min_lv"]: return G["xp_per_level"].get(f"s{st['stage']}", G["xp_per_level"]["default"])
    return G["xp_per_level"]["default"]

def stage_of(lv):
    for st in G["stages"]:
        if st["min_lv"] <= lv <= st["max_lv"]: return st["stage"], st["label"]
    return 4, "완전체"

def type_mult(atk_el, def_el):
    c = G["type_chart"].get(atk_el, {})
    if def_el in c.get("strong_vs", []): return 1.5
    if def_el in c.get("weak_vs", []):   return 0.67
    return 1.0

def berserk(st):
    """괴수족 폭주: 친밀도가 종족 임계 미만이면 공격↑·편차↑(제어 어려움). game_data 기반."""
    sp = G["species"][st["species"]]
    return "berserk_below" in sp and st["intimacy"] < sp["berserk_below"]

def catch_rate(st, w):
    """포획 확률(0~0.9). 종족 성장 HP + 요정족 행운(catch_bonus) + 상성 우위."""
    sp = G["species"][st["species"]]
    rate = 0.25 + 0.05 * sp.get("growth", {}).get("hp", 1)
    rate += sp.get("catch_bonus", 0)  # 요정족 포획 보너스
    if st["element"] and w["element_key"] in G["type_chart"].get(st["element"], {}).get("strong_vs", []):
        rate += 0.15
    return min(0.9, rate)

# ponytail: 칭호 규칙은 코드 내 표. 기획팀이 자주 바꾸면 game_data로 이동.
def titles(st):
    """전적·레벨·진화·친밀도에서 파생되는 칭호 목록 (순수 함수)."""
    got = []
    w = st["record"]["win"]
    caught = sum(1 for h in st.get("history", []) if h.get("event") == "caught")
    if st["level"] >= G["max_level"]: got.append("완전체 마스터")
    if st["stage"] >= 4:
        got.append("빛의 성체" if st.get("evolution_branch") == "light" else "어둠의 성체")
    if w >= 50: got.append("전설의 조련사")
    elif w >= 10: got.append("백전노장")
    elif w >= 1: got.append("초보 트레이너")
    if caught >= 10: got.append("도감 마스터")
    elif caught >= 1: got.append("포획가")
    if st["intimacy"] >= 90: got.append("단짝")
    return got

def add_xp(st, amount):
    if type(amount) is not int or amount < 0:
        raise GameError("invalid_xp", "경험치 값이 올바르지 않습니다.")
    bonus = G["commands"]["sleep"]["buff_next_day_pct"] if today() in st.get("sleep_bonus_dates", []) else 0
    amount = amount * (100 + bonus) // 100
    if st["level"] >= G["max_level"]:
        st["xp"] = 0
        return {"gained": 0, "evolutions": [], "leveled_to": st["level"]}
    st["xp"] += amount
    evolutions = []
    while st["level"] < G["max_level"] and st["xp"] >= xp_needed(st["level"]):
        st["xp"] -= xp_needed(st["level"])
        st["level"] += 1
        ns, _ = stage_of(st["level"])
        if ns > st["stage"]:
            st["stage"] = ns
            branch = None
            if ns == 4:
                branch = "light" if st["intimacy"] >= G["evolution_branch_threshold"] else "dark"
                st["evolution_branch"] = branch
            evolutions.append({"to_stage": ns, "branch": branch, "level": st["level"]})
    if st["level"] == G["max_level"]:
        st["xp"] = 0
    return {"gained": amount, "evolutions": evolutions, "leveled_to": st["level"]}

def stat_total(st):
    g = G["species"][st["species"]]["growth"]
    base = 10 + st["level"] * 0.8
    return {k: round(base * v) for k, v in g.items()}

def check_limit(st, key):
    lim = G["commands"].get(key, {}).get("daily_limit")
    if lim is not None and st["daily"].get(key, 0) >= lim:
        return False, f"오늘은 더 이상 못 해 ({lim}회 소진)"
    cd = G["commands"].get(key, {}).get("cooldown_min")
    if cd:
        last = st["cooldowns"].get(key, 0)
        remain = int(last + cd * 60 - time.time())
        if remain > 0:
            return False, f"쿨타임 {remain//60+1}분 남음"
    return True, ""

def mark(st, key):
    lim = G["commands"].get(key, {}).get("daily_limit")
    if lim is not None: st["daily"][key] = st["daily"].get(key, 0) + 1
    cd = G["commands"].get(key, {}).get("cooldown_min")
    if cd: st["cooldowns"][key] = time.time()

def out(ok, msg, **extra):
    r = {"ok": ok, "msg": msg}; r.update(extra); return r

# ---------- 커맨드 ----------
ADMIN_IDS = {v.strip() for v in os.environ.get("NOTEBOOK_ADMIN_IDS", "").split(",") if v.strip()}
ACCESS = os.path.join(DATA_ROOT, "data", "access.json")

def is_admin(uid): return uid in ADMIN_IDS

def load_access():
    a = read_json(ACCESS)
    if a is MISSING:
        return {"owner_id": "", "owner_name": ""}
    if not isinstance(a, dict) or not isinstance(a.get("owner_id"), str) or not isinstance(a.get("owner_name"), str):
        raise GameError("invalid_access", "접근 설정이 올바르지 않습니다. 관리자에게 문의해 주세요.")
    if a["owner_id"]:
        try:
            validate_user_id(a["owner_id"])
        except GameError as exc:
            raise GameError("invalid_access", "접근 설정이 올바르지 않습니다. 관리자에게 문의해 주세요.") from exc
    return a

def save_access(a):
    atomic_write_json(ACCESS, a)

def access_check(uid):
    """소유주 게이트. 반환 (allowed, owner_name).
    소유주 미등록 → 전체 개방. 등록 시 → 소유주 본인 또는 관리자만."""
    a = load_access()
    owner = a.get("owner_id", "")
    if not owner: return True, ""                                   # open
    if uid == owner or is_admin(uid): return True, a.get("owner_name", "")
    return False, a.get("owner_name", "")

def cmd_set_owner(uid, target, name):
    """관리자 전용: 소유주 등록. 이후 그 ID(+관리자)만 게임 가능."""
    if not is_admin(uid): return out(False, "이 명령어는 관리자만 쓸 수 있어.")
    validate_user_id(target)
    save_access({"owner_id": target, "owner_name": name or ""})
    return out(True, "소유주 등록 완료", owner_id=target, owner_name=name or "")

def cmd_clear_owner(uid):
    """관리자 전용: 소유주 해제 → 전체 개방으로 복귀."""
    if not is_admin(uid): return out(False, "이 명령어는 관리자만 쓸 수 있어.")
    save_access({"owner_id": "", "owner_name": ""})
    return out(True, "소유주 해제 완료 — 이제 누구나 놀 수 있어.")

def cmd_reset(uid, target, name):
    """관리자 전용: 몬스터 초기화. reset <target_uid> [새이름]"""
    if uid not in ADMIN_IDS:
        return out(False, "이 명령어는 관리자만 쓸 수 있어.")
    st = load_state(target)
    if not st:
        return out(False, f"{target} 은(는) 몬스터가 없어.")
    old_name = st["name"]
    if len(name) > 1:  # 새 이름이 오면 바로 재탄생
        r = cmd_start(target, name, replace=True)
        return out(True, f"{old_name} 초기화 후 {r.get('species')} {name} 재탄생!", **{k: v for k, v in r.items() if k not in ("ok", "msg")})
    os.remove(state_path(target))
    return out(True, f"{old_name} 초기화 완료. !공책시작 으로 다시 키울 수 있어.")

def cmd_start(uid, name, replace=False):
    if not replace and load_state(uid): return out(False, "이미 키우는 몬스터가 있어. (!상태 로 확인)")
    sp = random.choice(list(G["species"].keys()))
    el = random.choice(list(G["elements"].keys()))
    st = {
        "version": 3, "user_id": uid, "name": name,
        "species": sp, "element": el, "stage": 1, "level": 1, "xp": 0,
        "stats": {}, "intimacy": 50, "satiety": 80,
        "record": {"win": 0, "lose": 0},
        "cooldowns": {}, "daily": {"date": today(), "train": 0, "battle": 0, "snack": 0, "walk": 0, "attendance": 0, "sleep": 0},
        "sleep_bonus_dates": [], "last_decay_date": None,
        "inventory": {"normal_feed": 3, "rare_feed": 0},
        "evolution_branch": None,
        "history": [{"ts": time.time(), "event": "hatched"}],
        "_wild": None
    }
    save_state(st)
    s, l = stage_of(1)
    return out(True, f"{name} 탄생!", species=G["species"][sp]["name_kr"], element=G["elements"][el]["name_kr"],
               level=1, needs_image=True, image_key=f"{sp}_{el}_lv1")

def cmd_status(st):
    t = stat_total(st)
    return out(True, "", name=st["name"], species=G["species"][st["species"]]["name_kr"],
               element=G["elements"][st["element"]]["name_kr"], stage_label=dict((s["stage"], s["label"]) for s in G["stages"])[st["stage"]],
               level=st["level"], xp=st["xp"], xp_next=xp_needed(st["level"]),
               stats=t, intimacy=st["intimacy"], satiety=st["satiety"],
               record=st["record"], title=(titles(st)[0] if titles(st) else "새내기"),
               mood=("배고픔" if st["satiety"] < 30 else ("심심함" if st["intimacy"] < 40 else "평온")))

def cmd_titles(st):
    return out(True, "", titles=titles(st), record=st["record"])

def cmd_care(st, key):
    ok, why = check_limit(st, key)
    if not ok: return out(False, why)
    c = G["commands"][key]
    rare_used = False
    if key == "feed":
        if st["inventory"]["normal_feed"] <= 0: return out(False, "사료가 없어. 배틀로 보상을 모아.")
        st["inventory"]["normal_feed"] -= 1
        st["satiety"] = min(100, st["satiety"] + c["satiety"])
    elif key == "play":
        st["intimacy"] = min(100, round(min(100, st["intimacy"] + c["intimacy"]) * G["species"][st["species"]]["intimacy_rate"]))
        st["satiety"] = max(0, st["satiety"] - c["satiety_cost"])
    elif key == "snack":
        st["intimacy"] = min(100, st["intimacy"] + c["intimacy"])
        if st["inventory"].get("rare_feed", 0) > 0:  # 맛있는 사료: 있으면 자동 소비 → XP 부스트
            st["inventory"]["rare_feed"] -= 1
            rare_used = True
    elif key == "sleep":
        tomorrow = (date.fromisoformat(today()) + timedelta(days=1)).isoformat()
        st["sleep_bonus_dates"] = sorted(set(st.get("sleep_bonus_dates", []) + [tomorrow]))
    if st["satiety"] < 30 and c["xp"] > 0: c_xp = max(1, c["xp"] // 2)   # XP 없는 행동은 0 유지
    else: c_xp = c["xp"]
    if rare_used: c_xp += c.get("rare_xp_bonus", 0)
    mark(st, key); x = add_xp(st, c_xp)
    save_state(st)
    return out(True, f"{key} 완료", xp_result=x, evolution=x["evolutions"], used_rare_feed=rare_used)

def cmd_train(st):
    ok, why = check_limit(st, "train")
    if not ok: return out(False, why)
    if st["satiety"] < 20: return out(False, "너무 배고파서 훈련을 못 해. !밥줘 먼저.")
    st["satiety"] -= G["commands"]["train"]["satiety_cost"]
    t = stat_total(st)
    pick = random.choice(list(t.keys()))
    mark(st, "train"); x = add_xp(st, G["commands"]["train"]["xp"])
    save_state(st)
    return out(True, f"{pick} 훈련 완료", trained_stat=pick, stats_after=stat_total(st), xp_result=x)

def cmd_walk(st):
    ok, why = check_limit(st, "walk")
    if not ok: return out(False, why)
    mark(st, "walk"); x = add_xp(st, G["commands"]["walk"]["xp"])
    encounter = None
    if random.random() < G["commands"]["walk"]["encounter_chance"]:
        wsp = random.choice(list(G["species"].keys())); wel = random.choice(list(G["elements"].keys()))
        wlv = max(1, st["level"] + random.randint(-3, 3))
        encounter = {"species": G["species"][wsp]["name_kr"], "element": G["elements"][wel]["name_kr"],
                     "species_key": wsp, "element_key": wel, "level": wlv}
        st["_wild"] = encounter
    save_state(st)
    r = out(True, "산책 완료", xp_result=x, encounter=bool(encounter))
    return r

def wild_power(w, el_key):
    base = 10 + w["level"] * 1.2
    return base * random.uniform(0.85, 1.15) * type_mult(el_key, el_key)  # 자기자신 기준 1.0이라 사실상 랜덤만

def cmd_battle(st):
    ok, why = check_limit(st, "battle")
    if not ok: return out(False, why)
    w = st.get("_wild")
    if not w: return out(False, "야생 몬스터가 없어. !산책 으로 조우부터.")
    my_t = stat_total(st)
    bers = berserk(st)
    sp = G["species"][st["species"]]
    atk_var = random.uniform(0.6, 1.4) if bers else random.uniform(0.9, 1.1)  # 폭주: 편차↑
    atk_mult = sp.get("berserk_atk_mult", 1.0) if bers else 1.0               # 폭주: 공격↑
    my_atk = my_t["atk"] * type_mult(st["element"], w["element_key"]) * atk_var * atk_mult
    dodge = 0.10 if st["species"] == "ghost" or st["species"] == "bird" else 0.05
    enemy_dodged = random.random() < dodge
    enemy_atk = (10 + w["level"] * 1.2) * type_mult(w["element_key"], st["element"]) * random.uniform(0.9, 1.1)
    i_dodged = (not enemy_dodged) and random.random() < dodge * 0.5
    my_dmg = 0 if enemy_dodged else my_atk - my_t["def"] * 0.4
    en_dmg = 0 if i_dodged else enemy_atk - my_t["def"] * 0.6
    win = my_dmg >= en_dmg
    mark(st, "battle")
    if win:
        st["record"]["win"] += 1
        reward_feed = random.random() < 0.5
        if reward_feed: st["inventory"]["normal_feed"] += 1
        if random.random() < 0.15: st["inventory"]["rare_feed"] += 1
        xp = random.randint(G["commands"]["battle"]["xp_win_min"], G["commands"]["battle"]["xp_win_max"])
        x = add_xp(st, xp)
        msg = f"{w['species']}({w['element']}) Lv{w['level']} 격파!"
        loot = {"normal_feed": 1 if reward_feed else 0, "rare_feed": st["inventory"]["rare_feed"]}
    else:
        st["record"]["lose"] += 1
        x = add_xp(st, G["commands"]["battle"]["xp_lose"])
        msg = f"{w['species']}({w['element']})에게 패배..."
        loot = {}
    st["_wild"] = None
    save_state(st)
    return out(True, msg, won=win, dmg_me=round(my_dmg, 1), dmg_enemy=round(en_dmg, 1), xp_result=x, loot=loot, berserk=bers)

def cmd_catch(st):
    w = st.get("_wild")
    if not w: return out(False, "조우한 야생 몬스터가 없어.")
    rate = catch_rate(st, w)
    success = random.random() < rate
    st["_wild"] = None
    if success:
        st["history"].append({"ts": time.time(), "event": "caught", "what": f"{w['species']}({w['element']}) Lv{w['level']}"})
        save_state(st)
        return out(True, f"{w['species']} 포획 성공! 도감에 등록됐다.", caught=w, catch_rate=round(rate, 2))
    save_state(st)
    return out(True, f"{w['species']} 놓쳤다... (포획률 {round(rate*100)}%)", caught=None)

def cmd_attendance(st):
    ok, why = check_limit(st, "attendance")
    if not ok: return out(False, "오늘 출석 이미 했어.")
    mark(st, "attendance"); x = add_xp(st, G["commands"]["attendance"]["xp"])
    save_state(st)
    return out(True, "출석 보너스", xp_result=x)

def cmd_pokedex(st):
    return out(True, "", catches=[h for h in st["history"] if h.get("event") == "caught"],
               record=st["record"], branch=st["evolution_branch"])

def cmd_rank():
    ranks = []
    for fn in os.listdir(STATE_DIR):
        if fn.endswith(".json"):
            s = load_state(fn[:-5])
            if s: ranks.append({"name": s["name"], "lv": s["level"], "win": s["record"]["win"]})
    ranks.sort(key=lambda r: (r["lv"], r["win"]), reverse=True)
    return out(True, "", ranking=ranks[:10])

def cmd_help():
    return out(True, "커맨드 목록", commands=list(G["commands"].keys()) + ["status", "pokedex", "titles", "rank", "help"])

# ---------- main ----------
ALIASES = {
    "공책시작": "start", "상태": "status", "밥줘": "feed", "간식줘": "snack",
    "놀아줘": "play", "재워줘": "sleep", "잘자": "sleep", "훈련": "train",
    "산책": "walk", "배틀": "battle", "포획": "catch", "출석": "attendance",
    "도감": "pokedex", "칭호": "titles", "랭킹": "rank", "도움말": "help",
    "소유주": "owner", "개방": "clearowner", "소유주해제": "clearowner",
}
COMMANDS = set(G["commands"]) | {"status", "pokedex", "titles", "rank", "help", "owner", "clearowner", "reset"}


def execute(actor_id, command, arguments=()):
    """Trusted adapter entry point: actor_id comes from the platform session.

    This is not remote authentication: local CLI callers have OS-level access.
    Never let the LLM or message body choose actor_id or runtime environment vars.
    """
    try:
        command = ALIASES.get(command, command)
        if command not in COMMANDS:
            raise GameError("unknown_command", "모르는 커맨드입니다.")
        if not isinstance(arguments, (list, tuple)) or any(not isinstance(v, str) for v in arguments):
            raise GameError("invalid_arguments", "명령 인자가 올바르지 않습니다.")
        if command == "help":
            if arguments:
                raise GameError("invalid_arguments", "도움말에는 추가 인자가 필요하지 않습니다.")
            return cmd_help()
        if actor_id is not None:
            validate_user_id(actor_id)
        elif command != "rank":
            raise GameError("invalid_user_id", "실제 발신자의 사용자 ID가 필요합니다.")
        authenticated = os.environ.get("NOTEBOOK_ACTOR_ID")
        if authenticated is not None:
            validate_user_id(authenticated)
            if actor_id is None:
                actor_id = authenticated
            elif actor_id != authenticated:
                raise GameError("actor_mismatch", "발신자와 요청 사용자 ID가 일치하지 않습니다.")
        for admin in ADMIN_IDS:
            validate_user_id(admin)
        if command in {"owner", "reset"}:
            if not is_admin(actor_id):
                return out(False, "이 명령어는 관리자만 쓸 수 있어.", code="forbidden")
            if command == "owner" and not arguments:
                raise GameError("invalid_arguments", "소유주로 등록할 사용자 ID가 필요합니다.")
            target = validate_user_id(arguments[0] if arguments else actor_id)
        elif command != "start" and arguments:
            raise GameError("invalid_arguments", "이 명령에는 추가 인자가 필요하지 않습니다.")
        name = " ".join(arguments[1:] if command in {"owner", "reset"} else arguments)
        if len(name) > 80 or any(ord(ch) < 32 for ch in name):
            raise GameError("invalid_arguments", "이름은 제어문자 없이 80자 이내로 입력해 주세요.")
        with store_lock(STATE_DIR), game_clock():
            # Explicit admin commands can recover broken access settings.
            if command == "owner":
                return cmd_set_owner(actor_id, target, name)
            if command == "clearowner":
                return cmd_clear_owner(actor_id)
            allowed, owner_name = access_check(actor_id)
            if not allowed:
                return out(False, "not_owner", reason="not_owner", owner_name=owner_name)
            if command == "reset":
                return cmd_reset(actor_id, target, name)
            if command == "rank":
                return cmd_rank()
            if command == "start":
                return cmd_start(actor_id, name or "모험가")
            st = load_state(actor_id)
            if st is None:
                return out(False, "!공책시작 으로 먼저 몬스터를 만들어.", code="not_started")
            fresh_daily(st)
            table = {
                "status": lambda: cmd_status(st), "feed": lambda: cmd_care(st, "feed"),
                "play": lambda: cmd_care(st, "play"), "snack": lambda: cmd_care(st, "snack"),
                "sleep": lambda: cmd_care(st, "sleep"), "train": lambda: cmd_train(st),
                "walk": lambda: cmd_walk(st), "battle": lambda: cmd_battle(st),
                "catch": lambda: cmd_catch(st), "attendance": lambda: cmd_attendance(st),
                "pokedex": lambda: cmd_pokedex(st), "titles": lambda: cmd_titles(st),
            }
            return table[command]()
    except GameError as exc:
        return out(False, str(exc), code=exc.code)
    except (KeyError, TypeError, ValueError):
        return out(False, "저장 데이터의 형식을 확인해 주세요.", code="invalid_state")


def main():
    args = sys.argv[1:]
    if not args:
        result = execute(None, "help")
    elif ALIASES.get(args[0], args[0]) in COMMANDS:
        command = ALIASES.get(args[0], args[0])
        if command == "help" or (command == "rank" and len(args) == 1):
            result = execute(None, command, args[1:])
        else:
            result = execute(args[1] if len(args) > 1 else None, command, args[2:])
    else:
        result = execute(args[0], args[1] if len(args) > 1 else "", args[2:])
    print(json.dumps(result, ensure_ascii=False))
    return result

if __name__ == "__main__":
    random.seed()  # 실행마다 다른 시드 — 판정 로직 자체는 결정론적 규칙 적용
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
공책 AI 키우기 — 결정론 게임 엔진 (v0.2)
판정은 전부 이 스크립트가 한다. LLM(에이전트)은 결과 JSON을 받아 서사만 붙인다.
사용법: python engine.py <user_id> <command> [args...]
출력: 단일 JSON (Discord 중계용)
"""
import json, os, random, sys, time
from datetime import date

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(BASE, "data", "game_data.json")
STATE_DIR = os.path.join(BASE, "state")

with open(DATA, encoding="utf-8") as f:
    G = json.load(f)

def state_path(uid): return os.path.join(STATE_DIR, f"{uid}.json")

def load_state(uid):
    p = state_path(uid)
    if not os.path.exists(p): return None
    with open(p, encoding="utf-8") as f: return json.load(f)

def save_state(st):
    with open(state_path(st["user_id"]), "w", encoding="utf-8") as f:
        json.dump(st, f, ensure_ascii=False, indent=2)

def today(): return date.today().isoformat()

def fresh_daily(st):
    if st["daily"]["date"] != today():
        carry = st["daily"].get("sleep_buff", False)
        st["daily"] = {"date": today(), "train": 0, "battle": 0, "snack": 0,
                       "walk": 0, "attendance": 0, "sleep_buff": carry}

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

def add_xp(st, amount):
    amount = int(amount * (1.2 if st["daily"].get("sleep_buff") else 1.0))
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
    r = {"ok": ok, "msg": msg}; r.update(extra); print(json.dumps(r, ensure_ascii=False))

# ---------- 커맨드 ----------
def cmd_start(uid, name):
    if load_state(uid): return out(False, "이미 키우는 몬스터가 있어. (!상태 로 확인)")
    sp = random.choice(list(G["species"].keys()))
    el = random.choice(list(G["elements"].keys()))
    st = {
        "version": 2, "user_id": uid, "name": name,
        "species": sp, "element": el, "stage": 1, "level": 1, "xp": 0,
        "stats": {}, "intimacy": 50, "satiety": 80,
        "record": {"win": 0, "lose": 0},
        "cooldowns": {}, "daily": {"date": today(), "train": 0, "battle": 0, "snack": 0, "walk": 0, "attendance": 0, "sleep_buff": False},
        "inventory": {"normal_feed": 3, "rare_feed": 0},
        "evolution_branch": None,
        "history": [{"ts": time.time(), "event": "hatched"}],
        "_wild": None
    }
    save_state(st)
    s, l = stage_of(1)
    return out(True, f"{name} 탄생!", species=G["species"][sp]["name_kr"], element=G["elements"][el]["name_kr"],
               level=1, needs_image=True, image_key=f"{sp}_{el}_lv1")

def require(st):
    if st is None: out(False, "!공책시작 으로 먼저 몬스터를 만들어."); return False
    fresh_daily(st); return True

def cmd_status(st):
    t = stat_total(st)
    return out(True, "", name=st["name"], species=G["species"][st["species"]]["name_kr"],
               element=G["elements"][st["element"]]["name_kr"], stage_label=dict((s["stage"], s["label"]) for s in G["stages"])[st["stage"]],
               level=st["level"], xp=st["xp"], xp_next=xp_needed(st["level"]),
               stats=t, intimacy=st["intimacy"], satiety=st["satiety"],
               record=st["record"], mood=("배고픔" if st["satiety"] < 30 else ("심심함" if st["intimacy"] < 40 else "평온")))

def cmd_care(st, key):
    ok, why = check_limit(st, key)
    if not ok: return out(False, why)
    c = G["commands"][key]
    if key == "feed":
        if st["inventory"]["normal_feed"] <= 0: return out(False, "사료가 없어. 배틀로 보상을 모아.")
        st["inventory"]["normal_feed"] -= 1
        st["satiety"] = min(100, st["satiety"] + c["satiety"])
    elif key == "play":
        st["intimacy"] = min(100, round(min(100, st["intimacy"] + c["intimacy"]) * G["species"][st["species"]]["intimacy_rate"]))
        st["satiety"] = max(0, st["satiety"] - c["satiety_cost"])
    elif key == "snack":
        st["intimacy"] = min(100, st["intimacy"] + c["intimacy"])
    elif key == "sleep":
        st["daily"]["sleep_buff"] = True
    if st["satiety"] < 30: c_xp = max(1, c["xp"] // 2)   # 배고프면 XP 반토막
    else: c_xp = c["xp"]
    mark(st, key); x = add_xp(st, c_xp)
    save_state(st)
    return out(True, f"{key} 완료", xp_result=x, evolution=x["evolutions"])

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
    my_atk = my_t["atk"] * type_mult(st["element"], w["element_key"]) * random.uniform(0.9, 1.1)
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
    return out(True, msg, won=win, dmg_me=round(my_dmg, 1), dmg_enemy=round(en_dmg, 1), xp_result=x, loot=loot)

def cmd_catch(st):
    w = st.get("_wild")
    if not w: return out(False, "조우한 야생 몬스터가 없어.")
    rate = 0.25 + 0.05 * G["species"][st["species"]].get("growth", {}).get("hp", 1)  # 간단 공식
    if st["element"] and w["element_key"] in G["type_chart"].get(st["element"], {}).get("strong_vs", []): rate += 0.15
    rate = min(0.9, rate)
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
    return out(True, "커맨드 목록", commands=list(G["commands"].keys()) + ["status", "pokedex", "rank", "help"])

# ---------- main ----------
def main():
    args = sys.argv[1:]
    if not args: return cmd_help()
    cmd = args[0]
    if cmd in ("help", "도움말"): return cmd_help()
    if cmd in ("rank", "랭킹"): return cmd_rank()
    # 커맨드가 user_id 자리에 오는 오용 방지: 두 번째 인자가 커맨드 후보면 swap
    known = {"start", "공책시작", "status", "상태", "밥줘", "놀아줘", "간식줘", "재워줘", "잘자",
             "train", "훈련", "walk", "산책", "battle", "배틀", "catch", "포획",
             "attendance", "출석", "pokedex", "도감"}
    rest = args[1:]
    if cmd not in known and rest and rest[0] in known:
        cmd, rest = rest[0], [cmd] + rest[1:]
    uid = rest[0] if rest else "owner"
    st = load_state(uid)
    if cmd in ("start", "공책시작"):
        name_parts = rest[1:] if len(rest) > 1 else []
        return cmd_start(uid, " ".join(name_parts) if name_parts else "모험가")
    if not require(st): return
    table = {
        "status": lambda: cmd_status(st), "밥줘": lambda: cmd_care(st, "feed"),
        "놀아줘": lambda: cmd_care(st, "play"), "간식줘": lambda: cmd_care(st, "snack"),
        "재워줘": lambda: cmd_care(st, "sleep"), "train": lambda: cmd_train(st),
        "walk": lambda: cmd_walk(st), "battle": lambda: cmd_battle(st),
        "catch": lambda: cmd_catch(st), "attendance": lambda: cmd_attendance(st),
        "pokedex": lambda: cmd_pokedex(st),
    }
    aliases = {"상태": "status", "훈련": "train", "산책": "walk", "배틀": "battle",
               "포획": "catch", "출석": "attendance", "도감": "pokedex",
               "잘자": "재워줘"}
    key = aliases.get(cmd, cmd)
    fn = table.get(key)
    if not fn: return out(False, f"모르는 커맨드: {cmd}")
    return fn()

if __name__ == "__main__":
    random.seed()  # 실행마다 다른 시드 — 판정 로직 자체는 결정론적 규칙 적용
    main()

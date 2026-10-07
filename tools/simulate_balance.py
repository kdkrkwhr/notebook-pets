#!/usr/bin/env python3
"""Seeded offline balance report using real rules; never reads/writes saves."""
import argparse
import copy
from collections import Counter
from datetime import date, timedelta
import hashlib
import json
from pathlib import Path
import random
import statistics
import sys
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine"))
import engine


def combat_report(trials, seed):
    species = list(engine.G["species"])
    elements = list(engine.G["elements"])
    rows = []
    for mode in ("neutral", "mixed_elements"):
        for level in (1, 30, 60, 100):
            for own in species:
                counts, rounds = Counter(), []
                # Every species faces all nine opponents equally often.
                for enemy in species:
                    for trial in range(trials):
                        pair_seed = f"{seed}:{level}:{enemy}:{trial}:{mode}"
                        element_rng = random.Random(pair_seed)
                        own_el, enemy_el = ("fire", "fire") if mode == "neutral" else (
                            element_rng.choice(elements), element_rng.choice(elements))
                        st = {"species": own, "element": own_el, "level": level, "intimacy": 50}
                        w = {"species_key": enemy, "element_key": enemy_el, "level": level}
                        r = engine.simulate_battle(st, w, random.Random(pair_seed))
                        counts[r["outcome"]] += 1
                        rounds.append(r["rounds"])
                total = sum(counts.values())
                rows.append({"mode": mode, "level": level, "species": own, "battles": total,
                             "wins": counts["win"], "draws": counts["draw"], "losses": counts["lose"],
                             "win_pct": round(100 * counts["win"] / total, 2),
                             "draw_pct": round(100 * counts["draw"] / total, 2),
                             "score_pct": round(100 * (counts["win"] + counts["draw"] / 2) / total, 2),
                             "mean_rounds": round(statistics.mean(rounds), 2)})
    return rows


def progression(species, seed, max_days=180, supply=3, battles=True, *, profile='active', quests=True):
    """Fixed daily routines, real handlers, no filesystem or real wall clock."""
    if profile not in ('active', 'daily_quest', 'relaxed') or max_days < 1:
        raise ValueError('Invalid profile or simulation duration')
    rng = random.Random(seed)
    current = date(2026, 1, 1)
    clock = 2_000_000_000.0
    st = None
    def save(value):
        nonlocal st
        engine.validate_state(value, value["user_id"])
        st = value
    milestones, stats = {}, Counter()
    with patch.object(engine, "save_state", side_effect=save), \
         patch.object(engine, "load_state", return_value=None), \
         patch.object(engine, "today", side_effect=lambda: current.isoformat()), \
         patch.object(engine.time, "time", side_effect=lambda: clock), \
         patch.object(engine, "random", rng), \
         patch.dict(engine.G["commands"]["attendance"], {"normal_feed": supply}):
        engine.cmd_start("123", "Simulation")
        st["species"], st["element"] = species, "fire"
        minimum_food = None
        for day in range(1, max_days + 1):
            current = date(2026, 1, 1) + timedelta(days=day - 1)
            clock = 2_000_000_000.0 + day * 86400
            engine.fresh_daily(st)
            engine.cmd_attendance(st)
            sessions = 3 if profile == 'active' else 1
            for session in range(sessions):
                clock += 7200  # honors one-hour feeding/play cooldowns
                if st["satiety"] <= 70 or profile == 'daily_quest':
                    fed = engine.cmd_care(st, "feed")
                    stats["feeds_used" if fed["ok"] else "feed_refusals"] += 1
                training_count = 1 if profile == 'active' else (
                    next(item['target'] for item in engine.G['daily_quest']['requirements'] if item['command']=='train')
                    if profile == 'daily_quest' else 0)
                for _ in range(training_count):
                    trained = engine.cmd_train(st)
                    stats["trained" if trained["ok"] else "training_refusals"] += 1
                if session == 0 and profile != 'daily_quest':
                    engine.cmd_care(st, "play")
                engine.cmd_care(st, "snack")
            for _ in range(5 if profile == 'active' else 1):
                walked = engine.cmd_walk(st)
                if not walked["ok"]:
                    raise RuntimeError("Simulation left an unresolved encounter")
                if st["_wild"]:
                    if battles:
                        result = engine.cmd_battle(st)
                        stats[result["outcome"]] += 1
                    else:
                        engine.cmd_flee(st)
            if quests and engine.daily_quest(st)['ready']:
                reward = engine.cmd_claimquest(st)
                if not reward['ok']:
                    raise RuntimeError('A ready quest could not be claimed')
                stats['quest_claims'] += 1
                stats['quest_xp'] += reward['xp_result']['gained']
            engine.cmd_care(st, "sleep")
            remaining = st["inventory"]["normal_feed"]
            minimum_food = remaining if minimum_food is None else min(minimum_food, remaining)
            for target in (31, 51, 81, 100):
                if st["level"] >= target:
                    milestones.setdefault(str(target), day)
            if st["level"] == 100:
                break
    return {"species": species, "seed": seed, "profile": profile, "quests_enabled": quests,
            "days": day, "level": st["level"], "satiety": st['satiety'],
            "milestone_days": milestones, "food_remaining": st["inventory"]["normal_feed"],
            "minimum_end_of_day_food": minimum_food, "training_bonus": st["training_bonus"], **stats}


def build_report(trials=50, seed=20261005):
    rows = combat_report(trials, seed)
    growth = [progression(sp, seed + run) for sp in engine.G["species"] for run in range(3)]
    no_supply = progression("mammal", seed, max_days=30, supply=0, battles=False)
    daily_supply = progression("mammal", seed, max_days=30, supply=3, battles=False)
    routines = [progression(sp, seed+run, profile=profile, battles=False)
                for profile in ('active', 'daily_quest', 'relaxed') for sp in engine.G['species'] for run in range(3)]
    quest_comparison = [progression('mammal', seed, battles=False, quests=enabled) for enabled in (False, True)]
    requirements = copy.deepcopy(engine.G['daily_quest']['requirements'])
    adjustment = []
    for target in (2, 1):
        configured = copy.deepcopy(requirements)
        next(item for item in configured if item['command']=='train')['target'] = target
        with patch.dict(engine.G['daily_quest'], {'requirements': configured}):
            runs = [progression(sp, seed, max_days=30, profile='daily_quest', battles=False)
                    for sp in engine.G['species']]
        adjustment.append({'training_target': target, 'runs': runs})
    return {"seed": seed, "trials_per_matchup": trials,
            "rules_sha256": hashlib.sha256(json.dumps(engine.G, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest(),
            "engine_sha256": hashlib.sha256((ROOT / "engine" / "engine.py").read_text(encoding="utf-8").encode("utf-8")).hexdigest(),
            "combat": rows, "progression": growth, 'routines_without_battles': routines,
            'quest_comparison': quest_comparison,
            'quest_target_comparison': adjustment,
            "food_without_battle_rewards": {"without_attendance_supply": no_supply, "with_attendance_supply": daily_supply}}


def markdown(report):
    rows = report["combat"]
    growth = report["progression"]
    lines = ["# 게임 밸런스 시뮬레이션", "",
             f"고정 seed `{report['seed']}`, 매치업당 {report['trials_per_matchup']}회. 총 {sum(r['battles'] for r in rows):,}전.", "",
             "실제 엔진 함수를 사용한 오프라인 표본이며 실사용 지표가 아닙니다. 운영 세이브는 읽거나 쓰지 않습니다.", "",
             "## 동일 레벨 전투", "",
             "레벨 1·30·60·100, 모든 상대 종족에 같은 횟수로 대전합니다. 친밀도 50, 훈련 보너스 없음, 폭주 없음입니다. "
             "중립은 양쪽 불 속성, 혼합은 양쪽 속성을 무작위 선택합니다. 점수율은 승리 1·무승부 0.5로 계산합니다. "
             "종족은 서로 다른 성장 총량과 비전투 특성을 가지므로 50% 균등을 가정하지 않습니다.", "",
             "| 종족 | 중립 승률 | 중립 무승부율 | 혼합 승률 | 혼합 점수율 | 평균 라운드(혼합) |",
             "|---|---:|---:|---:|---:|---:|"]
    for sp in engine.G["species"]:
        neutral = [r for r in rows if r["species"] == sp and r["mode"] == "neutral"]
        mixed = [r for r in rows if r["species"] == sp and r["mode"] == "mixed_elements"]
        avg = lambda rs, k: statistics.mean(r[k] for r in rs)
        lines.append(f"| {engine.G['species'][sp]['name_kr']} | {avg(neutral, 'win_pct'):.1f}% | {avg(neutral, 'draw_pct'):.1f}% | "
                     f"{avg(mixed, 'win_pct'):.1f}% | {avg(mixed, 'score_pct'):.1f}% | {avg(mixed, 'mean_rounds'):.1f} |")
    lines += ["", "## 성장 속도", "",
              "종족별 3회, 하루 출석 1·훈련 3·놀이 1·간식 3·산책 5·수면 1회. "
              "하루 세 접속 시점은 2시간 간격이며 포만감 70 이하일 때 사료를 줍니다. 모든 조우는 전투로 해결합니다. "
              "방치·접속 누락은 포함하지 않으며 초과 플레이도 하지 않습니다. 속성은 불로 고정합니다. "
              "훈련 보너스는 누적되지만 야생에는 훈련 보너스가 없습니다. 수면·쿨타임·출석 공급·퀘스트 수령을 실제 명령 함수로 계산합니다.", "",
              "| 종족 | Lv31 (일) | Lv51 (일) | Lv81 (일) | Lv100 (일) | 훈련 거절 횟수 |",
              "|---|---:|---:|---:|---:|---:|"]
    for sp in engine.G["species"]:
        runs = [r for r in growth if r["species"] == sp]
        values = []
        for target in (31, 51, 81, 100):
            days = [r["milestone_days"].get(str(target)) for r in runs]
            values.append(f"{min(days)}–{max(days)}" if all(d is not None for d in days) else "180일 내 미도달")
        lines.append("| " + " | ".join([engine.G["species"][sp]["name_kr"], *values,
                                        str(sum(r.get("training_refusals", 0) for r in runs))]) + " |")
    food = report["food_without_battle_rewards"]
    lines += ['', '## 하루 한 번 접속하는 퀘스트 목표 조정', '',
              '9종족·각 30일·전투 없음·퀘스트 중심 일정에서 훈련 목표만 2회와 1회로 비교합니다. '
              '먹이 1회는 포만감 +30, 훈련 1회는 -20입니다. 목표 2회에서는 누적 소비가 공급을 초과합니다. '
              '현재 기본 목표는 먹이 1회·훈련 1회·산책 1회이며 보상은 기존과 같습니다.', '',
              '| 훈련 목표 | 총 진행일 | 퀘스트 완료 | 훈련 거절 | 마지막 포만감 범위 |',
              '|---|---:|---:|---:|---:|']
    for item in report['quest_target_comparison']:
        runs = item['runs']
        lines.append(f"| {item['training_target']}회 | {sum(r['days'] for r in runs)} | "
                     f"{sum(r.get('quest_claims',0) for r in runs)} | {sum(r.get('training_refusals',0) for r in runs)} | "
                     f"{min(r['satiety'] for r in runs)}–{max(r['satiety'] for r in runs)} |")
    lines += ['', '## 한 파트너 돌보기: 전투 없는 일상', '',
              '모든 조우에서 도망칩니다. 9종족 각각 3개 seed로 최대 180일을 진행합니다. 매일 출석·수면하며 결석은 없습니다.', '',
              '- 적극 돌보기: 기존 3회 접속 일정, 달성한 퀘스트 수령.',
              '- 퀘스트 중심: 하루 한 번 먹이 1회, 퀘스트에 필요한 훈련, 간식 1회, 산책 1회. 놀이 없음.',
              '- 가벼운 돌보기: 하루 한 번 포만감 70 이하일 때 먹이, 놀이·간식·산책 각 1회. 훈련 없음.',
              '- 간식은 보유한 맛있는 사료를 자동 소비합니다. 퀘스트 보상 사료는 다음 날부터 사용됩니다.', '',
              '| 일상 | Lv31 | Lv51 | Lv81 | Lv100 | 훈련 거절 합계 | 퀘스트 달성/진행일 |',
              '|---|---:|---:|---:|---:|---:|---:|']
    for profile, label in [('active','적극 돌보기'), ('daily_quest','퀘스트 중심'), ('relaxed','가벼운 돌보기')]:
        runs = [r for r in report['routines_without_battles'] if r['profile']==profile]
        values = []
        for target in (31,51,81,100):
            days = [r['milestone_days'].get(str(target)) for r in runs]
            reached = [value for value in days if value is not None]
            values.append(f'{min(reached)}–{max(reached)}일' if len(reached)==len(days) else
                          (f'{len(reached)}/{len(days)}회 도달' if reached else '180일 내 미도달'))
        lines.append('| ' + ' | '.join([label, *values, str(sum(r.get('training_refusals',0) for r in runs)),
            f"{sum(r.get('quest_claims',0) for r in runs)}/{sum(r['days'] for r in runs)}"]) + ' |')
    lines += ['', '### 퀘스트 보상의 성장 영향', '',
              '포유류·전투 없음·적극 돌보기 동일 일정에서 퀘스트 수령만 비교합니다.', '',
              '| 퀘스트 수령 | Lv31 | Lv51 | Lv81 | Lv100 | 퀘스트 경험치 합계 |', '|---|---:|---:|---:|---:|---:|']
    for run in report['quest_comparison']:
        lines.append('| ' + ' | '.join(['있음' if run['quests_enabled'] else '없음',
            *[str(run['milestone_days'].get(str(level),'미도달')) for level in (31,51,81,100)],
            str(run.get('quest_xp',0))]) + ' |')
    lines += ["", "## 먹이 수급", "",
              "포유류·30일·모든 조우에서 도망, 전투 보상 0 조건으로 비교했습니다. 초기 사료는 3개입니다.", "",
              "| 출석 공급 | 훈련 성공 | 훈련 거절 | 사료 부족 거절 | 마지막 사료 |", "|---|---:|---:|---:|---:|"]
    for key, label in (("without_attendance_supply", "없음"), ("with_attendance_supply", "하루 3개")):
        r = food[key]
        lines.append(f"| {label} | {r.get('trained', 0)} | {r.get('training_refusals', 0)} | {r.get('feed_refusals', 0)} | {r['food_remaining']} |")
    lines += ["", "## 해석 범위", "",
              "- HP·방어·공격 성장치 차이가 승률에 반영됩니다. 이 표는 종족 간 전투력이 동등하다는 보장이 아닙니다.",
              "- 같은 라운드에 양쪽 HP가 0이면 무승부이며 승리 전리품을 지급하지 않습니다.",
              "- 최대 20라운드 후에는 남은 HP 비율을 비교합니다. 따라서 회피 연속 발생도 무한 전투를 만들지 않습니다.",
              "- 출석 사료는 승리 운과 무관한 회복 경로입니다. 하루 세 번보다 많이 먹이·놀이를 쓰는 정책은 별도 수급이 필요할 수 있습니다.",
              "- 표본 수와 플레이 일정에 따른 결과입니다. 이용자가 없는 상태에서 참여율·재미·이탈률은 검증할 수 없습니다.", "",
              "재현: `python -B -X utf8 tools/simulate_balance.py --output docs/BALANCE_REPORT.json`", ""]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trials", type=int, default=50)
    parser.add_argument("--seed", type=int, default=20261005)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.trials < 1:
        parser.error("--trials must be positive")
    report = build_report(args.trials, args.seed)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.output.with_suffix(".md").write_text(markdown(report), encoding="utf-8")
    print(args.output.with_suffix(".md"))


if __name__ == "__main__":
    main()

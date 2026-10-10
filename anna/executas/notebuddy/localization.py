"""Anna presentation only: never translate or mutate the authoritative save."""
import copy
import re

LABELS = {
    '포유류족': 'Mammal', '조류족': 'Bird', '파충류족': 'Reptile', '기계족': 'Machine',
    '요정족': 'Fairy', '괴수족': 'Beast', '용족': 'Dragon', '식물족': 'Plant', '유령족': 'Ghost',
    '불': 'Fire', '물': 'Water', '번개': 'Thunder', '자연': 'Nature', '바람': 'Wind',
    '땅': 'Earth', '빛': 'Light', '어둠': 'Dark',
    '새싹기': 'Hatchling', '성장기': 'Growing', '성숙기': 'Mature', '완전체': 'Final form',
    '새내기': 'New friend', '배고픔': 'Hungry', '심심함': 'Bored', '평온': 'Content',
    '완전체 마스터': 'Evolution master', '빛의 성체': 'Child of light', '어둠의 성체': 'Child of shadow',
    '전설의 조련사': 'Legendary trainer', '백전노장': 'Battle veteran', '초보 트레이너': 'Rookie trainer', '단짝': 'Best friends',
    '밥 주기': 'Feed', '훈련': 'Train', '산책': 'Walk',
}
ERRORS = {
    'walk_recharging': ('Walks are recharging: one every 5 minutes, up to 5.', '산책 횟수 충전 중이에요. 5분마다 1회, 최대 5회까지 충전돼요.'),
    'request_expired': ('This request is no longer current. It was not run again. Refresh and check your companion before choosing another action.', '이전 요청을 다시 실행하지 않았어요. 상태를 새로고침하고 친구를 확인한 뒤 다음 행동을 선택해 주세요.'),
    'save_capacity': ('This action was not saved because the game data is too large. Your previous progress is safe. Please contact support.', '게임 저장 용량이 커서 이번 행동을 저장하지 못했어요. 기존 진행도는 보존됩니다. 지원팀에 문의해 주세요.'),
    'not_started': ('Meet your companion first.', '먼저 친구를 만나 주세요.'),
    'encounter_pending': ('A companion you met is waiting. Choose Battle or Walk away first.', '만난 친구가 기다리고 있어요. 배틀이나 지나가기를 먼저 선택해 주세요.'),
    'no_encounter': ('There is no encounter. Go for a walk first.', '아직 만난 친구가 없어요. 먼저 산책해 주세요.'),
    'quest_already_claimed': ("You already claimed today’s quest reward.", '오늘의 퀘스트 보상은 이미 받았어요.'),
    'quest_incomplete': ("Finish all of today’s promises before claiming your reward.", '오늘의 약속을 모두 완료한 뒤 보상을 받아 주세요.'),
    'request_conflict': ('This request ID was already used for a different action.', '이미 다른 행동에 사용된 요청이에요.'),
    'invalid_state': ('Could not read your save. The original has been preserved.', '저장 데이터를 읽지 못했어요. 원본은 보존됩니다.'),
    'forbidden': ('This action is not available.', '지원하지 않는 행동입니다.'),
    'already_started': ('You already have a lifelong companion.', '이미 함께하는 평생 친구가 있어요.'),
    'no_food': ('You have no food. Collect your daily gift or earn food in battles.', '사료가 없어요. 출석 선물이나 배틀 보상으로 모아 주세요.'),
    'too_hungry': ('Your companion is too hungry to train. Feed them first.', '너무 배고파서 훈련할 수 없어요. 먼저 밥을 주세요.'),
    'attendance_claimed': ("You already collected today’s gift.", '오늘의 출석 선물은 이미 받았어요.'),
}
LEGACY_ERRORS = {
    'walk_recharging': ('Walks are recharging: one every 5 minutes, up to 5.', '산책 횟수 충전 중이에요. 5분마다 1회, 최대 5회까지 충전돼요.'),
    'request_expired': ('This request is no longer current. It was not run again. Refresh and check your companion before choosing another action.', '이전 요청을 다시 실행하지 않았어요. 상태를 새로고침하고 친구를 확인한 뒤 다음 행동을 선택해 주세요.'),
    'save_capacity': ('This action was not saved because the game data is too large. Your previous progress is safe. Please contact support.', '게임 저장 용량이 커서 이번 행동을 저장하지 못했어요. 기존 진행도는 보존됩니다. 지원팀에 문의해 주세요.'),
    '이미 키우는 몬스터가 있어. (!상태 로 확인)': 'already_started',
    '사료가 없어. 출석 보급이나 배틀 보상으로 모아.': 'no_food',
    '너무 배고파서 훈련을 못 해. !밥줘 먼저.': 'too_hungry',
    '야생 몬스터가 없어. !산책 으로 조우부터.': 'no_encounter',
    '오늘 출석 이미 했어.': 'attendance_claimed',
}
SUCCESS = {
    'feed': ('Meal time complete.', '밥을 맛있게 먹었어요.'), 'snack': ('Treat time complete.', '간식 시간을 함께했어요.'),
    'play': ('A little playtime together!', '함께 즐겁게 놀았어요.'), 'sleep': ('Rest well. Your XP bonus starts tomorrow (Korea time).', '푹 쉬어요. 내일 한국 시간 기준으로 경험치 보너스가 적용됩니다.'),
    'walk': ('Walk complete.', '산책을 다녀왔어요.'), 'flee': ('You waved goodbye. You can go for another walk.', '만난 친구와 헤어졌어요. 다시 산책할 수 있어요.'),
    'attendance': ('Daily gift collected.', '출석 선물을 받았어요.'), 'claimquest': ("Today’s promises are complete. Thank you for being here!", '오늘의 약속 완료! 함께해 줘서 고마워요.'),
    'quests': ("Today’s promises", '오늘의 약속'), 'album': ('Your lifelong companion’s growth album', '처음 만난 친구와 함께한 성장 앨범'),
    'help': ('Available actions', '사용할 수 있는 행동'), 'status': ('', ''), 'titles': ('', ''),
}

def _message(value, command, language):
    index = 1 if language == 'ko' else 0
    if not value.get('ok'):
        code = value.get('code') or LEGACY_ERRORS.get(value.get('msg'))
        if code in ERRORS:
            value['code'] = code
            return ERRORS[code][index]
        match = re.fullmatch(r'쿨타임 (\d+)분 남음', value.get('msg', ''))
        if match:
            value['code'] = 'cooldown'
            value['retry_after_minutes'] = int(match[1])
            return f'{match[1]}분 후에 다시 할 수 있어요.' if index else f'Try again in {match[1]} minute(s).'
        match = re.fullmatch(r'오늘은 더 이상 못 해 \((\d+)회 소진\)', value.get('msg', ''))
        if match:
            value['code'] = 'daily_limit'
            value['daily_limit'] = int(match[1])
            return f'오늘의 {match[1]}회를 모두 사용했어요.' if index else f'All {match[1]} daily uses are complete. Try again after midnight Korea time (UTC+9).'
        return '행동을 완료하지 못했어요. 상태를 새로고침하고 다시 확인해 주세요.' if index else 'Could not complete this action. Refresh your status and check again.'
    if command == 'start':
        # Never translate names or use a locale-dependent name in saved command arguments.
        name = (value.get('status') or {}).get('name', '')
        return f'{name}, 반가워요!' if index else f'Welcome, {name}!'
    if command == 'walk':
        return {'quiet': ('A peaceful walk. Nothing unusual happened.', '별일 없이 느긋하게 산책했어요.'),
                'xp': ('You discovered XP on your walk!', '산책 중 경험치를 발견했어요!'),
                'encounter': ('You met a monster on your walk!', '산책 중 몬스터를 만났어요!')}.get(value.get('walk_outcome'), SUCCESS['walk'])[index]
    if command == 'train':
        stat = {'hp': ('HP', 'HP'), 'atk': ('ATK', '공격'), 'def': ('DEF', '방어')}.get(value.get('trained_stat'), ('Stat', '능력치'))[index]
        return f'{stat} +{value.get("stat_gain", 0)} · ' + ('훈련 완료' if index else 'Training complete')
    if command == 'battle':
        return {'win': ('You won the battle!', '배틀에서 이겼어요!'), 'lose': ('You lost this battle. There is always another walk.', '이번 배틀에서는 졌어요. 다음 산책을 기대해 봐요.'), 'draw': ('The battle ended in a draw.', '무승부로 끝났어요.')}.get(value.get('outcome'), ('Battle complete.', '배틀 완료.'))[index]
    return SUCCESS.get(command, ('Action complete.', '행동 완료.'))[index]

def localize(response, command, language='en'):
    """Localize only response fields, after the unmodified receipt is committed."""
    value = copy.deepcopy(response)
    value['language'] = language
    value['msg'] = _message(value, command, language)
    if command == 'help':
        value['commands'] = [c for c in value.get('commands', []) if c not in {'rank', 'reset', 'owner', 'clearowner'}]
    if language == 'en':
        def visit(item):
            if isinstance(item, dict):
                for key, child in item.items():
                    if key in {'species', 'element', 'stage_label', 'label', 'title', 'mood'} and isinstance(child, str):
                        item[key] = LABELS.get(child, child)
                    elif key == 'titles' and isinstance(child, list):
                        item[key] = [LABELS.get(title, title) for title in child]
                    elif key == 'msg':
                        # Nested status is read-only and has no narration.
                        if item is not value:
                            item[key] = ''
                    else:
                        visit(child)
            elif isinstance(item, list):
                for child in item:
                    visit(child)
        visit(value)
    return value

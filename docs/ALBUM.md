# 한 파트너의 진화 앨범 / One partner's evolution album

노트버디는 처음 만난 파트너 한 마리를 계속 돌보는 다마고치형 게임입니다. 산책 중 만나는 야생 몬스터는 전투 상대이며, 포획하거나 다른 파트너로 교체하지 않습니다. `catch`·`포획`, `pokedex`·`도감` 명령과 포획 칭호를 제거했습니다. 기존 세이브에 있는 과거 포획 기록은 삭제하지 않지만 현재 게임 기능에 사용하지 않습니다. 운영자 `reset`은 세이브 복구·초기화 목적의 도구이며 플레이어의 재뽑기 기능이 아닙니다.

```powershell
python -X utf8 engine/engine.py 123456789012345678 album
python -X utf8 tools/export_album.py 123456789012345678 --output albums/buddy.html
```

Discord에서는 `!앨범` 또는 `!진화앨범`을 사용합니다. 성장 단계별 기록과 이미 저장된 그림을 최대 4장 보여줍니다. 공통 Python 도구와 MCP 조회 모드에서도 `album`을 사용할 수 있습니다.

앨범에는 새싹기·성장기·성숙기·완전체가 표시되고, 현재 단계와 도달 여부가 구분됩니다. 처음 만난 날짜는 기존 `hatched` 기록에서 읽습니다. 이번 버전부터 진화 시각·단계·레벨·분기를 게임 보상과 같은 저장에 기록하며 중복 메시지 재처리로 기록이 늘어나지 않습니다. 날짜는 KST입니다. 기존 세이브의 과거 진화 날짜가 없으면 **날짜 기록 없음**으로 표시합니다. 아직 도달하지 않은 모습이나 다른 최종 분기 이미지는 표시하지 않습니다.

이미지는 현재 파트너 ID와 현재 이미지 프롬프트 revision의 캐시에서만 가져옵니다. 캐시가 없거나 손상됐다면 다른 펫이나 대표 예시로 대체하지 않습니다. 앨범 조회는 새 그림을 생성하지 않으며 `!상태` 또는 `tools/render_pet.py <user_id>`로 이미지 생성을 요청할 수 있습니다. 이때 생성한 과거 단계 이미지는 나중에 재구성한 모습일 수 있고, 파일 생성 시각을 실제 진화 날짜로 취급하지 않습니다.

HTML 내보내기는 그림을 파일 안에 포함하므로 인터넷 없이 열 수 있습니다. 파트너 이름·성장 날짜가 담긴 개인 앨범이며 외부 공유 여부는 사용자가 결정합니다. 출력 파일은 덮어쓰지 않으므로 다시 내보낼 때는 새 이름을 사용합니다. 앨범 조회·내보내기는 게임 상태를 변경하지 않으며 기존 접근 제한을 적용합니다. `albums/`는 Git에서 제외합니다.

## English

Notebuddy is a Tamagotchi-style game centered on the single partner you first meet. Wild encounters remain battle opponents; capture, the collection dex, and capture titles are removed. Legacy capture history stays intact in old saves but has no gameplay role. Administrator reset remains an operational recovery tool, not a player reroll feature.

Use `album` (Discord: `!앨범` or `!진화앨범`) to view your partner's four growth stages. Python and read-only MCP tools expose the same command. Birth dates come from existing hatch history; new evolution events record timestamps, stages, levels, and branches in the same save transaction. Replayed messages do not duplicate events. Missing historical dates remain unknown; future stages are locked.

Only cached artwork for the current partner and prompt revision is shown. Missing/corrupt images are not replaced with showcase images or other pets, and browsing never generates artwork. Use status/render_pet.py to prepare images. Reconstructed earlier-stage images do not establish historical evolution dates.

`tools/export_album.py <user_id> --output albums/buddy.html` exports a self-contained offline HTML snapshot with embedded PNGs. Existing files are not overwritten. Reads and exports preserve saves and respect access settings. Exported albums contain personal character details; sharing remains a user action.

# 공통 엔진과 실행 흐름

노트버디의 규칙은 Python 코어에 모여 있어요. 화면이나 저장 방식이 달라져도 같은 행동을 같은 규칙으로 처리하기 위한 구조예요.

## 한 번의 행동이 지나가는 길

1. 화면이 명령과 인자를 만들어요. 저장하는 행동에는 재시도를 구분할 요청 ID를 붙여요.
2. 플랫폼 어댑터가 현재 상태와 실행에 필요한 입력을 준비해요.
3. `transition()`이 규칙을 적용해 결과와 다음 상태를 돌려줘요.
4. 어댑터가 저장 충돌을 확인하고 저장해요. 성공한 결과를 화면에 반영해요.

이 경계는 [game_api.py](../../engine/game_api.py)의 `validate_request`, `transition`, `GameApplication`에서 볼 수 있어요. `transition()`은 입력 상태의 복사본에서 계산하며 직접 파일이나 데이터베이스에 저장하지 않아요.

## 시간과 무작위 값도 입력으로 받아요

[ports.py](../../engine/ports.py)의 `ExecutionContext`에는 게임 규칙, 이미지 문구 템플릿, 현재 시간, 난수 생성기, ID 생성기가 들어가요. 한 명령을 계산하는 동안 시간은 고정돼요. 테스트에서는 이 입력을 정해 두고 같은 상황을 다시 검사할 수 있어요.

`Candidate`는 현재 실행 대상의 상태만 읽고 쓸 수 있게 검사해요. 여기의 사용자 ID 검사는 코어의 경계이고, 실제 로그인과 계정별 저장 범위는 각 플랫폼이 책임져요.

## 웹과 Anna가 연결하는 방식

| 환경 | 실행과 저장 |
| --- | --- |
| 웹 | [worker.js](../../web/worker.js)가 Pyodide에 코어를 올리고 `transition()`을 호출해요. [store.js](../../web/store.js)가 IndexedDB 트랜잭션 안에서 저장 revision을 검사해요. |
| Anna | [game_worker.py](../../anna/executas/notebuddy/game_worker.py)가 시간·규칙·난수를 준비해요. [notebuddy_plugin.py](../../anna/executas/notebuddy/notebuddy_plugin.py)가 APS 저장과 요청 처리를 연결해요. |

`GameApplication`은 저장소 인터페이스를 사용하는 공통 실행기예요. Anna의 비동기 APS 처리와 웹의 Worker 연결을 모두 이 클래스가 직접 수행한다고 해석하면 안 돼요. 두 어댑터는 각자의 저장 절차에서 `transition()`을 사용해요.

## AI가 맡는 일과 코어가 맡는 일

AI는 대화, 외형 묘사, 이야기, 허용된 진화 방향의 문구, 주어진 홈 배치 후보의 선택을 담당해요. 코어는 행동 가능 여부, 비용, 소유권, 보상, 타이머와 상태 전환을 검사해요.

예를 들어 홈 꾸미기에서 AI가 마음에 드는 배치를 골라도 코어 검사를 통과해야 저장돼요. 이 구조는 [마이홈](home.md), [진화](birth.md), [저장과 재시도](platforms.md)에서 이어서 볼 수 있어요.

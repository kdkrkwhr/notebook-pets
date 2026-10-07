# AI 에이전트 연결 / AI agent integration

Hermes는 선택 사항입니다. Python 함수 호출 또는 stdio MCP를 지원하는 호스트에서 같은 게임 엔진을 사용할 수 있습니다. 모델은 명령을 선택하고 결과를 설명하며, 게임 규칙·보상·저장은 엔진이 처리합니다.

## Python 도구 호출

저장소의 `engine/`을 Python 모듈 검색 경로에 추가한 연결 프로그램에서 실행합니다.

```python
from adapter import bind_game_event, dispatch_tool, tool_definition

# 반드시 인증된 메시지 메타데이터에서 가져옵니다. 모델 인자가 아닙니다.
game = bind_game_event(actor_id="123", event_id="discord:456")
definition = tool_definition()  # name, description, parameters(JSON Schema)
# 호스트 SDK에 맞춰 definition을 등록하고 모델의 JSON 인자를 디코딩합니다.
result = dispatch_tool(game, {"command": "feed", "arguments": []})
```

다른 플랫폼은 인증된 계정을 내부 숫자 ID(1~20자리)에 매핑하세요. 이벤트 ID는 플랫폼 접두사를 붙인 전역 고유 값으로, 영문·숫자·콜론·밑줄·하이픈 1~128자입니다. 재시도·모델 교체에도 같은 ID를 사용합니다. Discord는 기존 `discord:<message_id>`를 유지합니다. 모델이 ID를 생성하거나 새 ID로 재시도하게 만들지 마세요.

이벤트 하나에서 성공적으로 저장되는 게임 조작은 하나입니다. 동일 조작 재호출은 기존 결과를 반환하고, 다른 조작은 `request_conflict`로 거절합니다. 새 사용자 메시지에는 새 이벤트 ID를 바인딩하세요. `owner`, `clearowner`, `reset`은 운영자 CLI 전용입니다. 함수 호출 호스트는 게임 도구만 노출하고 임의 셸·세이브 파일 쓰기 권한은 부여하지 않습니다.

## MCP 실행

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-mcp.txt
```

MCP 호스트 설정 예시(실제 경로와 사용자 ID로 변경):

```json
{
  "mcpServers": {
    "notebook-pets": {
      "command": "D:\\develop\\project\\notebook-pets\\.venv\\Scripts\\python.exe",
      "args": ["-B", "-X", "utf8", "D:\\develop\\project\\notebook-pets\\tools\\mcp_server.py"],
      "env": {
        "NOTEBOOK_ACTOR_ID": "123",
        "NOTEBOOK_DATA_DIR": "D:\\develop\\project\\notebook-pets",
        "PYTHONUTF8": "1"
      }
    }
  }
}
```

이 설정은 상시 **조회 전용**입니다(`status`, `pokedex`, `titles`, `rank`, `help`). 먼저 CLI로 펫을 만들면 상태를 확인할 수 있습니다. MCP 클라이언트별 설정 형식은 다를 수 있습니다.

조작까지 연결하려면 신뢰할 수 있는 게이트웨이가 각 사용자 메시지마다 자식 프로세스를 만들고, 같은 사용자 ID와 `NOTEBOOK_EVENT_ID`를 환경변수로 전달합니다. 해당 메시지의 도구 호출이 끝나면 프로세스를 종료합니다. 상시 설정에 고정 이벤트 ID를 넣으면 두 번째 다른 조작부터 충돌하므로 사용하지 마세요. 조회 전용 연결만 제공하는 일반 MCP 호스트에서도 이 제한을 우회하지 않습니다. Python 호스트는 프로세스 대신 요청별 바인딩 함수를 사용하면 됩니다.

`NOTEBOOK_ACTOR_ID`는 인증을 대신하지 않습니다. 호스트가 실제 사용자를 인증하고 접근 권한을 설정해야 합니다. 서버는 stdio만 사용하며 네트워크 포트를 열지 않습니다. 일반 게임 오류는 도구 결과 JSON의 `ok`, `code`, `msg`로 판단하고, 잘못된 MCP 인자는 프로토콜 도구 오류로 반환합니다.

현재 MCP 도구는 게임 JSON과 이미지 요청 정보를 반환합니다. ComfyUI 이미지 생성·Discord 첨부는 기존 `ImageService`/게이트웨이 계층이 담당합니다. MCP 도구 자체가 이미지를 생성하거나 전송하지는 않습니다.

## 에이전트 지침 예시

> 사용자의 요청에 맞는 notebook_game 명령을 호출한다. 인자 형식은 help로 확인한다. 결과의 ok가 false면 실패 이유를 설명하고 성공했다고 말하지 않는다. 수치·보상·진화는 도구 결과만 근거로 설명한다. 동일 사용자 메시지에서 서로 다른 게임 조작을 연속 실행하지 않는다. 사용자·이벤트 ID와 운영자 명령은 요청하지 않는다. 응답은 사용자의 언어로 짧고 친근하게 작성한다.

## English

Hermes is optional. Register `tool_definition()` with any function-calling host and dispatch decoded arguments through `dispatch_tool(bind_game_event(actor, event), payload)`. Adapt the definition wrapper to your provider's SDK. Bind identity and a stable, globally namespaced event ID from authenticated metadata, never model arguments. Non-Discord accounts require a trusted mapping to internal numeric IDs. Keep Discord's existing `discord:<message_id>` receipt keys.

The optional stdio MCP server exposes the same engine. Install `requirements-mcp.txt` and use the configuration above with your paths. A persistent connection without `NOTEBOOK_EVENT_ID` is read-only. For mutations, the gateway starts a process scoped to one authenticated user message and passes its event ID through the environment. Reuse that ID on retries or provider switches; one committed mutation per event is supported. Do not put a fixed event ID in a persistent client configuration. Administrative commands are excluded. Actor environment variables are guardrails, not authentication.

The MCP tool returns game JSON, including image descriptors where available. Rendering and delivery remain host responsibilities. The SDK is optional; the core engine and Python adapter require no new dependencies. Protocol tests use the official SDK client over real stdio, without any LLM account. Individual agent applications and production account authentication are not validated by those tests.

SDK API reference: [official Python SDK v1 documentation](https://py.sdk.modelcontextprotocol.io/v1/). This transport deliberately pins the supported v1 API (`<2`); v2 migration requires separate verification.

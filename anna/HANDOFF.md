# Notebook Pets on Anna · latest handoff

Latest two entries only; older entries are preserved in HANDOFF_HISTORY.md. Deployment and review observations below are distinct from source preparation.

---

# Web 0.8.0 — 집에서 보내는 시간과 추억 노트 — 2026-10-30

공개 [Web 0.8.0](https://kdkrkwhr.github.io/notebook-pets/) 배포 완료. 런타임 **bd7592b**, [Pages 41007524755](https://github.com/kdkrkwhr/notebook-pets/actions/runs/41007524755)의 빌드·배포가 모두 성공했습니다. Anna 소스는 Git 병합으로 가져왔으며, 뒤이은 **3739336** 배포 기록·브라우저 테스트 안정화 병합은 런타임을 변경하지 않습니다. Anna 설치 상태는 아래 기록의 **1.4.18 / tool0.9.9 / working94**, 공개 Anna **1.4.17 /1640**을 유지합니다.

가구 곁에서 보내는 생활과 실제 기록에 근거한 추억을 공유 UI·Python 코어로 제공합니다. 선택 저장한 대화 원문은 로컬 IndexedDB와 검증된 백업에 포함됩니다. 기존 Gemini/Ollama/ComfyUI·참고 이미지 어댑터와 무료 기본 모습 선택을 유지하며 새 서버·권한·자동 AI 요청은 없습니다.

전체 Web 회귀(기본 저장·홈 월드·현재 기능·추억·진화·로컬 AI·7개 테마·구조 지도·위키), 제공자 단위 6건, Pyodide와 추억 코어 10건이 통과했습니다. 추억의 동시 저장·중복 방지·백업·옛 백업·초기화 및 동일 친구 교체 뒤 지연 쓰기 차단도 확인했습니다. 독립 검토는 Ready입니다.

실제 공개 URL에서 주요 JS 7개의 SHA-256이 검증 빌드와 바이트 단위로 일치하고, Python 추억 코어는 체크아웃 줄바꿈 정규화 후 일치했습니다. 구조 지도 revision은 최초 배포 검증 당시 bd7592b였습니다. 격리 브라우저에서 실제 Pyodide로 새 친구의 첫 만남 1건·추억 노트·새로고침 복원을 확인했고, 320/390/1280px에서 가로 넘침이 없었습니다. 페이지 오류·외부 요청·실제 AI 호출은 0회이며 사용자 브라우저 저장은 열지 않았습니다. 자세한 범위와 한계는 [Web 배포 기록](../web/RELEASE_080.md)에 있습니다.

---

# Home life and memory notebook - 2026-10-30

Deployed **Anna app1.4.18 / tool0.9.9**, runtime source **24bf364**, to the owner test app. Working **revision94 / ready**, installed version **0.0.0-draft**, tool **master1193 / immutable928 / user executable35689**. Both the PC and cloud agents report **0.9.9 loaded/running**, install success. The normal owner install selected the cloud agent, which was then observed online; no separate cloud-resume or default-agent change was sent. The PC's old process was updated through the official single-tool reinstall endpoint. Eleven hosted installed UI files match local raw-byte SHA-256.

Furniture-aware home life visits reachable nest, bookcase and plant locations with personality-influenced order, pauses and five-language captions. The memory notebook preserves evidenced meeting/evolution/first recorded regional wins and up to20 explicitly saved original chat messages. Watching, saving, retrying and deleting saved words make no AI requests. Existing default and personal sprites retain their actual frames.

[Anna CI41006544330](https://github.com/kdkrkwhr/notebook-pets/actions/runs/41006544330) passed on Windows/Linux: **119 JS /147 browser /80 storage-protocol**, strict manifest validation and standalone build/smoke. Both uploaded packages are from exact24bf364. [Shared CI41006067291](https://github.com/kdkrkwhr/notebook-pets/actions/runs/41006067291) passed Python/real stdio MCP, engine and Pyodide at4d8fa06; Python sources are unchanged in24bf364. Local core247, engine6 and storage80 passed. Independent Anna and Web reviews are Ready after correcting the actual APS absent-null contract. A slow local browser run exposed transient fixed-delay test assumptions; the runtime passed both complete CI suites, and follow-up tests use explicit completion gates. See [full evidence](releases/RELEASE_1418.md).

Public Anna **1.4.17 /1640 approved/latest** and review-candidate-null remain unchanged. No cut/review submission. Listing hash is unchanged, including screenshot URLs. The five existing production records retain identical values and ETags; the new memories key remains absent until the user saves a message. No live AI calls, new grants or credentials were used.

Shared changes reached `release-web` through Git. **Web0.8.0 / bd7592b** passed all Web regressions and [Pages41007524755](https://github.com/kdkrkwhr/notebook-pets/actions/runs/41007524755), then the [live site](https://kdkrkwhr.github.io/notebook-pets/) passed file hashes, actual Pyodide first meeting/notebook/reload and320/390/1280px checks in an isolated browser, with zero external AI requests. Web keeps existing IndexedDB persistence and includes saved words in validated backups.

Limits: initial APS creation retains the platform's existing non-atomic creation boundary; no fabricated earlier dates/wins. Native Anna visual inspection, physical mobile devices and screen readers were not tested. Local browser screenshots and hosted installed bytes/runtime were verified separately. Private evidence is ignored under `.local/` in the two feature worktrees.

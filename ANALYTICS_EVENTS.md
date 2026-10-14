# GA4 이벤트

측정 ID: `G-1MR4LJW7XG`. 기존 Google 태그의 자동 페이지 조회는 유지하며 중복 페이지 조회를 보내지 않는다.

## 시작·종료 이벤트

종료 이벤트에는 `duration_ms`가 포함된다. 시작마다 종료는 최대 한 번 기록하며, 중단도 종료 사유로 구분한다.

| 경험 | 이벤트 이름 | 기록 시점 / 추가 매개변수 |
| --- | --- | --- |
| 비둘기 잡기 | `pigeon_grab_start`, `pigeon_grab_end` | 실제 잡기 시작 / 놓기·취소. `character_type`, `input_method`, `end_reason` |
| 모이 뿌리기 | `feed_scatter_start`, `feed_scatter_end` | 드래그 시작 / 종료. `input_method`, `grains_count`, `scatter_batches`, `end_reason` |
| 핀치 확대·축소 | `pinch_zoom_start`, `pinch_zoom_end` | 핀치 판정 / 종료. `input_method`, `zoom_start`, `zoom_end`, `end_reason` |
| 알 열기 | `egg_focus_start`, `egg_focus_end` | 알 확대 / 화면 닫기. `character_type`, `input_method`, `hit_count`, `result`, `end_reason` |
| 주니어 행동 | `junior_action_start`, `junior_action_end` | 주니어를 실제 클릭 / 할인 화면 표시 또는 중단. `character_type`, `input_method`, `result`, `end_reason` |
| 할인 화면 | `reward_start`, `reward_end` | 할인 화면 표시 / 닫기. `character_type`, `end_reason` |
| 사용법 | `tutorial_start`, `tutorial_end` | 도움말 열기 / 닫기. `interface_type`, `end_reason` |

모든 시작·종료 이벤트에는 `experience`가 포함된다. `character_type`의 현재 주요 값은 일반 비둘기 `classic`, 자르반 `royal`, 보행기 `walker`, 메이드 `maid`이다. `input_method`는 `mouse`, `touch`, `pen` 등이다.

`result`는 정상 완료 `completed` 또는 중단 `interrupted`이다. 알은 깨진 상태에서 닫으면 완료, 주니어 행동은 할인 화면이 표시되면 완료로 기록한다. 놓기, 취소, 포커스 상실, 도움말 열기, 닫기, 페이지 이탈 등은 `end_reason`으로 구분한다. 페이지 이탈 시 남은 경험은 `pagehide` 사유로 종료한다.

## 주요 단계 이벤트

| 이벤트 이름 | 기록 시점 | 매개변수 |
| --- | --- | --- |
| `pigeon_excretion` | 실제 배설 분출 시작 | `character_type`, `burst_number` |
| `egg_laid` | 실제 알 생성 | `character_type` |
| `egg_crack` | 유효한 알 타격, 총 1~4회 | `character_type`, `hit_count` |
| `egg_hatched` | 알이 깨지고 새끼 생성 | `character_type` |
| `royal_greeting_shown` | 자르반 주니어의 경로우대 문구 표시 | `character_type` |
| `shop_open_attempt` | 기존 판매 링크 새 창 열기 호출 | `character_type`, `link_url` |
| `feed_cleared` | 남아 있던 모이가 모두 소진 | `grains_count`, `duration_ms` |

`shop_open_attempt`는 새 창 열기 **시도**이며, 팝업 성공·쇼핑몰 방문 완료·구매를 의미하지 않는다. 모이 개수는 실제 생성된 수이며, `feed_cleared`는 이전 소진 이후 여러 번 뿌린 모이를 합산한다. 시간은 시작부터 종료까지의 경과 시간으로 백그라운드 시간도 포함하며, 순수 섭취 시간이나 활성 이용 시간은 아니다.

## GA에서 확인하기

- GA4 실시간 보고서에서 이벤트 이름을 확인한다. 광고 차단기, 네트워크 및 브라우저 설정에 따라 전송이 차단될 수 있다. 현재 태그는 로컬 접속에도 적용된다.
- 일반 보고서/탐색에서 매개변수를 사용하려면 **관리 → 데이터 표시 → 맞춤 정의**에서 등록한다.
- 권장 이벤트 범위 맞춤 측정기준: `experience`, `character_type`, `input_method`, `interface_type`, `end_reason`, `result`.
- 필요에 따라 숫자 값 `duration_ms`, `grains_count`, `scatter_batches`를 맞춤 측정항목으로 등록한다. `hit_count`, `burst_number`, `zoom_start`, `zoom_end`도 분석 목적에 맞춰 등록할 수 있다.
- 주요 이벤트 지정은 GA 관리자에서 목적에 맞춰 선택한다. 판매 링크 시도를 구매 이벤트로 취급하지 않는다.

공식 참고: [이벤트 전송](https://developers.google.com/analytics/devguides/collection/ga4/events), [이벤트 매개변수와 맞춤 정의](https://developers.google.com/analytics/devguides/collection/ga4/event-parameters).

## 보존 및 검증

디자인, 움직임, 입력 판정, 타이밍 및 랜덤 분포를 변경하지 않는다. 매 프레임·마우스 이동·모이 한 알·섭취 한 번마다 이벤트를 전송하지 않고 경험의 경계에서만 집계한다. 좌표, 자유 입력 텍스트 또는 개인 식별정보를 추가하지 않는다. 분석 스크립트가 차단되거나 오류가 나도 기존 기능은 계속 실행된다.

`scripts/test-analytics.mjs`는 중복 종료 방지, 배설·알·부화·모이 소진 단계와 분석 실패 시 기능 유지 여부를 검증한다. 터치 회귀 테스트는 제스처 시작·종료가 한 번씩 발생하는지도 검증한다. 브라우저 통합 검증은 실제 마우스·터치 입력과 세 주니어 행동을 실행하되, 테스트 데이터가 실제 GA나 쇼핑몰로 전송되지 않도록 대체 함수를 사용한다. GA 계정 내 수신 결과는 별도로 확인해야 한다.

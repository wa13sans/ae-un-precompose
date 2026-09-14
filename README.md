# Un Precompose for After Effects

**프리컴프 안에 넣었던 레이어, 버튼 한 번으로 다시 꺼내세요.**

![Version](https://img.shields.io/badge/version-1.0.0--beta.1-orange)
![After Effects](https://img.shields.io/badge/After_Effects-2024%2B-9999FF)
![ExtendScript](https://img.shields.io/badge/format-.jsx-yellow)
![License](https://img.shields.io/badge/license-Free_Use_%2F_No_Resale-blue)

After Effects에서 선택한 프리컴프의 내부 레이어를 현재 컴포지션으로 펼치는 무료 JSX 스크립트입니다. 한국어 UI와 도킹 가능한 패널을 제공합니다.

> **1.0.0 Beta · 사전 배포판**  
> AE 2024(24.0) 이상을 대상으로 작성했습니다. 코드 구문 및 모의 동작 검사는 통과했지만 실제 AE에서의 렌더링·UI·Undo 검증은 아직 완료되지 않았습니다. 처음에는 프로젝트 사본에서 결과를 확인해주세요.

## 다운로드

**[베타 릴리스에서 다운로드](https://github.com/wa13sans/ae-un-precompose/releases/tag/v1.0.0-beta.1)**

`Un_Precompose.jsx`만 있으면 실행할 수 있습니다. 묶음 ZIP에는 라이선스와 설명서가 들어 있습니다.

## 사용 방법

1. After Effects에서 **File > Scripts > Run Script File…**을 선택합니다.
2. 다운로드한 **Un_Precompose.jsx**를 엽니다.
3. 작업 중인 컴포지션의 **Timeline에서 프리컴프 레이어를 선택**합니다.
4. 패널의 **Un Precompose** 버튼을 누릅니다.

```text
실행 전                        실행 후
Main Comp                      Main Comp
└─ Title Precomp               ├─ Title Precomp [UnPrecompose CTRL]
   ├─ Text                     ├─ Text
   └─ Shape                    └─ Shape
```

선택한 프리컴프 레이어가 제거되고 내부 레이어가 나옵니다. Project 패널의 원본 컴포지션은 보관됩니다. 여러 프리컴프를 선택해 한 번에 실행할 수 있으며, 중첩된 프리컴프는 한 단계씩 펼칩니다.

**되돌리기:** Windows `Ctrl+Z` / macOS `Cmd+Z`.

### 제어용 Null은 왜 생기나요?

프리컴프 전체에 적용했던 **Position / Scale / Rotation / Anchor Point 애니메이션**을 유지하기 위해서입니다. `[UnPrecompose CTRL]` Null에 외부 Transform을 옮기고, 펼친 레이어를 연결합니다. 이 Null을 삭제하면 배치나 애니메이션이 달라질 수 있습니다.

### 패널로 설치하기

JSX를 해당 AE 버전의 `Scripts/ScriptUI Panels` 폴더에 복사하고 AE를 다시 시작한 뒤 **Window > Un_Precompose.jsx**로 엽니다.

| OS | 설치 폴더 예시 |
| --- | --- |
| Windows | `C:\Program Files\Adobe\Adobe After Effects 2024\Support Files\Scripts\ScriptUI Panels` |
| macOS | `/Applications/Adobe After Effects 2024/Scripts/ScriptUI Panels` |

버전명은 실제 설치 버전에 맞춥니다. 외부 플러그인이나 파일·네트워크 접근 권한 설정은 필요하지 않습니다.

## 주요 기능

- 내부 레이어와 레이어 순서 복원.
- 외부 2D Transform 키프레임을 Null로 이전.
- 프리컴프의 시작 시간에 맞춘 내부 타이밍 이동 및 In/Out 트리밍.
- 내부 Parent / Track Matte 연결 복원.
- 내부 Layer Control 등 레이어 인덱스 참조 재연결.
- 여러 프리컴프 선택 지원 및 한 번의 실행 취소.
- 지원하지 않는 구조는 이유를 표시하고 건너뛰기.
- 복사 실패 시 생성한 레이어를 정리하고 해당 원본 프리컴프 유지.

## 베타 지원 범위

**일반적인 2D 프리컴프, 외부 Time Stretch 100% 기준입니다.**

| 구조 | 처리 |
| --- | --- |
| 내부 2D 도형·텍스트·영상, 내부 이펙트·마스크 | 레이어 복사 |
| 외부 Position / Scale / Rotation / Anchor Point | 제어용 Null로 이전 |
| 내부 Parent / Track Matte | 다시 연결 |
| 외부 Time Remapping / 변경된 Time Stretch | 건너뜀 |
| 3D / Camera / Light / 외부 Collapse Transformations | 건너뜀 |
| 외부 Effect / Mask / Layer Style / Track Matte | 건너뜀 |
| 외부 Opacity 애니메이션 또는 100% 이외의 값 | 건너뜀 |
| 외부 Essential Properties / Expression / Auto-Orient | 건너뜀 |
| 내부 Expression / Adjustment / 비기본 합성 모드 / FPS 차이 | 결과가 달라질 수 있음을 안내 |

프리컴프의 합성 경계가 없어지므로 화면 밖 내용의 잘림, Guide Layer, Motion Blur, 샘플링, 컴포지션별 렌더링 설정은 동일하게 재현되지 않을 수 있습니다. 내부 Expression의 `thisComp`, `time`, `index`, 이름 참조는 자동 변환하지 않습니다. 외부에서 제거되는 프리컴프를 참조하던 Expression·이펙트도 수동 조정이 필요할 수 있습니다.

상세 조건과 확인 순서는 **[사용설명서](사용설명서.md)**를 참고해주세요. 이후 AE 버전의 호환성은 실제 테스트를 통해 확인해야 합니다.

## 무료 사용과 판매 금지

**무료로 쓰고 수정해도 됩니다. 원본이나 수정본 스크립트를 판매하는 것은 금지합니다.**

| 사용 예시 | 허용 여부 |
| --- | --- |
| 개인 작업, 공부, 회사·외주 작업에서 사용 | 허용 |
| 이 도구로 만든 영상·모션그래픽을 납품하거나 판매 | 허용 |
| 코드를 수정해 개인적으로 사용 | 허용 |
| 출처·라이선스·수정 내역을 유지하고 무료 재배포 | 허용 |
| 원본 또는 수정본 스크립트 판매 | 금지 |
| 이름이나 UI를 바꿔 유료 플러그인으로 판매 | 금지 |
| 유료 번들·구독·강의의 제공물로 포함 | 금지 |

전문은 **[LICENSE](LICENSE)**를 따릅니다. 판매 제한이 있는 **소스 공개형 커스텀 라이선스**이며, MIT나 OSI 승인 오픈소스 라이선스가 아닙니다.

## 버그 제보

[Issues](https://github.com/wa13sans/ae-un-precompose/issues)에 다음 내용을 남겨주세요.

- AE의 정확한 버전과 OS.
- 재현 순서, 예상 결과, 실제 결과.
- Expression / Track Matte / 3D / Time Remapping 사용 여부.
- 가능하다면 민감한 자료를 제거한 최소 예제와 오류 메시지.

## 개발 및 검증

실행에는 Node.js가 필요하지 않습니다. 개발용 모의 검사는 `node test_unprecompose.js`로 실행합니다. 이 검사는 Adobe 호스트나 영상 렌더링을 대신하지 않습니다.

변경 내역: [CHANGELOG](CHANGELOG.md).

## 참고

- [Adobe: Scripts in After Effects](https://helpx.adobe.com/uk/after-effects/desktop/automate-in-after-effects/automate-animation/scripts.html)
- [After Effects Scripting Guide](https://ae-scripting.docsforadobe.dev/)

Maintained by **[wa13sans](https://github.com/wa13sans)**. Adobe 및 다른 유료 Un-PreCompose 제품과 무관한 독립 스크립트입니다.


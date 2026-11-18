# 프론트엔드 연동

`LedgerProvider`는 DB와 서비스를 초기화하고 하위 화면에 제공합니다. 최종 화면 연결 시 `App.tsx`의 `IntegrationScreen`을 화면 이동 컴포넌트로 교체합니다. 각 화면은 `LedgerProvider` 내부에서 `useLedger()`를 호출합니다. 초기화에 성공하면 같은 서비스 인스턴스를 재사용하며, 실패 시 재시도할 수 있습니다.

```tsx
import {useLedger} from '../src/context/LedgerProvider';

function ExpenseScreen() {
  const api = useLedger();
  // 이벤트 핸들러에서 api.expenses, api.receipts 등을 호출한다.
  return null;
}
```

## 함수 목록

| 호출 | 입력 | 반환 |
|---|---|---|
| api.newRequestKey() | 없음 | 저장 동작 식별 문자열 |
| api.receipts.analyze(uri, signal?) | 로컬 사진 URI, 선택적 AbortSignal | ReceiptDraft |
| api.expenses.save(input, key) | ExpenseInput, 동일 폼에서 고정한 key | 저장된 Expense |
| api.expenses.list(filter?) | 시작일·종료일·카테고리 | 품목을 제외한 내역 배열 |
| api.expenses.get(id) | 지출 ID | 품목이 포함된 Expense |
| api.expenses.update(id, input) | 지출 ID, 모든 필드 | 수정된 Expense |
| api.expenses.remove(id) | 지출 ID | 완료되면 void |
| api.statistics.monthly('2026-11') | YYYY-MM | 총액·건수·8개 카테고리 금액/비율 |
| api.exports.create(filter, fileName) | 현재 조회 조건, 파일명 | {uri, fileName, count} |

저장소 접근·분석 함수는 Promise를 반환합니다. `newRequestKey()`는 동기 함수입니다. 데이터 변경 후 목록·통계를 다시 조회해야 화면에 반영됩니다. 자동 화면 갱신 이벤트는 구현하지 않았습니다.

## 직접 입력 및 저장

다음은 화면 컴포넌트 내부의 저장 핸들러 예시입니다. `useRef`는 React에서 가져오고, `api`는 `useLedger()`로 받습니다.

```tsx
const requestKey = useRef(api.newRequestKey()); // 렌더/클릭마다 교체하지 않기
const saving = useRef(false);
async function onSave() {
  if (saving.current) return;
  saving.current = true;
  try {
    const saved = await api.expenses.save({
      merchant: '', // 선택 입력
      paidAt: '2026-11-16',
      total: 12000,
      category: '식비',
      memo: '현금 사용',
      items: [],
    }, requestKey.current);
    // 성공 후 폼을 닫고 목록 재조회.
    // 새 폼을 열 때에만 새로운 requestKey를 만든다.
  } catch (e) {
    // AppError.fields의 키를 해당 입력칸 오류에 연결
  } finally {
    saving.current = false;
  }
}
```

`save`는 로컬 DB에 저장합니다. 같은 `key`를 다시 전달하면 DB에 저장된 기존 내역을 반환합니다. 같은 영수증 자동 중복 판정은 아니므로 별도 등록은 새로운 key로 저장합니다. 수정은 update를 사용하며 입력 폼의 값을 임시로 바꾸는 것만으로 DB는 변경되지 않습니다.

## OCR → 검토 → 저장

```ts
const controller = new AbortController();
const draft = await api.receipts.analyze(photoUri, controller.signal);
// draft.total은 null, draft.paidAt/merchant는 빈 문자열일 수 있음.
// draft.reviewFields: 확인할 입력칸, warnings: 안내 메시지.
// 현재 모든 추출 필드를 사용자 확인 대상으로 표시함.
// 검토 화면에 표시하고 수정한 후 save 호출.
// 뒤로가기/취소/화면 해제 시 controller.abort().
```

분석 서비스는 입력 이미지를 앱 캐시로 복사해 처리하고, 분석 종료 시 해당 복사본을 정리합니다. 검토 화면에서도 사진을 표시할 경우 화면이 사용하는 URI의 수명과 정리 시점을 별도로 관리해야 합니다. 현재 연결 확인 화면은 사진 미리보기를 유지하지 않으며, 분석 후 ImagePicker가 만든 앱 캐시도 정리합니다.

촬영·선택 과정에서 생성한 앱 소유 임시 파일은 저장·취소·실패 및 다음 실행 시 정리합니다. 외부 갤러리 원본은 삭제하지 않습니다.

ML Kit 작업 자체에 강제 취소 API가 없어서 cancel은 결과 전달을 차단하고 recognizer를 닫습니다. 이미 시작한 네이티브 연산이 즉시 중단되는지는 보장하지 않으며, 완료 후 늦은 결과가 저장되거나 UI에 적용되지는 않습니다. 재시도할 때는 정리된 복사본 대신 사용 가능한 원본 URI를 전달하거나 사진을 다시 선택합니다.

## 목록·통계·CSV

```ts
const filter = {startDate:'2026-11-01', endDate:'2026-11-30', category:'식비' as const};
const rows = await api.expenses.list(filter);
const stats = await api.statistics.monthly('2026-11');
const file = await api.exports.create(filter, '11월_식비');
```

필터 시작·종료일은 포함합니다. 정렬은 결제일 내림차순 → 생성 순번 내림차순입니다. CSV는 같은 filter를 전달해야 현재 목록과 일치합니다. export는 파일을 생성할 뿐 자동 전송하지 않습니다. 사용자가 명시적으로 공유를 누른 경우에만 `expo-sharing`의 `shareAsync(file.uri, {mimeType:'text/csv'})`를 호출합니다. 임시 CSV는 다음 앱 시작 시 정리하므로 사용자에게 별도 보관하도록 안내합니다.

## 오류 표시

```ts
import {AppError,errorMessage} from '../src/errors';
try { /* await 호출 */ }
catch (e) {
  const message = errorMessage(e);
  if (e instanceof AppError && e.code === 'VALIDATION') {
    // e.fields.total, paidAt, merchant, category, memo,
    // items.0.name / quantity / amount, fileName 등 표시
  }
}
```

타임아웃·글자 없음·이미지 오류에는 재촬영/재선택/직접 입력 경로를 제공합니다. UI는 저장 완료 Promise가 성공한 경우에만 성공 메시지를 표시해야 합니다.

## UI 연동 항목

- 촬영·사진 선택 권한 처리와 미리보기
- 화면 이동 및 필드별 오류 표시
- 품목 행 추가·수정·삭제
- 기간·카테고리 필터와 통계 그래프
- 빈 상태 및 360dp 레이아웃
- 공유 취소 처리와 전체 사용자 흐름 E2E 테스트

`examples/IntegrationScreen.tsx`는 서비스 연결 확인용 화면입니다.

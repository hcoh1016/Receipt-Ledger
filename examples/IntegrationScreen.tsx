// 최종 UI가 아닌 연결 확인 화면. 프론트엔드 담당자가 자기 화면으로 교체한다.
import React, { useState, useRef, useEffect } from "react";
import { ScrollView, Text, TextInput, Button, View, Alert } from "react-native";
import * as Picker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useLedger } from "../src/context/LedgerProvider";
import { today } from "../src/utils/dateUtils";
import { CATEGORIES, type Category } from "../src/constants/categories";
import { parseAmountInput } from "../src/validators/expenseValidator";
import { AppError, errorMessage } from "../src/errors";
import type { ExpenseItem } from "../src/types/expense";
import { cleanPickerCopy } from "../src/services/pickerCacheService";
export function IntegrationScreen() {
  const api = useLedger();
  const [merchant, setMerchant] = useState(""),
    [date, setDate] = useState(today()),
    [amount, setAmount] = useState(""),
    [category, setCategory] = useState<Category>("기타"),
    [memo, setMemo] = useState(""),
    [items, setItems] = useState<ExpenseItem[]>([]);
  const [rows, setRows] = useState<
      Awaited<ReturnType<typeof api.expenses.list>>
    >([]),
    [info, setInfo] = useState(""),
    [busy, setBusy] = useState(false),
    [editId, setEditId] = useState<string | null>(null);
  const key = useRef(api.newRequestKey()),
    controller = useRef<AbortController | null>(null),
    gate = useRef(false);
  const refresh = async () => {
    setRows(await api.expenses.list());
    const s = await api.statistics.monthly(date.slice(0, 7));
    setInfo(`${s.month}: ${s.total.toLocaleString()}원 / ${s.count}건`);
  };
  useEffect(() => {
    void api.expenses
      .list()
      .then(setRows)
      .catch((e) => setInfo(errorMessage(e)));
    return () => controller.current?.abort();
  }, [api]);
  async function run(fn: () => Promise<void>) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setInfo(
        e instanceof AppError
          ? errorMessage(e) + " " + Object.values(e.fields).join(" / ")
          : errorMessage(e),
      );
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  function reset() {
    setMerchant("");
    setDate(today());
    setAmount("");
    setCategory("기타");
    setMemo("");
    setItems([]);
    setEditId(null);
    key.current = api.newRequestKey();
  }
  async function scan(camera: boolean) {
    if (camera) {
      const p = await Picker.requestCameraPermissionsAsync();
      if (!p.granted) {
        setInfo("카메라 권한이 없습니다. 아래에서 직접 입력할 수 있습니다.");
        return;
      }
    }
    const result = camera
      ? await Picker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 })
      : await Picker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsMultipleSelection: false,
          quality: 1,
        });
    if (result.canceled) return;
    controller.current = new AbortController();
    const uri = result.assets[0].uri;
    let draft;
    try {
      draft = await api.receipts.analyze(uri, controller.current.signal);
    } finally {
      await cleanPickerCopy(uri);
    }
    reset();
    setMerchant(draft.merchant);
    setDate(draft.paidAt);
    setAmount(draft.total === null ? "" : String(draft.total));
    setCategory(draft.category);
    setItems(draft.items);
    setInfo("인식값을 확인한 뒤 저장해 주세요. " + draft.warnings.join(" "));
  }
  const field = (label: string, value: string, set: (s: string) => void) => (
    <View style={{ marginVertical: 6 }}>
      <Text>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={set}
        editable={!busy}
        style={{ borderWidth: 1, borderColor: "#aaa", padding: 10 }}
      />
    </View>
  );
  return (
    <ScrollView
      contentContainerStyle={{ padding: 24, paddingTop: 50, gap: 10 }}
    >
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>
        공용·데이터·OCR 연결 확인
      </Text>
      <Text>{info}</Text>
      <Button
        title="촬영 후 분석"
        disabled={busy}
        onPress={() => void run(() => scan(true))}
      />
      <Button
        title="사진 선택 후 분석"
        disabled={busy}
        onPress={() => void run(() => scan(false))}
      />
      {busy && (
        <Button title="분석 취소" onPress={() => controller.current?.abort()} />
      )}
      {field("사용처 (선택)", merchant, setMerchant)}
      {field("결제일 YYYY-MM-DD", date, setDate)}
      {field("총액 (원)", amount, setAmount)}
      {field("메모", memo, setMemo)}
      <Text>카테고리: {category}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {CATEGORIES.map((c) => (
          <Button
            key={c}
            title={c}
            disabled={busy}
            onPress={() => setCategory(c)}
          />
        ))}
      </View>
      <Text>
        추출 품목: {items.length}개 (이 확인 화면에서는 품목 편집 UI 생략)
      </Text>
      <Button
        title={editId ? "수정 저장" : "새 지출 저장"}
        disabled={busy}
        onPress={() =>
          void run(async () => {
            const input = {
              merchant,
              paidAt: date,
              total: parseAmountInput(amount),
              category,
              memo,
              items,
            };
            if (editId) await api.expenses.update(editId, input);
            else await api.expenses.save(input, key.current);
            reset();
            await refresh();
          })
        }
      />
      <Button title="입력 취소 / 새로 입력" disabled={busy} onPress={reset} />
      <Button
        title="목록·입력한 월 통계 새로고침"
        disabled={busy}
        onPress={() => void run(refresh)}
      />
      <Text>
        앱 삭제·기기 초기화 시 기록이 소실될 수 있습니다. CSV 파일을 별도로
        보관해 주세요.
      </Text>
      <Button
        title="전체 CSV 생성·공유"
        disabled={busy}
        onPress={() =>
          void run(async () => {
            const f = await api.exports.create({}, "가계부");
            if (await Sharing.isAvailableAsync())
              await Sharing.shareAsync(f.uri, { mimeType: "text/csv" });
            else setInfo("CSV 생성됨: " + f.uri);
          })
        }
      />
      {rows.map((r) => (
        <View
          key={r.id}
          style={{ paddingVertical: 8, borderTopWidth: 1, borderColor: "#ddd" }}
        >
          <Text>
            {r.paidAt} / {r.merchant || "사용처 없음"} /{" "}
            {r.total.toLocaleString()}원 / {r.category}
          </Text>
          <Button
            title="상세·수정"
            disabled={busy}
            onPress={() =>
              void run(async () => {
                const d = await api.expenses.get(r.id);
                setEditId(d.id);
                setMerchant(d.merchant);
                setDate(d.paidAt);
                setAmount(String(d.total));
                setCategory(d.category);
                setMemo(d.memo);
                setItems(d.items);
              })
            }
          />
          <Button
            title="삭제"
            disabled={busy}
            onPress={() =>
              Alert.alert("삭제 확인", "지출과 품목을 삭제할까요?", [
                { text: "취소", style: "cancel" },
                {
                  text: "삭제",
                  style: "destructive",
                  onPress: () =>
                    void run(async () => {
                      await api.expenses.remove(r.id);
                      if (editId === r.id) reset();
                      await refresh();
                    }),
                },
              ])
            }
          />
        </View>
      ))}
    </ScrollView>
  );
}

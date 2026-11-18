import React, { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Field, Notice, s } from '../components/ui';
import { CATEGORIES } from '../constants/categories';
import { useLedger } from '../context/LedgerProvider';
import { AppError, errorMessage } from '../errors';
import { formInput, makeForm } from '../state/form';
import type { Expense, ReceiptDraft } from '../types/expense';
export function ExpenseFormScreen({ initial, onSaved, onBusy }: {
  initial?: Expense | ReceiptDraft;
  onSaved: (saved: Expense) => void;
  onBusy: (busy: boolean) => void;
}) {
  const api = useLedger(), [form, setForm] = useState(() => makeForm(initial)), [errors, setErrors] = useState<Record<string, string>>({}), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const key = useRef<string | null>(null), gate = useRef(false), scroll = useRef<ScrollView>(null);
  if (!key.current)
    key.current = api.newRequestKey();
  const edit = initial && 'id' in initial ? initial.id : null;
  const change = <K extends keyof typeof form>(name: K, value: (typeof form)[K]) => setForm(f => ({ ...f, [name]: value }));
  async function save() {
    if (gate.current)
      return; gate.current = true; setBusy(true); onBusy(true); setErrors({}); setMessage(''); try {
        const input = formInput(form);
        const saved = edit ? await api.expenses.update(edit, input) : await api.expenses.save(input, key.current!);
        onSaved(saved);
      }
    catch (e) {
      setMessage(errorMessage(e));
      if (e instanceof AppError)
        setErrors(e.fields);
      scroll.current?.scrollTo({ y: 0, animated: true });
    }
    finally {
      gate.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
    <Text style={s.title}>{edit ? '지출 수정' : initial ? '인식 결과 확인' : '직접 입력'}</Text><Text style={s.muted}>결제일과 금액을 확인해 주세요. 사용처는 선택 입력이에요.</Text>
    {initial && 'warnings' in initial && <Notice text={['자동 인식한 정보예요. 모든 항목을 확인한 뒤 저장해 주세요.', ...initial.warnings].join('\n')} />}
    {!!message && <Notice text={message} error />}
    <Field label="사용처 (선택)" testID="expense-merchant" value={form.merchant} onChangeText={v => change('merchant', v)} error={errors.merchant} editable={!busy} maxLength={100} placeholder="어디에서 사용했나요?" />
    <Field label="결제일 *" testID="expense-date" value={form.paidAt} onChangeText={v => change('paidAt', v)} error={errors.paidAt} editable={!busy} placeholder="YYYY-MM-DD" maxLength={10} />
    <Field label="금액 (원) *" testID="expense-total" value={form.total} onChangeText={v => change('total', v)} error={errors.total} editable={!busy} keyboardType="number-pad" placeholder="0" />
    <Text style={s.label}>카테고리</Text><View style={s.wrap}>{CATEGORIES.map(c => <Button key={c} title={c} secondary={form.category !== c} disabled={busy} onPress={() => change('category', c)} testID={`category-${c}`} />)}</View>
    <Field label="메모 (선택)" testID="expense-memo" value={form.memo} onChangeText={v => change('memo', v)} error={errors.memo} editable={!busy} maxLength={500} multiline placeholder="기억하고 싶은 내용을 남겨 주세요" />
    <View style={s.between}><Text style={s.heading}>품목 {form.items.length}개</Text><Button title="+ 품목 추가" secondary disabled={busy} onPress={() => change('items', [...form.items, { name: '', quantity: '', amount: '' }])} /></View>
    {form.items.map((item, i) => <View key={i} style={s.card}>
      {(['name', 'quantity', 'amount'] as const).map(k => <Field key={k} label={k === 'name' ? '품목명' : k === 'quantity' ? '수량 (선택)' : '품목 금액 (선택)'} testID={`item-${i}-${k}`} value={item[k]} error={errors[`items.${i}.${k}`]} editable={!busy} keyboardType={k === 'name' ? 'default' : 'number-pad'} onChangeText={v => change('items', form.items.map((r, n) => n === i ? { ...r, [k]: v } : r))} />)}
      <Button title="품목 삭제" secondary disabled={busy} onPress={() => change('items', form.items.filter((_, n) => n !== i))} /></View>)}
    <Button title={busy ? '저장하고 있어요…' : edit ? '수정 저장' : '지출 저장'} testID="expense-save" disabled={busy} onPress={() => void save()} />
  </ScrollView>;
}

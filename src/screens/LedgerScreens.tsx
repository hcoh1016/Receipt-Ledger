import React, { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Empty, Field, Loading, Notice, colors, money, s } from '../components/ui';
import { CATEGORIES, type Category } from '../constants/categories';
import { useLedger } from '../context/LedgerProvider';
import { useLedgerQuery } from '../hooks/useLedgerQuery';
import { monthRange, today } from '../utils/dateUtils';
import { shiftMonth } from '../state/form';
import { AppError, errorMessage } from '../errors';
import { validateFilter } from '../validators/expenseValidator';
import { shareCsv } from '../services/shareService';
import type { Expense, ExpenseFilter } from '../types/expense';
type Row = Omit<Expense, 'items'>;
export function ExpenseRows({ rows, onOpen }: {
  rows: Row[];
  onOpen: (id: string) => void;
}) { return <View style={{ gap: 8 }}>{rows.map(r => <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`${r.merchant || '사용처 없음'}, ${money(r.total)}, ${r.paidAt}`} onPress={() => onOpen(r.id)} testID={`expense-row-${r.id}`} style={[s.card, { padding: 16 }]}><View style={s.between}><Text style={[s.heading, { fontSize: 16, flex: 1 }]}>{r.merchant || '사용처 없음'}</Text><Text style={[s.label, { fontSize: 17 }]}>{money(r.total)}</Text></View><Text style={s.muted}>{r.paidAt} · {r.category}</Text></Pressable>)}</View>; }
export function HomeScreen({ onAdd, onOpen, onList }: {
  onAdd: () => void;
  onOpen: (id: string) => void;
  onList: () => void;
}) {
  const api = useLedger(), month = today().slice(0, 7);
  const q = useLedgerQuery(useCallback(async () => { const [stats, previous, rows] = await Promise.all([api.statistics.monthly(month), api.statistics.monthly(shiftMonth(month, -1)), api.expenses.list(monthRange(month))]); return { stats, previous, rows }; }, [api, month]));
  return <ScrollView contentContainerStyle={s.page}><View><Text style={[s.muted, { letterSpacing: 2, fontSize: 11 }]}>RECEIPT LEDGER</Text><Text style={[s.title, { marginTop: 8 }]}>가볍게 기록하는 하루</Text></View>
    {q.loading ? <Loading /> : q.error ? <><Notice text={q.error} error /><Button title="다시 시도" onPress={q.retry} /></> : q.data && <><View style={[s.card, { backgroundColor: colors.green, borderColor: colors.green, padding: 24 }]}><Text style={{ color: '#D7E9DF' }}>{month.replace('-', '년 ')}월 총지출</Text><Text testID="home-total" style={{ fontSize: 34, fontWeight: '800', color: 'white' }}>{money(q.data.stats.total)}</Text><Text style={{ color: '#D7E9DF' }}>{q.data.previous.total ? `전월 전체 대비 ${Math.abs((q.data.stats.total / q.data.previous.total - 1) * 100).toFixed(1)}% ${q.data.stats.total >= q.data.previous.total ? '증가' : '감소'}` : '전월 기록이 없어 비교할 수 없어요'}</Text></View><Button title="+ 지출 등록" testID="add-expense" onPress={onAdd} /><View style={s.between}><Text style={s.heading}>이번 달 최근 지출</Text><Button title="전체 보기" secondary onPress={onList} /></View>{q.data.rows.length ? <ExpenseRows rows={q.data.rows.slice(0, 5)} onOpen={onOpen} /> : <Empty />}</>}
    <Notice text="나의 기록은 내 기기에만. 영수증과 지출 정보를 서버로 보내지 않아요." /></ScrollView>;
}
export function ListScreen({ filter, onFilter, onOpen, onExport }: {
  filter: ExpenseFilter;
  onFilter: (f: ExpenseFilter) => void;
  onOpen: (id: string) => void;
  onExport: () => void;
}) {
  const api = useLedger(), [search, setSearch] = useState(filter.search ?? ''), [start, setStart] = useState(filter.startDate ?? ''), [end, setEnd] = useState(filter.endDate ?? ''), [category, setCategory] = useState<Category | undefined>(filter.category), [errors, setErrors] = useState<Record<string, string>>({});
  const q = useLedgerQuery(useCallback(() => api.expenses.list(filter), [api, filter]));
  const apply = () => {
    try {
      const f = validateFilter({ startDate: start || undefined, endDate: end || undefined, category, search });
      setErrors({});
      onFilter(f);
    }
    catch (e) {
      if (e instanceof AppError)
        setErrors(e.fields);
    }
  };
  const header = <View style={{ gap: 20, marginBottom: 16 }}><Text style={s.title}>지출 내역</Text><View style={s.card}><Text style={s.heading}>조회 조건</Text><Field label="사용처 검색" testID="filter-search" value={search} onChangeText={setSearch} maxLength={100} placeholder="사용처 이름으로 검색" error={errors.search} /><Field label="시작일" value={start} onChangeText={setStart} placeholder="YYYY-MM-DD" error={errors.startDate} /><Field label="종료일" value={end} onChangeText={setEnd} placeholder="YYYY-MM-DD" error={errors.endDate} /><View style={s.wrap}>{[undefined, ...CATEGORIES].map(c => <Pressable key={c ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: category === c }} style={[s.chip, category === c && s.chipOn]} onPress={() => setCategory(c)}><Text style={[s.chipText, category === c && { color: 'white' }]}>{c ?? '전체'}</Text></Pressable>)}</View><Button title="조건 적용" testID="filter-apply" onPress={apply} /><Button title="전체 기간으로 초기화" secondary onPress={() => { setSearch(''); setStart(''); setEnd(''); setCategory(undefined); setErrors({}); onFilter({}); }} /></View>
    <Text style={s.muted}>적용 중: {filter.startDate ?? '전체 시작일'} ~ {filter.endDate ?? '전체 종료일'} · {filter.category ?? '전체 카테고리'}{filter.search ? " · 검색: " + filter.search : ''}</Text>
    {q.loading ? <Loading /> : q.error ? <><Notice text={q.error} error /><Button title="다시 시도" onPress={q.retry} /></> : q.data && <View style={s.between}><Text style={s.heading}>{q.data.length}건</Text><Text style={s.heading}>{money(q.data.reduce((sum, r) => sum + r.total, 0))}</Text></View>}</View>;
  return <FlatList<Row> keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 32 }} data={q.loading || q.error ? [] : q.data ?? []} keyExtractor={row => row.id} renderItem={({ item }) => <ExpenseRows rows={[item]} onOpen={onOpen} />} initialNumToRender={12} windowSize={7} ItemSeparatorComponent={() => <View style={{ height: 8 }} />} ListHeaderComponent={header} ListEmptyComponent={!q.loading && !q.error ? <Empty title="조회된 지출이 없어요" description="기간이나 카테고리를 바꿔 보세요." /> : null} ListFooterComponent={!q.loading && !q.error ? <View style={{ marginTop: 20 }}><Button title="이 조건으로 내보내기" secondary onPress={onExport} /></View> : null} />;
}
export function DetailScreen({ id, onEdit, onDeleted, onBusy }: {
  id: string;
  onEdit: (e: Expense) => void;
  onDeleted: () => void;
  onBusy: (v: boolean) => void;
}) {
  const api = useLedger(), q = useLedgerQuery(useCallback(() => api.expenses.get(id), [api, id])), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), gate = useRef(false);
  async function remove() {
    if (gate.current)
      return; gate.current = true; setBusy(true); onBusy(true); try {
        await api.expenses.remove(id);
        onDeleted();
      }
    catch (e) {
      setMessage(errorMessage(e));
    }
    finally {
      gate.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return <ScrollView contentContainerStyle={s.page}><Text style={s.title}>지출 상세</Text>{q.loading ? <Loading /> : q.error ? <><Notice text={q.error} error /><Button title="다시 시도" onPress={q.retry} /></> : q.data && <><View style={s.card}><Text style={s.muted}>{q.data.category} · {q.data.paidAt}</Text><Text style={s.heading}>{q.data.merchant || '사용처 없음'}</Text><Text style={[s.title, { fontSize: 34 }]}>{money(q.data.total)}</Text><Text style={s.muted}>{q.data.memo || '메모가 없어요.'}</Text></View><Text style={s.heading}>품목 {q.data.items.length}개</Text>{q.data.items.map((i, n) => <View key={n} style={s.card}><Text style={s.label}>{i.name}</Text><Text style={s.muted}>수량 {i.quantity ?? '미입력'} · {i.amount === null ? '금액 미입력' : money(i.amount)}</Text></View>)}{!!message && <Notice text={message} error />}<Button title="수정하기" disabled={busy} testID="expense-edit" onPress={() => onEdit(q.data!)} /><Button title="지출 삭제" disabled={busy} testID="expense-delete" secondary onPress={() => Alert.alert('지출을 삭제할까요?', '삭제한 지출과 품목은 복구할 수 없어요.', [{ text: '취소', style: 'cancel' }, { text: '삭제', style: 'destructive', onPress: () => void remove() }])} /></>}</ScrollView>;
}
export function StatisticsScreen({ onCategory }: {
  onCategory: (f: ExpenseFilter) => void;
}) {
  const api = useLedger(), [month, setMonth] = useState(today().slice(0, 7)), q = useLedgerQuery(useCallback(() => api.statistics.monthly(month), [api, month]));
  return <ScrollView contentContainerStyle={s.page}><Text style={s.title}>한눈에 보는 소비</Text><View style={s.between}><Button title="이전 달" secondary onPress={() => setMonth(m => shiftMonth(m, -1))} /><Text style={s.heading}>{month}</Text><Button title="다음 달" secondary onPress={() => setMonth(m => shiftMonth(m, 1))} /></View>{q.loading ? <Loading /> : q.error ? <><Notice text={q.error} error /><Button title="다시 시도" onPress={q.retry} /></> : q.data && <><View style={s.card}><Text style={s.muted}>이번 달 총지출 · {q.data.count}건</Text><Text testID="statistics-total" style={s.title}>{money(q.data.total)}</Text></View>{!q.data.total && <Empty title="이 달의 기록을 기다려요" description="지출을 등록하면 분류별 소비를 확인할 수 있어요." />}<Text style={s.heading}>카테고리별 지출</Text>{q.data.categories.map(c => <Pressable key={c.category} accessibilityRole="button" accessibilityLabel={`${c.category} ${money(c.amount)}, ${c.percentage.toFixed(1)}퍼센트, 내역 보기`} style={s.card} onPress={() => onCategory({ ...monthRange(month), category: c.category })}><View style={s.between}><Text style={s.label}>{c.category}</Text><Text style={s.label}>{money(c.amount)}</Text></View><View style={{ height: 8, backgroundColor: colors.pale, borderRadius: 4, overflow: 'hidden' }}><View style={{ height: 8, width: `${Math.min(100, Math.max(0, c.percentage))}%`, backgroundColor: colors.green }} /></View><Text style={s.muted}>{c.percentage.toFixed(1)}% · 내역 보기 ›</Text></Pressable>)}</>}</ScrollView>;
}
export function ExportScreen({ filter, onBusy }: {
  filter: ExpenseFilter;
  onBusy: (v: boolean) => void;
}) {
  const api = useLedger(), q = useLedgerQuery(useCallback(() => api.expenses.list(filter), [api, filter])), [name, setName] = useState(`가계부_${today()}`), [message, setMessage] = useState(''), [fieldError, setFieldError] = useState(''), [busy, setBusy] = useState(false), gate = useRef(false);
  async function exportFile() {
    if (gate.current)
      return; gate.current = true; setBusy(true); onBusy(true); setMessage(''); setFieldError(''); try {
        const file = await api.exports.create(filter, name);
        await shareCsv(file.uri);
        setMessage('공유 화면을 닫았어요. 원본 지출 내역은 그대로 유지됩니다. 파일 저장 여부는 선택한 앱에서 확인해 주세요.');
      }
    catch (e) {
      setMessage(errorMessage(e));
      if (e instanceof AppError)
        setFieldError(e.fields.fileName ?? '');
    }
    finally {
      gate.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}><Text style={s.title}>기록 내보내기</Text><Text style={s.muted}>필요한 기록을 CSV 파일로 보관하세요.</Text><View style={s.card}><Text style={s.heading}>현재 조회 조건</Text><Text style={s.muted}>{filter.startDate ?? '전체 시작일'} ~ {filter.endDate ?? '전체 종료일'}</Text><Text style={s.muted}>{filter.category ?? '전체 카테고리'}{filter.search ? " · 검색: " + filter.search : ''}</Text>{q.loading ? <Loading /> : q.error ? <><Notice error text={q.error} /><Button title="다시 시도" onPress={q.retry} /></> : <Text style={s.heading}>{q.data?.length ?? 0}건 · {money(q.data?.reduce((sum, r) => sum + r.total, 0) ?? 0)}</Text>}</View><Field label="파일명" testID="export-filename" value={name} editable={!busy} onChangeText={setName} error={fieldError} /><Text style={s.muted}>확장자 .csv는 자동으로 붙어요. 내역이 없으면 제목 행만 생성돼요.</Text><Notice text="앱 삭제·기기 초기화 시 기록이 사라질 수 있어요. CSV 파일은 다른 위치에 별도로 보관해 주세요." />{!!message && <Notice text={message} />}<Button title={busy ? '파일을 준비하고 있어요…' : 'CSV 생성 및 공유'} testID="export-share" disabled={busy || q.loading || !!q.error} onPress={() => void exportFile()} /></ScrollView>;
}

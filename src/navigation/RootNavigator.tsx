import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, s } from '../components/ui';
import { today, monthRange } from '../utils/dateUtils';
import type { Expense, ExpenseFilter, ReceiptDraft } from '../types/expense';
import { HomeScreen, ListScreen, DetailScreen, StatisticsScreen, ExportScreen } from '../screens/LedgerScreens';
import { ExpenseFormScreen } from '../screens/ExpenseFormScreen';
import { ReceiptScreen } from '../screens/ReceiptScreen';
import { AnalysisResultScreen, HistoryScreen } from '../screens/AnalysisScreens';
import type { AnalysisRecord } from '../database/historyRepository';
type Tab = 'home' | 'list' | 'statistics' | 'export' | 'history';
type Route = {name: 'result'; result: ReceiptDraft & AnalysisRecord & {historyError?:string}} | {
  name: 'main';
} | {
  name: 'receipt';
} | {
  name: 'form';
  initial?: Expense | ReceiptDraft;
} | {
  name: 'detail';
  id: string;
};
export function RootNavigator() {
  const [tab, setTab] = useState<Tab>('home'), [route, setRoute] = useState<Route>({ name: 'main' }), [filter, setFilter] = useState<ExpenseFilter>(() => monthRange(today().slice(0, 7))), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const goBack = () => {
    if (busy)
      return; if (route.name === 'form')
      Alert.alert('입력을 취소할까요?', '저장하지 않은 입력은 사라져요.', [{ text: '계속 입력', style: 'cancel' }, { text: '입력 취소', onPress: () => setRoute({ name: 'main' }) }]);
    else
      setRoute({ name: 'main' });
  };
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy)
        return true; if (route.name !== 'main') {
          goBack();
          return true;
        } if (tab !== 'home') {
          setTab('home');
          return true;
        } return false;
    }); return () => handler.remove();
  }, [route, tab, busy]);
  const open = (id: string) => { setNotice(''); setRoute({ name: 'detail', id }); };
  const done = (message: string) => { setRoute({ name: 'main' }); setTab('list'); setNotice(message); };
  const tabs: {
    key: Tab;
    label: string;
    icon: string;
  }[] = [{ key: 'history', label: '분석 이력', icon: '≡' },{ key: 'home', label: '홈', icon: '⌂' }, { key: 'list', label: '내역', icon: '▤' }, { key: 'statistics', label: '통계', icon: '▥' }, { key: 'export', label: '내보내기', icon: '↗' }];
  return <SafeAreaView style={styles.safe}><StatusBar barStyle="dark-content" backgroundColor={colors.paper} /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.header}>{route.name !== 'main' ? <Pressable accessibilityRole="button" accessibilityLabel="뒤로" disabled={busy} style={{ padding: 12 }} onPress={goBack}><Text style={{ color: colors.green, fontSize: 17 }}>‹ 뒤로</Text></Pressable> : <Text style={styles.brand}>ReceiptLedger</Text>}<Text style={styles.local}>● 기기에 안전하게</Text></View>
    {!!notice && route.name === 'main' && <Pressable accessibilityRole="button" accessibilityLabel="알림 닫기" onPress={() => setNotice('')} style={{ padding: 12, backgroundColor: colors.pale }}><Text accessibilityLiveRegion="polite" style={{ color: colors.green }}>{notice}  ×</Text></Pressable>}
    <View style={{ flex: 1 }}>{route.name === 'receipt' ? <ReceiptScreen onManual={() => setRoute({ name: 'form' })} onResult={result => setRoute({ name: 'result', result })} /> : route.name === 'result' ? <AnalysisResultScreen result={route.result} onContinue={() => setRoute({name:'form',initial:route.result})}/> : route.name === 'form' ? <ExpenseFormScreen initial={route.initial} onBusy={setBusy} onSaved={saved => { setFilter(monthRange(saved.paidAt.slice(0, 7))); done('지출을 저장했어요.'); }} /> : route.name === 'detail' ? <DetailScreen id={route.id} onBusy={setBusy} onEdit={initial => setRoute({ name: 'form', initial })} onDeleted={() => done('지출을 삭제했어요.')} /> : tab === 'history' ? <HistoryScreen/> : tab === 'home' ? <HomeScreen onAdd={() => setRoute({ name: 'receipt' })} onOpen={open} onList={() => setTab('list')} /> : tab === 'list' ? <ListScreen filter={filter} onFilter={setFilter} onOpen={open} onExport={() => setTab('export')} /> : tab === 'statistics' ? <StatisticsScreen onCategory={f => { setFilter(f); setTab('list'); }} /> : <ExportScreen filter={filter} onBusy={setBusy} />}</View>
    {route.name === 'main' && <View style={styles.tabs}>{tabs.map(t => <Pressable key={t.key} accessibilityRole="tab" accessibilityState={{ selected: tab === t.key, disabled: busy }} testID={`tab-${t.key}`} disabled={busy} onPress={() => { setTab(t.key); setNotice(''); }} style={styles.tab}><Text style={{ fontSize: 22, color: tab === t.key ? colors.green : colors.muted }}>{t.icon}</Text><Text style={{ fontSize: 12, fontWeight: tab === t.key ? '700' : '400', color: tab === t.key ? colors.green : colors.muted }}>{t.label}</Text></Pressable>)}</View>}
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.paper }, header: { height: 54, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { fontSize: 18, fontWeight: '800', color: colors.green }, local: { fontSize: 11, color: colors.muted }, tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line, backgroundColor: 'white', paddingVertical: 10 }, tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 4 } });

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
export const colors = { ink: '#192D29', muted: '#687C75', green: '#226B53', pale: '#E9F2ED', paper: '#F6F8F5', line: '#DCE5DF', red: '#AE4039' };
export const money = (n: number) => `${n.toLocaleString('ko-KR')}원`;
export function Button({ title, onPress, secondary = false, disabled = false, testID }: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} testID={testID} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, { opacity: disabled ? .45 : pressed ? .75 : 1 }]}><Text style={[s.buttonText, secondary && { color: colors.green }]}>{title}</Text></Pressable>;
}
export function Field({ label, error, ...props }: TextInputProps & {
  label: string;
  error?: string;
}) {
  return <View style={{ gap: 7, flexGrow: 1 }}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#81938B" {...props} style={[s.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }, !!error && { borderColor: colors.red }, props.style]} />{error && <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}</View>;
}
export function Notice({ text, error = false }: {
  text: string;
  error?: boolean;
}) { return <View style={[s.notice, error && { backgroundColor: '#FBEDE9' }]}><Text accessibilityLiveRegion="polite" style={{ color: error ? colors.red : colors.green, lineHeight: 21 }}>{text}</Text></View>; }
export function Empty({ title = '아직 기록이 없어요', description = '첫 지출을 등록하고 소비 기록을 시작해 보세요.' }: {
  title?: string;
  description?: string;
}) { return <View style={s.empty}><Text style={{ fontSize: 34, color: colors.green }}>▤</Text><Text style={s.heading}>{title}</Text><Text style={s.muted}>{description}</Text></View>; }
export function Loading() { return <View style={s.empty}><ActivityIndicator color={colors.green} /><Text style={s.muted}>기록을 불러오고 있어요</Text></View>; }
export const s = StyleSheet.create({
  page: { padding: 20, gap: 20, paddingBottom: 32 }, title: { fontSize: 28, fontWeight: '800', color: colors.ink }, heading: { fontSize: 19, fontWeight: '700', color: colors.ink }, muted: { fontSize: 14, color: colors.muted, lineHeight: 21 }, label: { fontSize: 14, fontWeight: '600', color: colors.ink },
  card: { padding: 20, borderRadius: 22, backgroundColor: 'white', gap: 16, borderWidth: 1, borderColor: colors.line }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  button: { minHeight: 50, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.green, justifyContent: 'center', alignItems: 'center' }, secondary: { backgroundColor: colors.pale }, buttonText: { fontSize: 15, fontWeight: '700', color: 'white' },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: 'white', borderRadius: 12, padding: 14, color: colors.ink, fontSize: 16, minHeight: 50 }, error: { color: colors.red, fontSize: 13, lineHeight: 19 }, notice: { padding: 15, borderRadius: 14, backgroundColor: colors.pale }, empty: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  chip: { borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, minHeight: 44, backgroundColor: 'white', borderWidth: 1, borderColor: colors.line }, chipOn: { backgroundColor: colors.green, borderColor: colors.green }, chipText: { color: colors.muted, fontWeight: '600' }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

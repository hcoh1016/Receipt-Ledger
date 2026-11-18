import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, Text, View } from 'react-native';
import { Button, Notice, colors, s } from '../components/ui';
import { useLedger } from '../context/LedgerProvider';
import { errorMessage } from '../errors';
import { selectReceipt } from '../services/imageService';
import { cleanPickerCopy } from '../services/pickerCacheService';
import { CameraScreen } from './CameraScreen';
import { cleanCapture } from '../services/captureCacheService';
const cleanPhoto = async (uri: string) => { await cleanPickerCopy(uri); await cleanCapture(uri); };
import type { AnalysisRecord } from '../database/historyRepository';
import type { ReceiptDraft } from '../types/expense';
export function ReceiptScreen({ onManual, onResult }: {
  onManual: () => void;
  onResult: (draft: ReceiptDraft & AnalysisRecord & { historyError?: string }) => void;
}) {
  const api = useLedger(), [cameraOpen, setCameraOpen] = useState(false), [uri, setUri] = useState<string | null>(null), [busy, setBusy] = useState(false), [analyzing, setAnalyzing] = useState(false), [message, setMessage] = useState(''), [seconds, setSeconds] = useState(0);
  const selected = useRef<string | null>(null), controller = useRef<AbortController | null>(null), alive = useRef(true), gate = useRef(false);
  useEffect(() => {
    alive.current = true; return () => {
      alive.current = false; controller.current?.abort(); if (selected.current)
        void cleanPhoto(selected.current).catch(() => { });
    };
  }, []);
  useEffect(() => {
    if (!analyzing)
      return; const t = setInterval(() => setSeconds(v => v + 1), 1000); return () => clearInterval(t);
  }, [analyzing]);
  async function pick(camera: boolean) {
    if (camera) {
      setCameraOpen(true);
      return;
    } if (gate.current)
      return; gate.current = true; setBusy(true); setMessage(''); try {
        const next = await selectReceipt(camera);
        if (!alive.current) {
          if (next)
            await cleanPhoto(next);
          return;
        }
        if (next) {
          if (selected.current)
            await cleanPhoto(selected.current);
          selected.current = next;
          setUri(next);
        }
      }
    catch (e) {
      if (alive.current)
        setMessage(errorMessage(e));
    }
    finally {
      gate.current = false;
      if (alive.current)
        setBusy(false);
    }
  }
  async function analyze() {
    if (!uri || gate.current)
      return; gate.current = true; setAnalyzing(true); setSeconds(0); setMessage(''); const c = new AbortController(); controller.current = c; try {
        const result = await api.receipts.analyze(uri, c.signal);
        if (alive.current && !c.signal.aborted) {
          let historyError: string | undefined;
          try { await api.history.save(result); } catch { historyError = '분석 결과는 표시했지만 이력 저장에 실패했습니다. 저장 공간을 확인해 주세요.'; }
          if (alive.current) onResult({ ...result, historyError });
        }
      }
    catch (e) {
      if (alive.current && !c.signal.aborted)
        setMessage(errorMessage(e));
    }
    finally {
      await cleanPhoto(uri).catch(() => { });
      selected.current = null;
      gate.current = false;
      if (alive.current) {
        setUri(null);
        setAnalyzing(false);
      }
    }
  }
  if (cameraOpen)
    return <CameraScreen onClose={() => setCameraOpen(false)} onGallery={() => { setCameraOpen(false); void pick(false); }} onManual={onManual} onPhoto={next => {
      if (selected.current)
        void cleanPhoto(selected.current).catch(() => { }); selected.current = next; setUri(next); setMessage(''); setCameraOpen(false);
    }} />;
  if (analyzing)
    return <ScrollView contentContainerStyle={s.page}><Text style={s.title}>영수증 분석 중</Text><View style={[s.card, { alignItems: 'center', paddingVertical: 60 }]}><ActivityIndicator size="large" color={colors.green} /><Text style={s.heading}>글자를 읽고 있어요</Text><Text style={s.muted}>{seconds}초 경과 · 최대 30초</Text><Text style={s.muted}>사진은 기기 안에서만 처리돼요.</Text></View><Button title="분석 취소" secondary onPress={() => { controller.current?.abort(); setAnalyzing(false); }} /></ScrollView>;
  return <ScrollView contentContainerStyle={s.page}><Text style={s.title}>{uri ? '사진 확인' : '지출 등록'}</Text><Text style={s.muted}>{uri ? '영수증의 날짜와 금액이 잘 보이나요?' : '편한 방법으로 오늘의 지출을 기록하세요.'}</Text>
    {!!message && <><Notice text={message} error /><Button title="앱 권한 설정 열기" secondary onPress={() => void Linking.openSettings().catch(() => setMessage('기기 설정에서 앱 권한을 확인해 주세요.'))} /></>}
    {uri ? <><Image source={{ uri }} accessibilityLabel="선택한 영수증 사진" resizeMode="contain" style={{ width: '100%', height: 360, backgroundColor: 'white', borderRadius: 18 }} /><Notice text="빛 반사·흐림·잘린 부분이 있으면 다시 촬영해 주세요. 저장 전 인식 결과를 수정할 수 있어요." /><Button title="이 사진 사용" testID="receipt-analyze" disabled={busy} onPress={() => void analyze()} /><Button title="다시 촬영" secondary disabled={busy} onPress={() => void pick(true)} /><Button title="다른 사진 선택" secondary disabled={busy} onPress={() => void pick(false)} /></> : <>
      <View style={s.card}><Text style={s.heading}>영수증 촬영</Text><Text style={s.muted}>밝은 곳에서 영수증 전체가 나오도록 촬영해 주세요.</Text><Button title="카메라 열기" testID="receipt-camera" disabled={busy} onPress={() => void pick(true)} /></View>
      <View style={s.card}><Text style={s.heading}>사진에서 선택</Text><Text style={s.muted}>보관한 영수증 사진 한 장을 선택해 주세요.</Text><Button title="사진 선택" secondary testID="receipt-gallery" disabled={busy} onPress={() => void pick(false)} /></View></>}
    <View style={s.card}><Text style={s.heading}>영수증이 없어도 괜찮아요</Text><Button title="직접 입력" testID="receipt-manual" secondary disabled={busy} onPress={onManual} /></View>
    <Text style={s.muted}>사진을 선택하거나 분석해도 지출은 저장되지 않아요. 결과 확인 후 저장 버튼을 눌러 주세요.</Text></ScrollView>;
}

import React, { useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Linking, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, Loading, Notice, s } from '../components/ui';
import { cleanCapture, discardCameraOriginal, keepCameraPhoto } from '../services/captureCacheService';
import { choosePictureSize } from '../utils/cameraSize';
import { errorMessage } from '../errors';
export function CameraScreen({ onPhoto, onClose, onGallery, onManual }: {
  onPhoto: (uri: string) => void;
  onClose: () => void;
  onGallery: () => void;
  onManual: () => void;
}) {
  const [permission, requestPermission, getPermission] = useCameraPermissions(), [pictureSize, setPictureSize] = useState<string | undefined>(), [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [active, setActive] = useState(AppState.currentState === 'active'), [torch, setTorch] = useState(false);
  const camera = useRef<CameraView>(null), alive = useRef(true), gate = useRef(false), foreground = useRef(active);
  useEffect(() => {
    alive.current = true; const subscription = AppState.addEventListener('change', state => {
      foreground.current = state === 'active'; setActive(foreground.current); setReady(false); if (foreground.current)
        void getPermission().catch(() => setError('카메라 권한을 확인하지 못했어요.'));
    }); return () => { alive.current = false; subscription.remove(); };
  }, [getPermission]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!gate.current)
        onClose(); return true;
    }); return () => subscription.remove();
  }, [onClose]);
  async function prepare() {
    try {
      const sizes = await camera.current?.getAvailablePictureSizesAsync();
      if (!alive.current || !foreground.current)
        return;
      const size = choosePictureSize(sizes ?? []);
      if (!size) {
        setError('지원되는 촬영 크기를 확인하지 못했어요. 사진 선택을 이용해 주세요.');
        return;
      }
      setPictureSize(size);
      setReady(true);
    }
    catch {
      if (alive.current)
        setError('카메라 준비에 실패했어요. 사진 선택을 이용해 주세요.');
    }
  }
  async function shoot() {
    if (gate.current || !ready || !foreground.current)
      return; gate.current = true; setBusy(true); setError(''); try {
        const picture = await camera.current?.takePictureAsync({ quality: 0.85 });
        if (!picture)
          throw new Error('No picture');
        if (!alive.current || !foreground.current) {
          await discardCameraOriginal(picture.uri);
          return;
        }
        const uri = await keepCameraPhoto(picture.uri);
        if (!alive.current || !foreground.current) {
          await cleanCapture(uri);
          return;
        }
        onPhoto(uri);
      }
    catch (e) {
      if (alive.current)
        setError(errorMessage(e));
    }
    finally {
      gate.current = false;
      if (alive.current)
        setBusy(false);
    }
  }
  if (!permission)
    return <Loading />;
  if (!permission.granted)
    return <View style={s.page}><Text style={s.title}>카메라 권한이 필요해요</Text><Notice text="영수증을 촬영할 때만 카메라를 사용해요. 권한 없이 사진 선택이나 직접 입력도 가능해요." />{!!error && <Notice error text={error} />}<Button title={permission.canAskAgain ? '카메라 권한 허용' : '앱 설정 열기'} onPress={() => void (permission.canAskAgain ? requestPermission() : Linking.openSettings()).catch(() => setError('권한 설정을 열지 못했어요. 기기 설정에서 확인해 주세요.'))} /><Button title="사진에서 선택" secondary onPress={onGallery} /><Button title="직접 입력" secondary onPress={onManual} /><Button title="돌아가기" secondary onPress={onClose} /></View>;
  return <View style={{ flex: 1, backgroundColor: '#14211D' }}><View style={{ flex: 1, minHeight: 180 }}>{active && <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" mode="picture" pictureSize={pictureSize} enableTorch={torch} onCameraReady={() => void prepare()} onMountError={() => { setReady(false); setError('카메라를 시작하지 못했어요. 사진 선택이나 직접 입력을 이용해 주세요.'); }} />}<View pointerEvents="none" style={styles.overlay}><Text style={styles.tip}>영수증 전체를 테두리 안에 맞춰 주세요</Text><View style={styles.guide} /><Text style={styles.tip}>밝고 평평한 곳에서 · 빛 반사 없이</Text></View></View><View style={{ padding: 16, gap: 10 }}>{!!error && <Notice text={error} error />}<View style={s.row}><View style={{ flex: 1 }}><Button title={torch ? '조명 끄기' : '조명 켜기'} secondary disabled={busy} onPress={() => setTorch(v => !v)} /></View><View style={{ flex: 1 }}><Button title="사진 선택" secondary disabled={busy} onPress={onGallery} /></View></View><Button title={busy ? '촬영 중…' : '영수증 촬영'} testID="camera-shutter" disabled={!ready || busy || !active} onPress={() => void shoot()} /><Button title="촬영 취소" secondary disabled={busy} onPress={onClose} /></View></View>;
}
const styles = StyleSheet.create({ overlay: { flex: 1, padding: 24, gap: 14, alignItems: 'center', justifyContent: 'center' }, guide: { flex: 1, maxHeight: 450, width: '85%', borderWidth: 2, borderColor: '#FFF', borderRadius: 16, backgroundColor: 'transparent' }, tip: { fontSize: 13, color: 'white', textAlign: 'center', backgroundColor: '#14211DBB', padding: 8, borderRadius: 8 } });

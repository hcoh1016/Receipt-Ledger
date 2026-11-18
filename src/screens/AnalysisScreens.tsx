import React, {useEffect, useState} from 'react';
import {Alert, FlatList, ScrollView, Share, Text, View} from 'react-native';
import {Button, Notice, s} from '../components/ui';
import {useLedger} from '../context/LedgerProvider';
import type {AnalysisRecord} from '../database/historyRepository';
import type {ReceiptDraft} from '../types/expense';
async function share(record: AnalysisRecord) { try { await Share.share({message: record.text + '\n\n처리 시간: ' + record.elapsedMs + ' ms', title: '영수증 분석 결과'}); } catch { Alert.alert('공유 실패','다시 시도해 주세요.'); } }
export function AnalysisResultScreen({result,onContinue}: {result: ReceiptDraft & AnalysisRecord & {historyError?:string};onContinue:()=>void}) {
return <ScrollView contentContainerStyle={s.page}><Text style={s.title}>분석 결과</Text><Notice text={result.historyError ?? '결과 텍스트를 분석 이력에 저장했어요. 원본 사진은 이력에 저장하지 않아요.'} error={!!result.historyError}/><Text style={s.heading}>처리 시간: {result.elapsedMs} ms</Text><Text style={s.muted}>이미지 복사부터 OCR·영수증 해석까지 측정한 시간입니다.</Text><View style={s.card}><Text selectable testID="ocr-result">{result.text}</Text></View><Button title="결과 공유" onPress={()=>void share(result)}/><Button title="가계부 입력 확인" onPress={onContinue}/></ScrollView>;
}
export function HistoryScreen() {
 const api=useLedger(); const [rows,setRows]=useState<AnalysisRecord[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 async function refresh(){try{setRows(await api.history.list());setError('');}catch{setError('이력을 불러오지 못했습니다. 다시 시도해 주세요.');}finally{setLoading(false);}}
 useEffect(()=>{void refresh();},[]);
 function remove(id:string){Alert.alert('이력을 삭제할까요?','이 결과 텍스트가 기기에서 삭제됩니다. 가계부 내역은 별도로 유지됩니다.',[{text:'취소',style:'cancel'},{text:'삭제',style:'destructive',onPress:()=>{void api.history.remove(id).then(refresh).catch(()=>setError('삭제하지 못했습니다. 다시 시도해 주세요.'));}}]);}
 return <FlatList data={rows} keyExtractor={r=>r.id} contentContainerStyle={s.page} ListHeaderComponent={<><Text style={s.title}>분석 이력</Text><Text style={s.muted}>원본 사진 없이 결과 텍스트만 기기에 보관합니다.</Text>{!!error&&<Notice text={error} error/>}<Button title="새로고침" secondary onPress={()=>void refresh()}/></>} ListEmptyComponent={<Text style={s.muted}>{loading?'불러오는 중…':'저장된 분석 이력이 없습니다.'}</Text>} renderItem={({item})=><View style={s.card}><Text style={s.muted}>{new Date(item.createdAt).toLocaleString()} · {item.elapsedMs} ms</Text><Text selectable>{item.text}</Text><Button title="결과 공유" onPress={()=>void share(item)}/><Button title="이력 삭제" secondary onPress={()=>remove(item.id)}/></View>}/>;
}

import * as Sharing from 'expo-sharing';
import {AppError} from '../errors';
export async function shareCsv(uri:string){if(!await Sharing.isAvailableAsync())throw new AppError('UNSUPPORTED','이 기기에서는 공유 화면을 열 수 없어요. 공유 가능한 기기에서 다시 시도해 주세요.');await Sharing.shareAsync(uri,{mimeType:'text/csv',dialogTitle:'가계부 CSV 보관하기',UTI:'public.comma-separated-values-text'});}

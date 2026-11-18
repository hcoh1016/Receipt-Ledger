import * as FS from 'expo-file-system/legacy';
import {randomUUID} from 'expo-crypto';
import {AppError} from '../errors';
const folder='receipt-ledger-captures/';
function root(){if(!FS.cacheDirectory)throw new AppError('STORAGE','사진을 임시 보관할 공간이 없어요.');return FS.cacheDirectory;}
export async function keepCameraPhoto(source:string){
  const cache=root();
  if(!source.startsWith(cache))throw new AppError('IMAGE','앱 카메라 사진 경로를 확인할 수 없어요.');
  const dir=cache+folder;await FS.makeDirectoryAsync(dir,{intermediates:true});
  const uri=dir+randomUUID()+'.jpg';
  try {await FS.copyAsync({from:source,to:uri});return uri;}
  finally {await discardCameraOriginal(source);}
}
export async function discardCameraOriginal(uri:string){
  // Only a CameraView result in Expo's own Camera cache is accepted.
  const cache=FS.cacheDirectory;
  if(cache&&uri.startsWith(cache+'Camera/')&&!uri.slice((cache+'Camera/').length).includes('/'))await FS.deleteAsync(uri,{idempotent:true});
}
export async function cleanCapture(uri:string){
  const cache=FS.cacheDirectory;
  if(cache&&uri.startsWith(cache+folder)&&!uri.slice((cache+folder).length).includes('/'))await FS.deleteAsync(uri,{idempotent:true});
}
export async function cleanCaptureCacheOnStartup(){if(FS.cacheDirectory){await FS.deleteAsync(FS.cacheDirectory+folder,{idempotent:true});await FS.deleteAsync(FS.cacheDirectory+'Camera/',{idempotent:true});}}

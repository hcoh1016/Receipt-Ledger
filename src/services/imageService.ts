import * as Picker from 'expo-image-picker';
import {AppError} from '../errors';
import {LIMITS} from '../constants/limits';
import {cleanPickerCopy} from './pickerCacheService';
export async function selectReceipt(camera:boolean):Promise<string|null>{
  if(camera){const permission=await Picker.requestCameraPermissionsAsync();if(!permission.granted)throw new AppError('UNSUPPORTED','카메라 권한이 꺼져 있어요. 설정에서 허용하거나 사진 선택·직접 입력을 이용해 주세요.');}
  // Android system photo picker grants access only to the selected image.
  const options:Picker.ImagePickerOptions={mediaTypes:['images'],quality:1,allowsMultipleSelection:false,allowsEditing:false};
  const result=camera?await Picker.launchCameraAsync(options):await Picker.launchImageLibraryAsync(options);
  if(result.canceled)return null;
  const asset=result.assets[0];
  if((asset.mimeType&&!['image/jpeg','image/png'].includes(asset.mimeType))||(asset.fileSize??0)>LIMITS.imageBytes||asset.width*asset.height>LIMITS.imagePixels){await cleanPickerCopy(asset.uri);throw new AppError('IMAGE','JPEG/PNG, 10MB 이하·2천만 화소 이하 사진을 선택해 주세요.');}
  return asset.uri;
}

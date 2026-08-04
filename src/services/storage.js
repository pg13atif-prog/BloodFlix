import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export const uploadAvatar = async (userId, file) => {
  if (!file) return null;
  const fileExtension = file.name.split('.').pop();
  const storageRef = ref(storage, `avatars/${userId}.${fileExtension}`);
  
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
};

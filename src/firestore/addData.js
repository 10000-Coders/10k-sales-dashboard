import {firestoreDb} from '@/config';
import {doc, addDoc, setDoc} from 'firebase/firestore';

export default async function addData(collection, id, data) {
  let result = null;
  let error = null;

  try {
    await setDoc(doc(firestoreDb, collection, id), data);

    result = {success: true};
  } catch (e) {
    error = e;
    console.error('Error adding document:');
    result = {success: false};
  }

  return {result, error};
}

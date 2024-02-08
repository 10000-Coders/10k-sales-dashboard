import {firestoreDb} from '@/config';
import {doc, getDoc} from 'firebase/firestore';

export default async function getData(collection, id) {
  let docRef = doc(firestoreDb, collection, id);

  let result = null;
  let error = null;

  try {
    result = await getDoc(docRef);
  } catch (e) {
    error = e;
  }

  return {result, error};
}

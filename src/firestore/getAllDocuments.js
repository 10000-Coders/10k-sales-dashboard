import {firestoreDb} from '@/config';
import {collection, getDocs} from 'firebase/firestore';

export async function getAllDocuments(collectionName) {
  let documents = [];
  let error = null;

  try {
    const collectionRef = collection(firestoreDb, collectionName);
    const querySnapshot = await getDocs(collectionRef);

    querySnapshot.forEach(doc => {
      documents.push(doc.data());
    });

    return {documents, error};
  } catch (e) {
    error = e;
    console.error('Error getting documents:', e);
    return {documents, error};
  }
}

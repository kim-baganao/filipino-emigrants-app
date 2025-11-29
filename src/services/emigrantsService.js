import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// ===== CIVIL STATUS DATASET (Bar Chart) =====
const emigrantsCollection = collection(db, "emigrants");

// CREATE
export const addEmigrant = async (data) => {
  await addDoc(emigrantsCollection, data);
};

// READ
export const getEmigrants = async () => {
  const snapshot = await getDocs(emigrantsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// UPDATE
export const updateEmigrant = async (id, data) => {
  const docRef = doc(db, "emigrants", id);
  await updateDoc(docRef, data);
};

// DELETE
export const deleteEmigrant = async (id) => {
  const docRef = doc(db, "emigrants", id);
  await deleteDoc(docRef);
};

// ===== SEX DATASET (Line Chart) =====
const emigrantsBySexCollection = collection(db, "emigrantsBySex");

// CREATE
export const addEmigrantSex = async (data) => {
  await addDoc(emigrantsBySexCollection, data);
};

// READ
export const getEmigrantsBySex = async () => {
  const snapshot = await getDocs(emigrantsBySexCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// UPDATE
export const updateEmigrantSex = async (id, data) => {
  const docRef = doc(db, "emigrantsBySex", id);
  await updateDoc(docRef, data);
};

// DELETE
export const deleteEmigrantSex = async (id) => {
  const docRef = doc(db, "emigrantsBySex", id);
  await deleteDoc(docRef);
};

// ===== AGE DATASET (Density Plot) =====
const emigrantsByAgeCollection = collection(db, "emigrantsByAge");

// CREATE
export const addEmigrantAge = async (data) => {
  await addDoc(emigrantsByAgeCollection, data);
};

// READ
export const getEmigrantsByAge = async () => {
  const snapshot = await getDocs(emigrantsByAgeCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// UPDATE
export const updateEmigrantAge = async (id, data) => {
  const docRef = doc(db, "emigrantsByAge", id);
  await updateDoc(docRef, data);
};

// DELETE
export const deleteEmigrantAge = async (id) => {
  const docRef = doc(db, "emigrantsByAge", id);
  await deleteDoc(docRef);
};

// ===== OCCUPATION DATASET (TreeMap) =====
const emigrantsByOccuCollection = collection(db, "emigrantsByOccu");

// CREATE
export const addEmigrantOccu = async (data) => {
  await addDoc(emigrantsByOccuCollection, data);
};

// READ
export const getEmigrantsByOccu = async () => {
  const snapshot = await getDocs(emigrantsByOccuCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// UPDATE
export const updateEmigrantOccu = async (id, data) => {
  const docRef = doc(db, "emigrantsByOccu", id);
  await updateDoc(docRef, data);
};

// DELETE
export const deleteEmigrantOccu = async (id) => {
  const docRef = doc(db, "emigrantsByOccu", id);
  await deleteDoc(docRef);
};

// ===== EDUCATION DATASET (Horizontal Bar Chart) =====
const emigrantsByEduCollection = collection(db, "emigrantsByEdu");

// CREATE
export const addEmigrantEdu = async (data) => {
  await addDoc(emigrantsByEduCollection, data);
};

// READ
export const getEmigrantsByEdu = async () => {
  const snapshot = await getDocs(emigrantsByEduCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// UPDATE
export const updateEmigrantEdu = async (id, data) => {
  const docRef = doc(db, "emigrantsByEdu", id);
  await updateDoc(docRef, data);
};

// DELETE
export const deleteEmigrantEdu = async (id) => {
  const docRef = doc(db, "emigrantsByEdu", id);
  await deleteDoc(docRef);
};

// ===== MAJOR COUNTRIES DATASET (Dot Map) =====
const emigrantsByCountryCollection = collection(db, "emigrantsByCountry");

// CREATE
export const addEmigrantCountry = async (data) => {
  await addDoc(emigrantsByCountryCollection, data);
};

// READ
export const getEmigrantsByCountry = async () => {
  const snapshot = await getDocs(emigrantsByCountryCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// UPDATE
export const updateEmigrantCountry = async (id, data) => {
  const docRef = doc(db, "emigrantsByCountry", id);
  await updateDoc(docRef, data);
};

// DELETE
export const deleteEmigrantCountry = async (id) => {
  const docRef = doc(db, "emigrantsByCountry", id);
  await deleteDoc(docRef);
};
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";

// ⚠️ REPLACE THESE VALUES with your own Firebase project config.
// You get these from the Firebase console after creating a project.
// (Talha: follow the setup steps Claude gives you — this is safe to be public,
// Firebase config keys are not secret. Security comes from Firestore rules.)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ---------- Products ----------
export async function getProducts() {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveProduct(product) {
  if (product.id) {
    const { id, ...data } = product;
    await setDoc(doc(db, "products", id), data);
    return id;
  } else {
    const ref = await addDoc(collection(db, "products"), product);
    return ref.id;
  }
}

export async function deleteProductById(id) {
  await deleteDoc(doc(db, "products", id));
}

// ---------- Orders ----------
export async function getOrders() {
  const snap = await getDocs(collection(db, "orders"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function createOrder(order) {
  const ref = await addDoc(collection(db, "orders"), order);
  return ref.id;
}

export async function updateOrder(id, data) {
  await setDoc(doc(db, "orders", id), data, { merge: true });
}

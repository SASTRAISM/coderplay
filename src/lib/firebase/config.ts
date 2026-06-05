import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: "AIzaSyCfsjp7QyIPasbvPkMM6EI0zCeTOQxvK5c",
  authDomain: "coderplay-72536.firebaseapp.com",
  projectId: "coderplay-72536",
  storageBucket: "coderplay-72536.firebasestorage.app",
  messagingSenderId: "94657303804",
  appId: "1:94657303804:web:76a814a047a3b1538b3379",
  measurementId: "G-315CM7DMML"
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)
export const db = getFirestore(app)
export const initAnalytics = async () => {
  if (await isSupported()) return getAnalytics(app)
  return null
}
export default app

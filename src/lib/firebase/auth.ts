import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
  type User,
  type UserCredential,
} from 'firebase/auth'
import { auth } from './config'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email.trim(), password)
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
  await updateProfile(credential.user, { displayName })
  return credential
}

export async function signInWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(auth, googleProvider)
}

export async function verifyEmail(user: User): Promise<void> {
  return sendEmailVerification(user)
}

export async function signOut(): Promise<void> {
  return firebaseSignOut(auth)
}

export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email.trim())
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}

export function getCurrentUser(): User | null {
  return auth.currentUser
}

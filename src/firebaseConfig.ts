import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  type Firestore,
} from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

/**
 * Email chính chủ có quyền mở Admin Panel & tạo mã nạp Xu DOPI.
 * Thay bằng Gmail của bạn trước khi build deploy riêng lên GitHub Pages.
 */
export const ADMIN_EMAIL = 'nhgb2605@gmail.com';

/**
 * Cấu hình Firebase khai báo trực tiếp (không phụ thuộc biến môi trường .env khi build tĩnh GitHub Pages).
 * Mặc định tự nạp từ firebase-applet-config.json; bạn có thể điền trực tiếp object dự án của mình tại đây.
 */
export const firebaseConfig = {
  apiKey: appletConfig.apiKey || 'DIEN_API_KEY_CUA_BAN',
  authDomain: appletConfig.authDomain || 'DIEN_PROJECT_ID.firebaseapp.com',
  projectId: appletConfig.projectId || 'DIEN_PROJECT_ID',
  storageBucket: appletConfig.storageBucket || 'DIEN_PROJECT_ID.firebasestorage.app',
  messagingSenderId: appletConfig.messagingSenderId || 'DIEN_MESSAGING_SENDER_ID',
  appId: appletConfig.appId || 'DIEN_APP_ID',
  firestoreDatabaseId: appletConfig.firestoreDatabaseId || '(default)',
};

export function isFirebaseConfigured(): boolean {
  const { apiKey, projectId, appId } = firebaseConfig;
  if (!apiKey || !projectId || !appId) return false;
  const placeholders = ['DIEN_', 'YOUR_', 'REPLACE_', 'PLACEHOLDER'];
  return !placeholders.some(
    (token) =>
      apiKey.includes(token) ||
      projectId.includes(token) ||
      appId.includes(token)
  );
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured()) {
  appInstance = initializeApp(firebaseConfig);
  authInstance = getAuth(appInstance);
  dbInstance =
    firebaseConfig.firestoreDatabaseId &&
    firebaseConfig.firestoreDatabaseId !== '(default)'
      ? getFirestore(appInstance, firebaseConfig.firestoreDatabaseId)
      : getFirestore(appInstance);
}

export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function buildFirestoreErrorInfo(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const currentUser = auth?.currentUser;
  return {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid ?? null,
      email: currentUser?.email ?? null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      tenantId: currentUser?.tenantId ?? null,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) ?? [],
    },
    operationType,
    path,
  };
}

export function logFirestoreListenerError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.warn('Firestore Listener Warning:', JSON.stringify(errInfo));
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = buildFirestoreErrorInfo(error, operationType, path);
  console.error('Firestore Error:', JSON.stringify(errInfo));
  const rawMsg = errInfo.error;
  if (rawMsg && !rawMsg.includes('Missing or insufficient permissions') && !rawMsg.includes('requires an index')) {
    throw new Error(rawMsg);
  }
  throw new Error('Không thể đồng bộ thao tác với máy chủ. Vui lòng thử lại.');
}

export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration (client offline).');
      return false;
    }
    return true;
  }
}

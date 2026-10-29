// server/src/services/user.service.ts
import { auth, db, FieldValue } from '../config/firebase';
import { badRequest, notFound } from '../utils/errors';

export const USERS_COLLECTION = 'users';

export const ADMIN_ROLES = [
  'super_admin',
  'school_admin',
  'accountant',
  'teacher',
  'admission_officer',
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface UserRecord {
  uid: string;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: AdminRole;
}

export interface UpdateUserInput {
  name?: string;
  role?: AdminRole;
  isActive?: boolean;
}

function toRecord(doc: FirebaseFirestore.DocumentSnapshot): UserRecord {
  const data = (doc.data() ?? {}) as Partial<UserRecord>;
  return {
    ...data,
    uid: doc.id,
    email: data.email ?? '',
    name: data.name ?? '',
    role: data.role as AdminRole,
    // Docs written by /auth/verify may lack isActive → treat as active
    isActive: data.isActive !== false,
  };
}

function authErrorCode(err: unknown): string {
  return (err as { code?: string })?.code ?? '';
}

export async function getUserById(uid: string): Promise<UserRecord | null> {
  const doc = await db.collection(USERS_COLLECTION).doc(uid).get();
  return doc.exists ? toRecord(doc) : null;
}

export async function listUsers(params: { role?: AdminRole } = {}): Promise<UserRecord[]> {
  let q: FirebaseFirestore.Query = db.collection(USERS_COLLECTION);
  if (params.role) q = q.where('role', '==', params.role);
  const snap = await q.limit(500).get();
  return snap.docs
    .map(toRecord)
    .sort((a, b) => a.email.localeCompare(b.email));
}

/** Throws if `uid` is the only remaining active super_admin. */
async function assertNotLastSuperAdmin(uid: string): Promise<void> {
  const snap = await db
    .collection(USERS_COLLECTION)
    .where('role', '==', 'super_admin')
    .limit(50)
    .get();
  const others = snap.docs.map(toRecord).filter((u) => u.uid !== uid && u.isActive);
  if (others.length === 0) {
    throw badRequest(
      'অন্তত একজন সক্রিয় সুপার অ্যাডমিন থাকতে হবে / At least one active super admin is required',
    );
  }
}

export async function createUser(input: CreateUserInput, actorUid: string): Promise<UserRecord> {
  let uid: string;
  try {
    const created = await auth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.name,
      disabled: false,
    });
    uid = created.uid;
  } catch (err) {
    const code = authErrorCode(err);
    if (code === 'auth/email-already-exists') {
      throw badRequest('এই ইমেইল ইতিমধ্যে ব্যবহৃত / Email already in use');
    }
    if (code === 'auth/invalid-email' || code === 'auth/invalid-password') {
      throw badRequest('ইমেইল বা পাসওয়ার্ড সঠিক নয় / Invalid email or password');
    }
    throw err;
  }

  try {
    await auth.setCustomUserClaims(uid, { role: input.role });
    await db.collection(USERS_COLLECTION).doc(uid).set({
      uid,
      email: input.email,
      name: input.name,
      role: input.role,
      isActive: true,
      createdBy: actorUid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // Roll back the Auth user so we never leave a role-less account behind
    await auth.deleteUser(uid).catch(() => undefined);
    throw err;
  }

  const record = await getUserById(uid);
  if (!record) throw notFound('ব্যবহারকারী পাওয়া যায়নি / User not found');
  return record;
}

export async function updateUser(
  uid: string,
  updates: UpdateUserInput,
  actorUid: string,
): Promise<UserRecord> {
  const existing = await getUserById(uid);
  if (!existing) throw notFound('ব্যবহারকারী পাওয়া যায়নি / User not found');

  const roleChanging = updates.role !== undefined && updates.role !== existing.role;
  const deactivating = updates.isActive === false && existing.isActive;

  if (uid === actorUid && (roleChanging || deactivating)) {
    throw badRequest(
      'নিজের ভূমিকা বা স্ট্যাটাস পরিবর্তন করা যাবে না / You cannot change your own role or deactivate yourself',
    );
  }
  if (existing.role === 'super_admin' && existing.isActive && (roleChanging || deactivating)) {
    await assertNotLastSuperAdmin(uid);
  }

  const authUpdate: { displayName?: string; disabled?: boolean } = {};
  if (updates.name !== undefined) authUpdate.displayName = updates.name;
  if (updates.isActive !== undefined) authUpdate.disabled = !updates.isActive;

  try {
    if (Object.keys(authUpdate).length > 0) await auth.updateUser(uid, authUpdate);
    if (roleChanging && updates.role) {
      await auth.setCustomUserClaims(uid, { role: updates.role });
    }
    if (roleChanging || deactivating) await auth.revokeRefreshTokens(uid);
  } catch (err) {
    if (authErrorCode(err) === 'auth/user-not-found') {
      throw notFound('ব্যবহারকারী পাওয়া যায়নি / User not found');
    }
    throw err;
  }

  const data: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.role !== undefined) data.role = updates.role;
  if (updates.isActive !== undefined) data.isActive = updates.isActive;
  await db.collection(USERS_COLLECTION).doc(uid).update(data);

  const updated = await getUserById(uid);
  if (!updated) throw notFound('ব্যবহারকারী পাওয়া যায়নি / User not found');
  return updated;
}

export async function deleteUser(uid: string, actorUid: string): Promise<void> {
  if (uid === actorUid) {
    throw badRequest('নিজেকে মুছে ফেলা যাবে না / You cannot delete yourself');
  }
  const existing = await getUserById(uid);
  if (!existing) throw notFound('ব্যবহারকারী পাওয়া যায়নি / User not found');

  if (existing.role === 'super_admin' && existing.isActive) {
    await assertNotLastSuperAdmin(uid);
  }

  try {
    await auth.deleteUser(uid);
  } catch (err) {
    if (authErrorCode(err) !== 'auth/user-not-found') throw err;
  }
  await db.collection(USERS_COLLECTION).doc(uid).delete();
}

import { supabaseAdmin } from './client';
import { Customer } from '@/types';

interface SupabaseErrorLike {
  code?: unknown;
  message?: unknown;
}

export class SupabaseQueryError extends Error {
  constructor(
    public readonly operation: string,
    public readonly code: string
  ) {
    super('資料庫服務暫時無法使用');
    this.name = 'SupabaseQueryError';
  }
}

function getSupabaseErrorCode(error: unknown): string {
  const candidate = error as SupabaseErrorLike | null;
  if (typeof candidate?.code === 'string' && candidate.code.trim()) {
    return candidate.code;
  }

  if (error instanceof TypeError && error.message === 'fetch failed') {
    return 'FETCH_FAILED';
  }

  return 'SUPABASE_QUERY_FAILED';
}

function isNoRowsError(error: unknown): boolean {
  return (error as SupabaseErrorLike | null)?.code === 'PGRST116';
}

function throwQueryError(operation: string, error: unknown): never {
  throw new SupabaseQueryError(operation, getSupabaseErrorCode(error));
}

export async function findCustomerByEmail(email: string): Promise<Customer | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();

    if (!error && data) return data as Customer;
    if (isNoRowsError(error)) return null;
    return throwQueryError('findCustomerByEmail', error || { code: 'EMPTY_RESULT' });
  } catch (error) {
    if (error instanceof SupabaseQueryError) throw error;
    return throwQueryError('findCustomerByEmail', error);
  }
}

export async function findCustomerById(id: string): Promise<Customer | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) return data as Customer;
    if (isNoRowsError(error)) return null;
    return throwQueryError('findCustomerById', error || { code: 'EMPTY_RESULT' });
  } catch (error) {
    if (error instanceof SupabaseQueryError) throw error;
    return throwQueryError('findCustomerById', error);
  }
}

export async function findCustomerByOAuthId(oauthId: string): Promise<Customer | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('oauth_id', oauthId)
      .single();

    if (!error && data) return data as Customer;
    if (isNoRowsError(error)) return null;
    return throwQueryError('findCustomerByOAuthId', error || { code: 'EMPTY_RESULT' });
  } catch (error) {
    if (error instanceof SupabaseQueryError) throw error;
    return throwQueryError('findCustomerByOAuthId', error);
  }
}

export async function createCustomer(customer: {
  email?: string;
  name: string;
  phone?: string;
  password_hash?: string;
  auth_provider: 'password' | 'otp' | 'google';
  oauth_id?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  role?: 'user' | 'admin';
}): Promise<Customer> {
  try {
    let { data, error } = await supabaseAdmin
      .from('customers')
      .insert({
        ...customer,
        approval_status: customer.approval_status || 'pending',
        role: customer.role || 'user',
        requires_password_reset: false,
      })
      .select()
      .single();

    if (
      error &&
      error.message?.includes('column "requires_password_reset" of relation "customers" does not exist')
    ) {
      const retry = await supabaseAdmin
        .from('customers')
        .insert({
          ...customer,
          approval_status: customer.approval_status || 'pending',
          role: customer.role || 'user',
        })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      return throwQueryError('createCustomer', error);
    }

    if (!data) return throwQueryError('createCustomer', { code: 'EMPTY_RESULT' });
    return data as Customer;
  } catch (error) {
    if (error instanceof SupabaseQueryError) throw error;
    return throwQueryError('createCustomer', error);
  }
}

export async function updateLastLogin(customerId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('customers')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', customerId);
    if (error) {
      console.warn('Supabase last_login_at update unavailable', {
        operation: 'updateLastLogin',
        code: getSupabaseErrorCode(error),
      });
    }
  } catch (error) {
    console.warn('Supabase last_login_at update unavailable', {
      operation: 'updateLastLogin',
      code: getSupabaseErrorCode(error),
    });
  }
}

export async function linkOAuthId(customerId: string, oauthId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('customers')
    .update({ oauth_id: oauthId })
    .eq('id', customerId);
  if (error) return throwQueryError('linkOAuthId', error);
}

export async function unlinkOAuthId(customerId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('customers')
    .update({ oauth_id: null })
    .eq('id', customerId);
  if (error) return throwQueryError('unlinkOAuthId', error);
}

export async function checkPhoneExists(phone: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .single();

    if (!error) return !!data;
    if (isNoRowsError(error)) return false;
    return throwQueryError('checkPhoneExists', error);
  } catch (error) {
    if (error instanceof SupabaseQueryError) throw error;
    return throwQueryError('checkPhoneExists', error);
  }
}

export async function updateApprovalStatus(
  customerId: string,
  status: 'pending' | 'approved' | 'rejected'
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('customers')
    .update({ approval_status: status })
    .eq('id', customerId);

  if (error) {
    return throwQueryError('updateApprovalStatus', error);
  }
}

export async function getPendingCustomers(): Promise<Customer[]> {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    return throwQueryError('getPendingCustomers', error);
  }

  return (data || []) as Customer[];
}

export async function getAllCustomers(
  filters?: {
    approval_status?: 'pending' | 'approved' | 'rejected';
    role?: 'user' | 'admin';
  }
): Promise<Customer[]> {
  let query = supabaseAdmin.from('customers').select('*');

  if (filters?.approval_status) {
    query = query.eq('approval_status', filters.approval_status);
  }

  if (filters?.role) {
    query = query.eq('role', filters.role);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return throwQueryError('getAllCustomers', error);
  }

  return (data || []) as Customer[];
}

export async function setAdminRole(customerId: string, isAdmin: boolean = true): Promise<void> {
  const { error } = await supabaseAdmin
    .from('customers')
    .update({
      role: isAdmin ? 'admin' : 'user',
      approval_status: isAdmin ? 'approved' : 'pending',
    })
    .eq('id', customerId);

  if (error) {
    return throwQueryError('setAdminRole', error);
  }
}

export async function updatePassword(customerId: string, passwordHash: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('customers')
    .update({
      password_hash: passwordHash,
      requires_password_reset: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId);

  if (error) {
    return throwQueryError('updatePassword', error);
  }
}

export async function updateAuthProvider(
  customerId: string,
  provider: 'password' | 'otp' | 'google'
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('customers')
    .update({
      auth_provider: provider,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId);

  if (error) {
    return throwQueryError('updateAuthProvider', error);
  }
}

export async function setInitialPassword(customerId: string, passwordHash: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('customers')
    .update({
      password_hash: passwordHash,
      requires_password_reset: true,
      auth_provider: 'password',
      approval_status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId);

  if (error) {
    return throwQueryError('setInitialPassword', error);
  }
}

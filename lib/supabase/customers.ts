import { supabaseAdmin } from './client';
import { Customer } from '@/types';

export async function findCustomerByEmail(email: string): Promise<Customer | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Customer;
  } catch (error) {
    if (
      !process.env.SUPABASE_URL ||
      (error instanceof Error &&
        (error.message.includes('fetch failed') || error.message.includes('Invalid API key')))
    ) {
      return null;
    }
    throw error;
  }
}

export async function findCustomerById(id: string): Promise<Customer | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return data as Customer;
  } catch (error) {
    if (
      !process.env.SUPABASE_URL ||
      (error instanceof Error &&
        (error.message.includes('fetch failed') || error.message.includes('Invalid API key')))
    ) {
      return null;
    }
    throw error;
  }
}

export async function findCustomerByOAuthId(oauthId: string): Promise<Customer | null> {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('oauth_id', oauthId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Customer;
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
    if (
      error.message?.includes('Invalid API key') ||
      error.message?.includes('fetch failed') ||
      !process.env.SUPABASE_URL
    ) {
      return {
        id: `mock-${Date.now()}`,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        password_hash: customer.password_hash,
        auth_provider: customer.auth_provider,
        oauth_id: customer.oauth_id,
        approval_status: customer.approval_status || 'pending',
        role: customer.role || 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login_at: undefined,
        requires_password_reset: false,
      } as Customer;
    }
    throw new Error(`建立客戶失敗: ${error.message}`);
  }

  return data as Customer;
}

export async function updateLastLogin(customerId: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('customers')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', customerId);
  } catch (error) {
    if (
      !process.env.SUPABASE_URL ||
      (error instanceof Error &&
        (error.message.includes('fetch failed') || error.message.includes('Invalid API key')))
    ) {
      return;
    }
    throw error;
  }
}

export async function linkOAuthId(customerId: string, oauthId: string): Promise<void> {
  await supabaseAdmin
    .from('customers')
    .update({ oauth_id: oauthId })
    .eq('id', customerId);
}

export async function unlinkOAuthId(customerId: string): Promise<void> {
  await supabaseAdmin
    .from('customers')
    .update({ oauth_id: null })
    .eq('id', customerId);
}

export async function checkPhoneExists(phone: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .single();

    return !!data;
  } catch (error) {
    if (
      !process.env.SUPABASE_URL ||
      (error instanceof Error &&
        (error.message.includes('fetch failed') || error.message.includes('Invalid API key')))
    ) {
      return false;
    }
    throw error;
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
    throw new Error(`更新審核狀態失敗: ${error.message}`);
  }
}

export async function getPendingCustomers(): Promise<Customer[]> {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`取得待審核客戶失敗: ${error.message}`);
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
    throw new Error(`取得客戶列表失敗: ${error.message}`);
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
    throw new Error(`設定管理員角色失敗: ${error.message}`);
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
    throw new Error(`更新密碼失敗: ${error.message}`);
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
    throw new Error(`更新認證方式失敗: ${error.message}`);
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
    throw new Error(`設定初始密碼失敗: ${error.message}`);
  }
}

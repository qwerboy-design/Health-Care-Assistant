import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { findCustomerById } from '@/lib/supabase/customers';
import { errorResponse, successResponse, Errors } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    const session = await verifySession(sessionToken);
    if (!session) {
      return errorResponse(Errors.UNAUTHORIZED.message, 401);
    }

    const customer = await findCustomerById(session.customerId);
    if (!customer) {
      return errorResponse(Errors.USER_NOT_FOUND.message, 404);
    }

    return successResponse({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      authProvider: customer.auth_provider,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return errorResponse(Errors.INTERNAL_ERROR.message, 500);
  }
}

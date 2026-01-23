import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client before importing the module
vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Import after mocking
import { getCustomerCredits, deductCredits, addCredits, getCreditsHistory } from '@/lib/supabase/credits';
import { supabaseAdmin } from '@/lib/supabase/client';

describe('Credits Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCustomerCredits', () => {
    it('應該返回用戶的 Credits 分數', async () => {
      const customerId = 'test-customer-id';
      const mockCredits = 100;

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { credits: mockCredits },
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const credits = await getCustomerCredits(customerId);

      expect(supabaseAdmin.from).toHaveBeenCalledWith('customers');
      expect(mockChain.select).toHaveBeenCalledWith('credits');
      expect(mockChain.eq).toHaveBeenCalledWith('id', customerId);
      expect(credits).toBe(mockCredits);
    });

    it('應該在用戶不存在時返回 0', async () => {
      const customerId = 'non-existent-id';

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found', code: 'PGRST116' },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const credits = await getCustomerCredits(customerId);

      expect(credits).toBe(0);
    });

    it('應該在資料庫錯誤時拋出異常', async () => {
      const customerId = 'test-customer-id';

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: 'DB_ERROR' },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      await expect(getCustomerCredits(customerId)).rejects.toThrow('Database error');
    });
  });

  describe('deductCredits', () => {
    it('應該在 Credits 足夠時成功扣除並記錄交易', async () => {
      const customerId = 'test-customer-id';
      const amount = 10;
      const modelName = 'claude-sonnet-4-20250514';
      const conversationId = 'conv-id';

      // Mock RPC call
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: {
          success: true,
          transaction_id: 'transaction-id',
          credits_before: 100,
          credits_after: 90,
        },
        error: null,
      } as any);

      const result = await deductCredits(customerId, amount, modelName, conversationId);

      expect(supabaseAdmin.rpc).toHaveBeenCalledWith('deduct_customer_credits', {
        p_customer_id: customerId,
        p_credits_cost: amount,
        p_model_name: modelName,
        p_conversation_id: conversationId,
      });

      expect(result.success).toBe(true);
      expect(result.creditsAfter).toBe(90);
      expect(result.creditsBefore).toBe(100);
      expect(result.transactionId).toBe('transaction-id');
    });

    it('應該在 Credits 不足時返回錯誤', async () => {
      const customerId = 'test-customer-id';
      const amount = 100;
      const modelName = 'claude-sonnet-4-20250514';
      const conversationId = 'conv-id';

      // Mock RPC call returning insufficient credits
      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: {
          success: false,
          error: 'Credits 不足',
          current_credits: 50,
          required_credits: 100,
        },
        error: null,
      } as any);

      const result = await deductCredits(customerId, amount, modelName, conversationId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Credits 不足');
    });

    it('應該在資料庫錯誤時拋出異常', async () => {
      const customerId = 'test-customer-id';
      const amount = 10;
      const modelName = 'claude-sonnet-4-20250514';
      const conversationId = 'conv-id';

      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      } as any);

      await expect(
        deductCredits(customerId, amount, modelName, conversationId)
      ).rejects.toThrow('Database error');
    });
  });

  describe('addCredits', () => {
    it('應該成功增加用戶的 Credits', async () => {
      const customerId = 'test-customer-id';
      const amount = 50;

      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: {
          success: true,
          credits_before: 100,
          credits_after: 150,
        },
        error: null,
      } as any);

      const result = await addCredits(customerId, amount);

      expect(supabaseAdmin.rpc).toHaveBeenCalledWith('add_customer_credits', {
        p_customer_id: customerId,
        p_credits_amount: amount,
      });

      expect(result.success).toBe(true);
      expect(result.creditsBefore).toBe(100);
      expect(result.creditsAfter).toBe(150);
    });

    it('應該在用戶不存在時返回錯誤', async () => {
      const customerId = 'non-existent-id';
      const amount = 50;

      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: {
          success: false,
          error: '用戶不存在',
        },
        error: null,
      } as any);

      const result = await addCredits(customerId, amount);

      expect(result.success).toBe(false);
      expect(result.error).toContain('用戶不存在');
    });

    it('應該在資料庫錯誤時拋出異常', async () => {
      const customerId = 'test-customer-id';
      const amount = 50;

      vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      } as any);

      await expect(addCredits(customerId, amount)).rejects.toThrow('Database error');
    });
  });

  describe('getCreditsHistory', () => {
    it('應該返回用戶的消費歷史', async () => {
      const customerId = 'test-customer-id';
      const mockHistory = [
        {
          id: 'trans-1',
          customer_id: customerId,
          conversation_id: 'conv-1',
          model_name: 'claude-sonnet-4-20250514',
          credits_cost: 10,
          credits_before: 100,
          credits_after: 90,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'trans-2',
          customer_id: customerId,
          conversation_id: 'conv-2',
          model_name: 'claude-3-haiku-20240307',
          credits_cost: 5,
          credits_before: 90,
          credits_after: 85,
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockHistory,
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const history = await getCreditsHistory(customerId, 10);

      expect(supabaseAdmin.from).toHaveBeenCalledWith('credits_transactions');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('customer_id', customerId);
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockChain.limit).toHaveBeenCalledWith(10);
      expect(history).toEqual(mockHistory);
    });

    it('應該使用預設 limit 為 50', async () => {
      const customerId = 'test-customer-id';

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      await getCreditsHistory(customerId);

      expect(mockChain.limit).toHaveBeenCalledWith(50);
    });

    it('應該在資料庫錯誤時拋出異常', async () => {
      const customerId = 'test-customer-id';

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      await expect(getCreditsHistory(customerId)).rejects.toThrow('Database error');
    });
  });
});

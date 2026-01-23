import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client before importing the module
vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

// Import after mocking
import { getAllModels, getModelPricing, createModel, updateModelPricing, deactivateModel } from '@/lib/supabase/model-pricing';
import { supabaseAdmin } from '@/lib/supabase/client';

describe('Model Pricing Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllModels', () => {
    it('應該返回所有啟用的模型', async () => {
      const mockModels = [
        {
          id: 'model-1',
          model_name: 'claude-sonnet-4-20250514',
          display_name: 'Claude Sonnet 4',
          credits_cost: 10,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'model-2',
          model_name: 'claude-3-haiku-20240307',
          display_name: 'Claude 3 Haiku',
          credits_cost: 5,
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockModels,
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const models = await getAllModels();

      expect(supabaseAdmin.from).toHaveBeenCalledWith('model_pricing');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('is_active', true);
      expect(mockChain.order).toHaveBeenCalledWith('credits_cost', { ascending: true });
      expect(models).toEqual(mockModels);
    });

    it('應該在沒有模型時返回空陣列', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const models = await getAllModels();

      expect(models).toEqual([]);
    });

    it('應該在資料庫錯誤時拋出異常', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      await expect(getAllModels()).rejects.toThrow('Database error');
    });
  });

  describe('getModelPricing', () => {
    it('應該返回特定模型的定價資訊', async () => {
      const modelName = 'claude-sonnet-4-20250514';
      const mockModel = {
        id: 'model-1',
        model_name: modelName,
        display_name: 'Claude Sonnet 4',
        credits_cost: 10,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockModel,
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const model = await getModelPricing(modelName);

      expect(supabaseAdmin.from).toHaveBeenCalledWith('model_pricing');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(mockChain.eq).toHaveBeenCalledWith('model_name', modelName);
      expect(model).toEqual(mockModel);
    });

    it('應該在模型不存在時返回 null', async () => {
      const modelName = 'non-existent-model';

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const model = await getModelPricing(modelName);

      expect(model).toBeNull();
    });

    it('應該在資料庫錯誤時拋出異常', async () => {
      const modelName = 'claude-sonnet-4-20250514';

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: 'DB_ERROR' },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      await expect(getModelPricing(modelName)).rejects.toThrow('Database error');
    });
  });

  describe('createModel', () => {
    it('應該成功建立新模型', async () => {
      const newModel = {
        model_name: 'claude-opus-4-20250514',
        display_name: 'Claude Opus 4',
        credits_cost: 20,
      };

      const mockCreatedModel = {
        id: 'new-model-id',
        ...newModel,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockCreatedModel,
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const result = await createModel(newModel);

      expect(supabaseAdmin.from).toHaveBeenCalledWith('model_pricing');
      expect(mockChain.insert).toHaveBeenCalledWith(newModel);
      expect(result).toEqual(mockCreatedModel);
    });

    it('應該在模型名稱重複時拋出異常', async () => {
      const newModel = {
        model_name: 'claude-sonnet-4-20250514',
        display_name: 'Claude Sonnet 4',
        credits_cost: 10,
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'duplicate key value', code: '23505' },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      await expect(createModel(newModel)).rejects.toThrow('duplicate key value');
    });
  });

  describe('updateModelPricing', () => {
    it('應該成功更新模型定價', async () => {
      const modelName = 'claude-sonnet-4-20250514';
      const newCreditsCost = 15;

      const mockUpdatedModel = {
        id: 'model-1',
        model_name: modelName,
        display_name: 'Claude Sonnet 4',
        credits_cost: newCreditsCost,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUpdatedModel,
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const result = await updateModelPricing(modelName, newCreditsCost);

      expect(supabaseAdmin.from).toHaveBeenCalledWith('model_pricing');
      expect(mockChain.update).toHaveBeenCalledWith({ credits_cost: newCreditsCost });
      expect(mockChain.eq).toHaveBeenCalledWith('model_name', modelName);
      expect(result).toEqual(mockUpdatedModel);
    });

    it('應該在模型不存在時返回 null', async () => {
      const modelName = 'non-existent-model';
      const newCreditsCost = 15;

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const result = await updateModelPricing(modelName, newCreditsCost);

      expect(result).toBeNull();
    });

    it('應該在資料庫錯誤時拋出異常', async () => {
      const modelName = 'claude-sonnet-4-20250514';
      const newCreditsCost = 15;

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: 'DB_ERROR' },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      await expect(updateModelPricing(modelName, newCreditsCost)).rejects.toThrow('Database error');
    });
  });

  describe('deactivateModel', () => {
    it('應該成功停用模型', async () => {
      const modelName = 'claude-sonnet-4-20250514';

      const mockDeactivatedModel = {
        id: 'model-1',
        model_name: modelName,
        display_name: 'Claude Sonnet 4',
        credits_cost: 10,
        is_active: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDeactivatedModel,
          error: null,
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const result = await deactivateModel(modelName);

      expect(supabaseAdmin.from).toHaveBeenCalledWith('model_pricing');
      expect(mockChain.update).toHaveBeenCalledWith({ is_active: false });
      expect(mockChain.eq).toHaveBeenCalledWith('model_name', modelName);
      expect(result).toEqual(mockDeactivatedModel);
    });

    it('應該在模型不存在時返回 null', async () => {
      const modelName = 'non-existent-model';

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const result = await deactivateModel(modelName);

      expect(result).toBeNull();
    });

    it('應該在資料庫錯誤時拋出異常', async () => {
      const modelName = 'claude-sonnet-4-20250514';

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: 'DB_ERROR' },
        }),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      await expect(deactivateModel(modelName)).rejects.toThrow('Database error');
    });
  });
});

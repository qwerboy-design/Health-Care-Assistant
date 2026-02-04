'use client';

/**
 * 模型版本持久化工具
 * 
 * 用於解決重新登入後模型狀態還原的問題。
 * 將 Realtime 更新的模型版本信息存入 localStorage，
 * 在新會話初始化時與 API 返回的數據進行比較，確保使用最新版本。
 */

const STORAGE_KEY = 'hac-model-versions';
const EXPIRY_HOURS = 24; // 版本數據過期時間（小時）

/**
 * 模型選項介面（與 ModelSelector 保持一致）
 */
export interface ModelOption {
  id: string;
  model_name: string;
  display_name: string;
  credits_cost: number;
  is_active: boolean;
  updated_at?: string;
}

/**
 * 儲存的模型版本記錄
 */
interface StoredModelVersion {
  model_name: string;
  updated_at: string;
  stored_at: number; // 儲存時間戳（用於過期清理）
  data: ModelOption;
}

/**
 * localStorage 儲存的完整數據結構
 */
interface StoredVersionsData {
  versions: Record<string, StoredModelVersion>;
  lastCleanup: number;
}

/**
 * 檢查是否在瀏覽器環境
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * 獲取儲存的版本數據
 */
function getStoredData(): StoredVersionsData {
  if (!isBrowser()) {
    return { versions: {}, lastCleanup: Date.now() };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { versions: {}, lastCleanup: Date.now() };
    }
    return JSON.parse(raw) as StoredVersionsData;
  } catch (err) {
    console.warn('[ModelVersions] Failed to parse localStorage data:', err);
    return { versions: {}, lastCleanup: Date.now() };
  }
}

/**
 * 儲存版本數據
 */
function setStoredData(data: StoredVersionsData): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[ModelVersions] Failed to save to localStorage:', err);
  }
}

/**
 * 清理過期的版本數據
 * @param data 當前儲存的數據
 * @returns 清理後的數據
 */
function cleanupExpired(data: StoredVersionsData): StoredVersionsData {
  const now = Date.now();
  const expiryMs = EXPIRY_HOURS * 60 * 60 * 1000;
  
  // 每小時最多清理一次
  if (now - data.lastCleanup < 60 * 60 * 1000) {
    return data;
  }

  const cleanedVersions: Record<string, StoredModelVersion> = {};
  let removedCount = 0;

  for (const [key, version] of Object.entries(data.versions)) {
    if (now - version.stored_at < expiryMs) {
      cleanedVersions[key] = version;
    } else {
      removedCount++;
    }
  }

  if (removedCount > 0) {
    console.log(`[ModelVersions] Cleaned up ${removedCount} expired version(s)`);
  }

  return {
    versions: cleanedVersions,
    lastCleanup: now,
  };
}

/**
 * 儲存模型版本（Realtime 更新時調用）
 * @param model 更新後的模型數據
 */
export function saveModelVersion(model: ModelOption): void {
  if (!model.updated_at) {
    console.warn('[ModelVersions] Model missing updated_at, skipping save:', model.model_name);
    return;
  }

  const data = getStoredData();
  
  data.versions[model.model_name] = {
    model_name: model.model_name,
    updated_at: model.updated_at,
    stored_at: Date.now(),
    data: { ...model },
  };

  // 順便清理過期數據
  const cleanedData = cleanupExpired(data);
  setStoredData(cleanedData);

  console.log(`[ModelVersions] 💾 Saved version for ${model.model_name} (updated_at: ${model.updated_at})`);
}

/**
 * 移除模型版本（模型被停用或刪除時調用）
 * @param modelName 模型名稱
 */
export function removeModelVersion(modelName: string): void {
  const data = getStoredData();
  
  if (data.versions[modelName]) {
    delete data.versions[modelName];
    setStoredData(data);
    console.log(`[ModelVersions] 🗑️ Removed version for ${modelName}`);
  }
}

/**
 * 獲取所有已儲存的模型版本
 * @returns 模型版本記錄
 */
export function getStoredModelVersions(): Record<string, StoredModelVersion> {
  const data = getStoredData();
  return data.versions;
}

/**
 * 比較時間戳，判斷哪個較新
 * @param time1 時間戳字串1
 * @param time2 時間戳字串2
 * @returns 正數表示 time1 較新，負數表示 time2 較新，0 表示相同
 */
function compareTimestamps(time1: string | undefined, time2: string | undefined): number {
  if (!time1 && !time2) return 0;
  if (!time1) return -1;
  if (!time2) return 1;

  const t1 = new Date(time1).getTime();
  const t2 = new Date(time2).getTime();

  if (isNaN(t1) && isNaN(t2)) return 0;
  if (isNaN(t1)) return -1;
  if (isNaN(t2)) return 1;

  return t1 - t2;
}

/**
 * 將 API 返回的模型列表與 localStorage 版本合併
 * 對於每個模型，使用 updated_at 較新的版本
 * 
 * @param apiModels API 返回的模型列表
 * @returns 合併後的模型列表（保證使用最新版本）
 */
export function mergeWithStoredVersions(apiModels: ModelOption[]): ModelOption[] {
  const stored = getStoredModelVersions();
  
  if (Object.keys(stored).length === 0) {
    console.log('[ModelVersions] No stored versions, using API data as-is');
    return apiModels;
  }

  let mergedCount = 0;
  
  const merged = apiModels.map(apiModel => {
    const storedVersion = stored[apiModel.model_name];
    
    if (!storedVersion) {
      return apiModel;
    }

    const comparison = compareTimestamps(storedVersion.updated_at, apiModel.updated_at);
    
    if (comparison > 0) {
      // localStorage 版本較新，使用儲存的數據
      mergedCount++;
      console.log(
        `[ModelVersions] 🔄 Using localStorage version for ${apiModel.model_name}:`,
        `stored=${storedVersion.updated_at}, api=${apiModel.updated_at}`
      );
      return storedVersion.data;
    }
    
    // API 版本較新或相同，使用 API 數據
    return apiModel;
  });

  if (mergedCount > 0) {
    console.log(`[ModelVersions] ✅ Merged ${mergedCount} model(s) from localStorage`);
  }

  return merged;
}

/**
 * 批次更新版本記錄（用於初始化或 API fetch 後）
 * @param models 模型列表
 */
export function updateStoredVersions(models: ModelOption[]): void {
  const data = getStoredData();
  
  for (const model of models) {
    if (model.updated_at) {
      const existing = data.versions[model.model_name];
      
      // 只有當 API 數據較新時才更新 localStorage
      if (!existing || compareTimestamps(model.updated_at, existing.updated_at) > 0) {
        data.versions[model.model_name] = {
          model_name: model.model_name,
          updated_at: model.updated_at,
          stored_at: Date.now(),
          data: { ...model },
        };
      }
    }
  }

  const cleanedData = cleanupExpired(data);
  setStoredData(cleanedData);
}

/**
 * 清除所有儲存的版本數據（用於調試或重置）
 */
export function clearStoredVersions(): void {
  if (!isBrowser()) return;
  
  localStorage.removeItem(STORAGE_KEY);
  console.log('[ModelVersions] 🧹 Cleared all stored versions');
}

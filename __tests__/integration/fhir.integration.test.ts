/**
 * FHIR Integration Tests
 * 
 * 驗證 FHIR 匯入功能的端到端流程
 */

import { describe, it, expect } from 'vitest';
import { parseFHIR, validateFHIR, formatFHIRSummary, processFHIRContent } from '@/lib/fhir/parser';
import fs from 'fs';
import path from 'path';

const fixturesPath = path.join(__dirname, '../fixtures/fhir');

function loadFixture(filename: string): string {
  return fs.readFileSync(path.join(fixturesPath, filename), 'utf-8');
}

describe('FHIR Integration Tests', () => {
  describe('End-to-End Patient Import', () => {
    it('should process complete Patient FHIR data from upload to summary', () => {
      // 1. 模擬讀取上傳的檔案
      const fileContent = loadFixture('patient-valid.json');
      
      // 2. 解析 FHIR 內容
      const parseResult = parseFHIR(fileContent);
      expect(parseResult.success).toBe(true);
      expect(parseResult.data).toBeDefined();
      
      // 3. 驗證 FHIR 資料
      const validationResult = validateFHIR(parseResult.data!);
      expect(validationResult.valid).toBe(true);
      
      // 4. 格式化為摘要
      const summary = formatFHIRSummary(parseResult.data!, 'zh-TW');
      expect(summary.resourceType).toBe('Patient');
      expect(summary.resourceTypeDisplay).toBe('病人');
      expect(summary.title).toBe('王大明');
      expect(summary.details.length).toBeGreaterThan(0);
      
      // 5. 驗證摘要包含關鍵資訊
      const hasGender = summary.details.some(d => d.label === '性別');
      const hasBirthDate = summary.details.some(d => d.label === '出生日期');
      expect(hasGender).toBe(true);
      expect(hasBirthDate).toBe(true);
      
      // 6. 驗證原始 JSON 可以解析
      const rawData = JSON.parse(summary.rawJson);
      expect(rawData.resourceType).toBe('Patient');
    });
  });

  describe('End-to-End Bundle Import', () => {
    it('should process Bundle with multiple resources', () => {
      const fileContent = loadFixture('bundle-collection.json');
      
      // 使用一體化處理函數
      const result = processFHIRContent(fileContent, 'zh-TW');
      
      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary?.resourceType).toBe('Bundle');
      expect(result.summary?.statistics).toBeDefined();
      expect(result.summary?.statistics?.total).toBe(3);
      expect(result.summary?.statistics?.byType['Patient']).toBe(1);
      expect(result.summary?.statistics?.byType['Observation']).toBe(2);
    });
  });

  describe('End-to-End Observation Import', () => {
    it('should process Observation with component values', () => {
      const fileContent = loadFixture('observation-vitals.json');
      
      const result = processFHIRContent(fileContent, 'zh-TW');
      
      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary?.resourceType).toBe('Observation');
      
      // 驗證血壓數值存在
      const hasSystolic = result.summary?.details.some(d => 
        d.value.includes('120')
      );
      const hasDiastolic = result.summary?.details.some(d => 
        d.value.includes('80')
      );
      
      expect(hasSystolic).toBe(true);
      expect(hasDiastolic).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid JSON gracefully', () => {
      const invalidJson = '{ invalid json }';
      
      const result = processFHIRContent(invalidJson, 'zh-TW');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('PARSE_ERROR');
    });

    it('should handle missing resourceType', () => {
      const fileContent = loadFixture('invalid-no-resourcetype.json');
      
      const result = processFHIRContent(fileContent, 'zh-TW');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('MISSING_RESOURCE_TYPE');
    });

    it('should handle missing required fields in Observation', () => {
      const invalidObs = JSON.stringify({
        resourceType: 'Observation',
        // missing required 'status' and 'code'
      });
      
      const result = processFHIRContent(invalidObs, 'zh-TW');
      
      expect(result.success).toBe(false);
      expect(result.validationResult).toBeDefined();
      expect(result.validationResult?.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Language Support', () => {
    it('should format Patient summary in Traditional Chinese', () => {
      const fileContent = loadFixture('patient-valid.json');
      const result = processFHIRContent(fileContent, 'zh-TW');
      
      expect(result.summary?.resourceTypeDisplay).toBe('病人');
      expect(result.summary?.details.some(d => d.label === '性別')).toBe(true);
    });

    it('should format Patient summary in English', () => {
      const fileContent = loadFixture('patient-valid.json');
      const result = processFHIRContent(fileContent, 'en');
      
      expect(result.summary?.resourceTypeDisplay).toBe('Patient');
      expect(result.summary?.details.some(d => d.label === 'Gender')).toBe(true);
    });
  });

  describe('Complex Resource Scenarios', () => {
    it('should handle Condition with diagnosis codes', () => {
      const fileContent = loadFixture('condition.json');
      const result = processFHIRContent(fileContent, 'zh-TW');
      
      expect(result.success).toBe(true);
      expect(result.summary?.resourceType).toBe('Condition');
      expect(result.summary?.title).toBe('第二型糖尿病');
    });

    it('should handle DiagnosticReport with multiple results', () => {
      const fileContent = loadFixture('diagnostic-report.json');
      const result = processFHIRContent(fileContent, 'zh-TW');
      
      expect(result.success).toBe(true);
      expect(result.summary?.resourceType).toBe('DiagnosticReport');
      expect(result.summary?.details.some(d => 
        d.label === '結論' || d.label === 'Conclusion'
      )).toBe(true);
    });

    it('should handle MedicationStatement with dosage', () => {
      const fileContent = loadFixture('medication-statement.json');
      const result = processFHIRContent(fileContent, 'zh-TW');
      
      expect(result.success).toBe(true);
      expect(result.summary?.resourceType).toBe('MedicationStatement');
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all original data in rawJson', () => {
      const fileContent = loadFixture('patient-valid.json');
      const originalData = JSON.parse(fileContent);
      
      const result = processFHIRContent(fileContent, 'zh-TW');
      const preservedData = JSON.parse(result.summary!.rawJson);
      
      expect(preservedData).toEqual(originalData);
    });

    it('should handle Unicode characters correctly', () => {
      const fileContent = loadFixture('patient-valid.json');
      const result = processFHIRContent(fileContent, 'zh-TW');
      
      expect(result.summary?.title).toBe('王大明');
      expect(result.summary?.details.some(d => 
        d.value.includes('台北市')
      )).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should process Patient data within reasonable time', () => {
      const fileContent = loadFixture('patient-valid.json');
      
      const startTime = Date.now();
      const result = processFHIRContent(fileContent, 'zh-TW');
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // 應該在 100ms 內完成
    });

    it('should process Bundle with multiple entries efficiently', () => {
      const fileContent = loadFixture('bundle-collection.json');
      
      const startTime = Date.now();
      const result = processFHIRContent(fileContent, 'zh-TW');
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(200); // Bundle 處理應該在 200ms 內
    });
  });
});

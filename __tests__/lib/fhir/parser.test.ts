/**
 * FHIR Parser Unit Tests
 * 
 * 測試 FHIR 資源的解析、驗證和格式化功能
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  parseFHIR,
  validateFHIR,
  formatFHIRSummary,
  parseAndValidateFHIR,
  processFHIRContent,
} from '@/lib/fhir/parser';
import {
  FHIRPatient,
  FHIRObservation,
  FHIRBundle,
  FHIRCondition,
  FHIRDiagnosticReport,
  FHIRMedicationStatement,
} from '@/lib/fhir/types';

// 載入測試資料
const fixturesPath = path.join(__dirname, '../../fixtures/fhir');

function loadFixture(filename: string): string {
  return fs.readFileSync(path.join(fixturesPath, filename), 'utf-8');
}

describe('FHIR Parser', () => {
  describe('parseFHIR', () => {
    it('should parse valid Patient JSON', () => {
      const content = loadFixture('patient-valid.json');
      const result = parseFHIR(content);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.resourceType).toBe('Patient');
      
      const patient = result.data as FHIRPatient;
      expect(patient.id).toBe('example-patient-001');
      expect(patient.gender).toBe('male');
      expect(patient.birthDate).toBe('1980-05-15');
    });

    it('should parse minimal Patient JSON', () => {
      const content = loadFixture('patient-minimal.json');
      const result = parseFHIR(content);

      expect(result.success).toBe(true);
      expect(result.data?.resourceType).toBe('Patient');
      expect(result.data?.id).toBe('minimal-patient');
    });

    it('should parse valid Observation JSON', () => {
      const content = loadFixture('observation-vitals.json');
      const result = parseFHIR(content);

      expect(result.success).toBe(true);
      expect(result.data?.resourceType).toBe('Observation');
      
      const obs = result.data as FHIRObservation;
      expect(obs.status).toBe('final');
      expect(obs.component).toHaveLength(2);
    });

    it('should parse lab Observation with valueQuantity', () => {
      const content = loadFixture('observation-lab.json');
      const result = parseFHIR(content);

      expect(result.success).toBe(true);
      
      const obs = result.data as FHIRObservation;
      expect(obs.valueQuantity?.value).toBe(95);
      expect(obs.valueQuantity?.unit).toBe('mg/dL');
    });

    it('should parse Bundle with multiple entries', () => {
      const content = loadFixture('bundle-collection.json');
      const result = parseFHIR(content);

      expect(result.success).toBe(true);
      expect(result.data?.resourceType).toBe('Bundle');
      
      const bundle = result.data as FHIRBundle;
      expect(bundle.type).toBe('collection');
      expect(bundle.entry).toHaveLength(3);
    });

    it('should parse Condition resource', () => {
      const content = loadFixture('condition.json');
      const result = parseFHIR(content);

      expect(result.success).toBe(true);
      expect(result.data?.resourceType).toBe('Condition');
      
      const condition = result.data as FHIRCondition;
      expect(condition.code?.text).toBe('第二型糖尿病');
    });

    it('should parse DiagnosticReport resource', () => {
      const content = loadFixture('diagnostic-report.json');
      const result = parseFHIR(content);

      expect(result.success).toBe(true);
      expect(result.data?.resourceType).toBe('DiagnosticReport');
      
      const report = result.data as FHIRDiagnosticReport;
      expect(report.status).toBe('final');
      expect(report.result).toHaveLength(3);
    });

    it('should parse MedicationStatement resource', () => {
      const content = loadFixture('medication-statement.json');
      const result = parseFHIR(content);

      expect(result.success).toBe(true);
      expect(result.data?.resourceType).toBe('MedicationStatement');
      
      const medStatement = result.data as FHIRMedicationStatement;
      expect(medStatement.status).toBe('recorded');
    });

    it('should handle Unicode characters in names', () => {
      const content = loadFixture('patient-valid.json');
      const result = parseFHIR(content);

      expect(result.success).toBe(true);
      
      const patient = result.data as FHIRPatient;
      expect(patient.name?.[0]?.family).toBe('王');
      expect(patient.name?.[0]?.given?.[0]).toBe('大明');
    });

    it('should return error for invalid JSON syntax', () => {
      const content = loadFixture('invalid-malformed.json');
      const result = parseFHIR(content);

      expect(result.success).toBe(false);
      expect(result.error).toBe('PARSE_ERROR');
    });

    it('should return error for missing resourceType', () => {
      const content = loadFixture('invalid-no-resourcetype.json');
      const result = parseFHIR(content);

      expect(result.success).toBe(false);
      expect(result.error).toBe('MISSING_RESOURCE_TYPE');
    });

    it('should return error for null input', () => {
      const result = parseFHIR('null');

      expect(result.success).toBe(false);
      expect(result.error).toBe('PARSE_ERROR');
    });

    it('should return error for array input', () => {
      const result = parseFHIR('[1, 2, 3]');

      expect(result.success).toBe(false);
      expect(result.error).toBe('MISSING_RESOURCE_TYPE');
    });
  });

  describe('validateFHIR', () => {
    it('should return valid for complete Patient resource', () => {
      const content = loadFixture('patient-valid.json');
      const parseResult = parseFHIR(content);
      const validationResult = validateFHIR(parseResult.data);

      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toBeUndefined();
    });

    it('should return valid for minimal Patient (only resourceType)', () => {
      const content = loadFixture('patient-minimal.json');
      const parseResult = parseFHIR(content);
      const validationResult = validateFHIR(parseResult.data);

      expect(validationResult.valid).toBe(true);
    });

    it('should return invalid when resourceType is missing', () => {
      const validationResult = validateFHIR({ id: 'test' });

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
      expect(validationResult.errors?.[0]?.path).toBe('resourceType');
    });

    it('should return invalid for non-object input', () => {
      const validationResult = validateFHIR(null);

      expect(validationResult.valid).toBe(false);
    });

    it('should return invalid for string input', () => {
      const validationResult = validateFHIR('not an object');

      expect(validationResult.valid).toBe(false);
    });

    it('should validate Bundle type is valid enum', () => {
      const bundle = {
        resourceType: 'Bundle',
        type: 'invalid-type',
      };
      const validationResult = validateFHIR(bundle);

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors?.some(e => e.path === 'type')).toBe(true);
    });

    it('should validate valid Bundle type', () => {
      const bundle = {
        resourceType: 'Bundle',
        type: 'collection',
      };
      const validationResult = validateFHIR(bundle);

      expect(validationResult.valid).toBe(true);
    });

    it('should validate Observation status is required', () => {
      const obs = {
        resourceType: 'Observation',
        code: { text: 'Test' },
      };
      const validationResult = validateFHIR(obs);

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors?.some(e => e.path === 'status')).toBe(true);
    });

    it('should validate Observation status is valid enum', () => {
      const obs = {
        resourceType: 'Observation',
        status: 'invalid-status',
        code: { text: 'Test' },
      };
      const validationResult = validateFHIR(obs);

      expect(validationResult.valid).toBe(false);
    });

    it('should validate Observation code is required', () => {
      const obs = {
        resourceType: 'Observation',
        status: 'final',
      };
      const validationResult = validateFHIR(obs);

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors?.some(e => e.path === 'code')).toBe(true);
    });

    it('should validate DiagnosticReport status and code', () => {
      const report = {
        resourceType: 'DiagnosticReport',
      };
      const validationResult = validateFHIR(report);

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors?.some(e => e.path === 'status')).toBe(true);
      expect(validationResult.errors?.some(e => e.path === 'code')).toBe(true);
    });

    it('should add warning for unsupported resource type', () => {
      const resource = {
        resourceType: 'Encounter',
        id: 'test',
      };
      const validationResult = validateFHIR(resource);

      expect(validationResult.valid).toBe(true);
      expect(validationResult.warnings).toHaveLength(1);
      expect(validationResult.warnings?.[0]?.message).toContain('not fully supported');
    });
  });

  describe('formatFHIRSummary', () => {
    it('should format Patient with full name and demographics', () => {
      const content = loadFixture('patient-valid.json');
      const parseResult = parseFHIR(content);
      const summary = formatFHIRSummary(parseResult.data!, 'zh-TW');

      expect(summary.resourceType).toBe('Patient');
      expect(summary.resourceTypeDisplay).toBe('病人');
      expect(summary.title).toBe('王大明');
      expect(summary.details.some(d => d.label === '性別' && d.value === '男')).toBe(true);
      expect(summary.details.some(d => d.label === '出生日期')).toBe(true);
    });

    it('should format Patient summary in English', () => {
      const content = loadFixture('patient-valid.json');
      const parseResult = parseFHIR(content);
      const summary = formatFHIRSummary(parseResult.data!, 'en');

      expect(summary.resourceTypeDisplay).toBe('Patient');
      expect(summary.details.some(d => d.label === 'Gender' && d.value === 'Male')).toBe(true);
    });

    it('should format Observation with code and value', () => {
      const content = loadFixture('observation-lab.json');
      const parseResult = parseFHIR(content);
      const summary = formatFHIRSummary(parseResult.data!, 'zh-TW');

      expect(summary.resourceType).toBe('Observation');
      expect(summary.details.some(d => d.label === '數值' && d.value.includes('95'))).toBe(true);
    });

    it('should format component Observations (e.g., blood pressure)', () => {
      const content = loadFixture('observation-vitals.json');
      const parseResult = parseFHIR(content);
      const summary = formatFHIRSummary(parseResult.data!, 'zh-TW');

      expect(summary.details.some(d => d.value.includes('120'))).toBe(true);
      expect(summary.details.some(d => d.value.includes('80'))).toBe(true);
    });

    it('should format Bundle with entry count by resource type', () => {
      const content = loadFixture('bundle-collection.json');
      const parseResult = parseFHIR(content);
      const summary = formatFHIRSummary(parseResult.data!, 'zh-TW');

      expect(summary.resourceType).toBe('Bundle');
      expect(summary.statistics).toBeDefined();
      expect(summary.statistics?.total).toBe(3);
      expect(summary.statistics?.byType['Patient']).toBe(1);
      expect(summary.statistics?.byType['Observation']).toBe(2);
    });

    it('should format Condition with diagnosis', () => {
      const content = loadFixture('condition.json');
      const parseResult = parseFHIR(content);
      const summary = formatFHIRSummary(parseResult.data!, 'zh-TW');

      expect(summary.resourceType).toBe('Condition');
      expect(summary.title).toBe('第二型糖尿病');
    });

    it('should format DiagnosticReport with conclusion', () => {
      const content = loadFixture('diagnostic-report.json');
      const parseResult = parseFHIR(content);
      const summary = formatFHIRSummary(parseResult.data!, 'zh-TW');

      expect(summary.resourceType).toBe('DiagnosticReport');
      expect(summary.details.some(d => d.label === '結論')).toBe(true);
    });

    it('should format MedicationStatement with dosage', () => {
      const content = loadFixture('medication-statement.json');
      const parseResult = parseFHIR(content);
      const summary = formatFHIRSummary(parseResult.data!, 'zh-TW');

      expect(summary.resourceType).toBe('MedicationStatement');
      expect(summary.details.some(d => d.label === '劑量')).toBe(true);
    });

    it('should handle missing optional fields gracefully', () => {
      const content = loadFixture('patient-minimal.json');
      const parseResult = parseFHIR(content);
      const summary = formatFHIRSummary(parseResult.data!, 'zh-TW');

      expect(summary.resourceType).toBe('Patient');
      expect(summary.title).toBe('minimal-patient');
    });

    it('should include rawJson in summary', () => {
      const content = loadFixture('patient-valid.json');
      const parseResult = parseFHIR(content);
      const summary = formatFHIRSummary(parseResult.data!, 'zh-TW');

      expect(summary.rawJson).toBeDefined();
      expect(JSON.parse(summary.rawJson)).toEqual(parseResult.data);
    });
  });

  describe('parseAndValidateFHIR', () => {
    it('should return both parse and validation results', () => {
      const content = loadFixture('patient-valid.json');
      const { parseResult, validationResult } = parseAndValidateFHIR(content);

      expect(parseResult.success).toBe(true);
      expect(validationResult?.valid).toBe(true);
    });

    it('should not validate if parse fails', () => {
      const { parseResult, validationResult } = parseAndValidateFHIR('invalid json');

      expect(parseResult.success).toBe(false);
      expect(validationResult).toBeUndefined();
    });
  });

  describe('processFHIRContent', () => {
    it('should return success with summary for valid content', () => {
      const content = loadFixture('patient-valid.json');
      const result = processFHIRContent(content, 'zh-TW');

      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary?.resourceType).toBe('Patient');
    });

    it('should return error for invalid JSON', () => {
      const result = processFHIRContent('invalid', 'zh-TW');

      expect(result.success).toBe(false);
      expect(result.error).toBe('PARSE_ERROR');
    });

    it('should return error for validation failure', () => {
      const content = JSON.stringify({
        resourceType: 'Observation',
        // missing required fields
      });
      const result = processFHIRContent(content, 'zh-TW');

      expect(result.success).toBe(false);
      expect(result.validationResult).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays in resources', () => {
      const patient = {
        resourceType: 'Patient',
        id: 'test',
        name: [],
        telecom: [],
        address: [],
      };
      const validationResult = validateFHIR(patient);

      expect(validationResult.valid).toBe(true);
    });

    it('should handle resources with only id and resourceType', () => {
      const resource = {
        resourceType: 'Patient',
        id: 'only-id',
      };
      const summary = formatFHIRSummary(resource as FHIRPatient, 'zh-TW');

      expect(summary.title).toBe('only-id');
    });

    it('should handle very long strings', () => {
      const longString = 'A'.repeat(10000);
      const patient = {
        resourceType: 'Patient',
        id: longString,
      };
      const summary = formatFHIRSummary(patient as FHIRPatient, 'zh-TW');

      expect(summary.title).toBe(longString);
    });

    it('should handle special characters in content', () => {
      const patient = {
        resourceType: 'Patient',
        name: [{ family: '陳', given: ['小<script>alert("xss")</script>明'] }],
      };
      const summary = formatFHIRSummary(patient as FHIRPatient, 'zh-TW');

      expect(summary.title).toContain('<script>');
    });

    it('should handle deeply nested bundle entries', () => {
      const bundle: FHIRBundle = {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          {
            resource: {
              resourceType: 'Patient',
              id: 'nested-1',
            },
          },
          {
            resource: {
              resourceType: 'Patient',
              id: 'nested-2',
            },
          },
        ],
      };
      const validationResult = validateFHIR(bundle);

      expect(validationResult.valid).toBe(true);
    });
  });
});

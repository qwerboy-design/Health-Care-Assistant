import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { processFHIRContent } from '@/lib/fhir/parser';
import { mergeFhirImportsForLLM } from '@/lib/fhir/mergeFhirImport';

const fixturesDir = path.join(__dirname, '../../fixtures/fhir');

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf-8');
}

describe('FHIR redaction flow', () => {
  it('redacts patient identity fields in parsed summaries', () => {
    const result = processFHIRContent(loadFixture('patient-valid.json'), 'zh-TW');

    expect(result.success).toBe(true);
    expect(result.summary?.title).toBe('[REDACTED_NAME]');
    expect(result.summary?.rawJson).toContain('[REDACTED_NAME]');
    expect(result.summary?.rawJson).toContain('[REDACTED_MRN]');
    expect(result.summary?.rawJson).toContain('[REDACTED_PHONE]');
    expect(result.summary?.rawJson).toContain('[REDACTED_EMAIL]');
    expect(result.summary?.rawJson).toContain('[REDACTED_DOB]');
    expect(result.summary?.rawJson).not.toContain('A123456789');
    expect(result.summary?.rawJson).not.toContain('wang.daming@example.com');
  });

  it('redacts merged import output and unsafe filenames before sending to chat', () => {
    const patient = processFHIRContent(loadFixture('patient-valid.json'), 'zh-TW');
    expect(patient.success).toBe(true);

    const merged = mergeFhirImportsForLLM(
      [
        {
          fileName: '王大明-A123456789.json',
          summary: patient.summary!,
          resource: patient.resource!,
        },
      ],
      'zh-TW'
    );

    expect(merged.llmText).toContain('[REDACTED_NAME]');
    expect(merged.llmText).toContain('[REDACTED_MRN]');
    expect(merged.llmText).toContain('redacted-tw-id');
    expect(merged.llmText).not.toContain('A123456789');
    expect(merged.rawJsonMerged).not.toContain('A123456789');
  });
});

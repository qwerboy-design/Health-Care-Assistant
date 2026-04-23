import { describe, expect, it } from 'vitest';
import {
  redactConversationMessages,
  redactFhirResource,
  redactFileName,
  redactFreeText,
} from '@/lib/privacy/redaction';

describe('privacy redaction', () => {
  it('redacts labeled names, Taiwan IDs, phones, and email addresses', () => {
    const input = [
      '姓名: 王大明',
      '身分證字號: A123456789',
      'Phone: 0912-345-678',
      'Email: patient@example.com',
    ].join('\n');

    const result = redactFreeText(input);

    expect(result.content).toContain('姓名: [REDACTED_NAME]');
    expect(result.content).toContain('身分證字號: [REDACTED_TW_ID]');
    expect(result.content).toContain('[REDACTED_PHONE]');
    expect(result.content).toContain('[REDACTED_EMAIL]');
    expect(result.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'name' }),
        expect.objectContaining({ type: 'tw_id' }),
        expect.objectContaining({ type: 'phone' }),
        expect.objectContaining({ type: 'email' }),
      ])
    );
  });

  it('preserves clinical content that is not identifying', () => {
    const input = 'Vancomycin trough 15.8 ug/mL, creatinine 1.2 mg/dL, diagnosis: pneumonia';
    const result = redactFreeText(input);

    expect(result.content).toContain('Vancomycin trough 15.8 ug/mL');
    expect(result.content).toContain('creatinine 1.2 mg/dL');
    expect(result.content).toContain('diagnosis: pneumonia');
  });

  it('redacts sensitive patient fields in FHIR resources', () => {
    const patient = {
      resourceType: 'Patient',
      name: [{ text: '王大明' }],
      identifier: [{ value: 'A123456789' }],
      telecom: [
        { system: 'phone', value: '0912-345-678' },
        { system: 'email', value: 'patient@example.com' },
      ],
      birthDate: '1980-05-15',
      address: [{ text: '台北市中正區仁愛路100號' }],
      contact: [
        {
          name: { text: '王小明' },
          telecom: [{ system: 'phone', value: '0922-111-222' }],
        },
      ],
    };

    const result = redactFhirResource(patient);

    expect(result.name[0].text).toBe('[REDACTED_NAME]');
    expect(result.identifier[0].value).toBe('[REDACTED_MRN]');
    expect(result.telecom[0].value).toBe('[REDACTED_PHONE]');
    expect(result.telecom[1].value).toBe('[REDACTED_EMAIL]');
    expect(result.birthDate).toBe('[REDACTED_DOB]');
    expect(result.address[0].text).toBe('[REDACTED_ADDRESS]');
    expect(result.contact[0].name.text).toBe('[REDACTED_NAME]');
  });

  it('redacts sensitive identifiers from filenames and conversation payloads', () => {
    expect(redactFileName('王大明-A123456789-report.pdf')).toContain('redacted-tw-id');
    expect(redactFileName('patient-valid.json')).toBe('patient-valid.json');

    const messages = redactConversationMessages([
      { role: 'user', content: 'Patient 王大明 / A123456789', fileName: '王大明A123456789.pdf' },
    ]);

    expect(messages[0].content).toContain('[REDACTED_NAME]');
    expect(messages[0].content).toContain('[REDACTED_TW_ID]');
    expect(messages[0].fileName).toContain('redacted-tw-id');
  });
});

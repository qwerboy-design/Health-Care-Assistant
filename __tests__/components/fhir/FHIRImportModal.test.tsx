/**
 * FHIRImportModal Component Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fs from 'fs';
import path from 'path';
import { FHIRImportModal } from '@/components/fhir/FHIRImportModal';

vi.mock('@/components/providers/LocaleProvider', () => ({
  useLocale: () => ({
    t: (key: string) => key,
    locale: 'zh-TW' as const,
  }),
}));

const fixturesDir = path.join(__dirname, '../../fixtures/fhir');

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), 'utf-8');
}

function setFilesOnInput(input: HTMLInputElement, files: File[]) {
  const dt = new DataTransfer();
  for (const file of files) {
    dt.items.add(file);
  }

  Object.defineProperty(input, 'files', {
    value: dt.files,
    configurable: true,
    writable: false,
  });

  fireEvent.change(input);
}

describe('FHIRImportModal', () => {
  const mockOnClose = vi.fn();
  const mockOnImport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (isOpen = true) =>
    render(<FHIRImportModal isOpen={isOpen} onClose={mockOnClose} onImport={mockOnImport} />);

  describe('Rendering', () => {
    it('should not render when closed', () => {
      renderModal(false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render title and dropzone copy when open', () => {
      renderModal();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('匯入 FHIR 資料')).toBeInTheDocument();
      expect(screen.getByText('點擊或拖放 FHIR 檔案至此')).toBeInTheDocument();
      expect(
        screen.getByText('支援 JSON 或 XML，可多選或拖放多個檔案（最多 20 個）')
      ).toBeInTheDocument();
    });

    it('should have file input accepting json and xml with multiple', () => {
      renderModal();
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.multiple).toBe(true);
      expect(input.accept).toContain('.json');
      expect(input.accept).toContain('.xml');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderModal();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should have close button with aria-label', () => {
      renderModal();
      expect(screen.getByLabelText('關閉')).toBeInTheDocument();
    });
  });

  describe('Basic Interactions', () => {
    it('should show cancel button', () => {
      renderModal();
      expect(screen.getByText('取消')).toBeInTheDocument();
    });
  });

  describe('Multi-file import', () => {
    it('parses multiple valid files and sends merged payload on confirm', async () => {
      const user = userEvent.setup();
      renderModal();

      const patient = new File([loadFixture('patient-valid.json')], 'patient-valid.json', {
        type: 'application/json',
      });
      const condition = new File([loadFixture('condition.json')], 'condition.json', {
        type: 'application/json',
      });

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      setFilesOnInput(input, [patient, condition]);

      await waitFor(() => {
        expect(screen.getByText('解析成功')).toBeInTheDocument();
      });

      expect(screen.getByText('(2 個檔案)')).toBeInTheDocument();
      expect(screen.getByText('(patient-valid.json)')).toBeInTheDocument();
      expect(screen.getByText('(condition.json)')).toBeInTheDocument();
      expect(
        screen.getByText('已移除姓名、識別碼與聯絡資訊等敏感資料後匯入。')
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '確認匯入' }));

      await waitFor(() => {
        expect(mockOnImport).toHaveBeenCalledTimes(1);
      });

      const payload = mockOnImport.mock.calls[0][0] as { summary: string; rawJson: string };
      expect(payload.summary).toContain('[FHIR 臨床資料匯入]');
      expect(payload.summary).toContain('## 檔案：patient-valid.json');
      expect(payload.summary).toContain('## 檔案：condition.json');
      expect(payload.rawJson).toContain('// file: patient-valid.json');
      expect(payload.rawJson).toContain('// file: condition.json');
    });

    it('shows per-file parse errors when one file is invalid', async () => {
      renderModal();

      const good = new File([loadFixture('patient-minimal.json')], 'ok.json', {
        type: 'application/json',
      });
      const bad = new File([loadFixture('invalid-malformed.json')], 'bad.json', {
        type: 'application/json',
      });

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      setFilesOnInput(input, [good, bad]);

      await waitFor(() => {
        expect(screen.getByText('匯入失敗')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/bad\.json/)).toBeInTheDocument();
      expect(mockOnImport).not.toHaveBeenCalled();
    });

    it('blocks imports over the max file limit', async () => {
      renderModal();

      const minimal = loadFixture('patient-minimal.json');
      const files = Array.from({ length: 21 }, (_, index) => {
        return new File([minimal], `p${index}.json`, { type: 'application/json' });
      });

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      setFilesOnInput(input, files);

      await waitFor(() => {
        expect(screen.getByText('一次最多只能匯入 20 個檔案。')).toBeInTheDocument();
      });

      expect(mockOnImport).not.toHaveBeenCalled();
    });

    it('asks to select json or xml for unsupported file formats', async () => {
      renderModal();

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const textFile = new File(['plain text'], 'note.txt', { type: 'text/plain' });
      setFilesOnInput(input, [textFile]);

      await waitFor(() => {
        expect(screen.getByText('匯入失敗')).toBeInTheDocument();
      });

      expect(screen.getByText(/請選擇 JSON 或 XML 格式的 FHIR 檔案/)).toBeInTheDocument();
    });
  });
});

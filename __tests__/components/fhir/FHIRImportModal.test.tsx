/**
 * FHIRImportModal Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
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

describe('FHIRImportModal', () => {
  const mockOnClose = vi.fn();
  const mockOnImport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (isOpen = true) => {
    return render(
      <FHIRImportModal isOpen={isOpen} onClose={mockOnClose} onImport={mockOnImport} />
    );
  };

  describe('Rendering', () => {
    it('should not render when closed', () => {
      renderModal(false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when open', () => {
      renderModal(true);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should display title', () => {
      renderModal();
      expect(screen.getByText(/匯入 FHIR 資料/)).toBeInTheDocument();
    });

    it('should display upload instructions for multi-file', () => {
      renderModal();
      expect(screen.getByText(/點擊或拖放 FHIR 檔案至此/)).toBeInTheDocument();
      expect(screen.getByText(/一次選擇或多檔拖放/)).toBeInTheDocument();
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

      const closeButton = screen.getByLabelText(/關閉/);
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Basic Interactions', () => {
    it('should have cancel button', () => {
      renderModal();
      expect(screen.getByText(/取消/)).toBeInTheDocument();
    });
  });

  function setFilesOnInput(input: HTMLInputElement, files: File[]) {
    const dt = new DataTransfer();
    for (const f of files) {
      dt.items.add(f);
    }
    Object.defineProperty(input, 'files', {
      value: dt.files,
      configurable: true,
      writable: false,
    });
    fireEvent.change(input);
  }

  describe('Multi-file import', () => {
    it('多檔解析成功後顯示檔名並確認匯入呼叫 onImport 一次且含 FHIR 標記', async () => {
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
        expect(screen.getByText(/解析成功/)).toBeInTheDocument();
      });

      expect(screen.getByText(/共 2 個檔案/)).toBeInTheDocument();
      expect(screen.getByText('(patient-valid.json)')).toBeInTheDocument();
      expect(screen.getByText('(condition.json)')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /確認匯入/ }));

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

    it('夾帶無效檔時顯示錯誤並列出失敗檔名', async () => {
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
        expect(screen.getByText(/匯入失敗/)).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/bad\.json/)).toBeInTheDocument();
      expect(mockOnImport).not.toHaveBeenCalled();
    });

    it('超過 20 個檔案時顯示錯誤', async () => {
      renderModal();

      const minimal = loadFixture('patient-minimal.json');
      const files = Array.from({ length: 21 }, (_, i) => {
        return new File([minimal], `p${i}.json`, { type: 'application/json' });
      });

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      setFilesOnInput(input, files);

      await waitFor(() => {
        expect(screen.getByText(/一次最多匯入 20 個檔案/)).toBeInTheDocument();
      });
      expect(mockOnImport).not.toHaveBeenCalled();
    });
  });
});

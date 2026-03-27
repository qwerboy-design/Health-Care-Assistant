/**
 * FHIRImportModal Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FHIRImportModal } from '@/components/fhir/FHIRImportModal';

// Mock LocaleProvider
vi.mock('@/components/providers/LocaleProvider', () => ({
  useLocale: () => ({
    t: (key: string) => key,
    locale: 'zh-TW',
  }),
}));

// Mock FHIR parser - 簡化版
vi.mock('@/lib/fhir/parser', () => ({
  processFHIRContent: vi.fn(),
}));

describe('FHIRImportModal', () => {
  const mockOnClose = vi.fn();
  const mockOnImport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (isOpen = true) => {
    return render(
      <FHIRImportModal
        isOpen={isOpen}
        onClose={mockOnClose}
        onImport={mockOnImport}
      />
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

    it('should display upload instructions', () => {
      renderModal();
      expect(screen.getByText(/點擊或拖放 FHIR 檔案至此/)).toBeInTheDocument();
    });

    it('should have file input accepting json and xml', () => {
      renderModal();
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();
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
});

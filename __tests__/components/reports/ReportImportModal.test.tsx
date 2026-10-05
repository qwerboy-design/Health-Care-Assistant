import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReportImportModal } from '@/components/reports/ReportImportModal';
import { LocaleProvider } from '@/components/providers/LocaleProvider';

describe('ReportImportModal', () => {
  it('requires each editable row to be confirmed before submit', () => {
    const onConfirm = vi.fn();
    render(<LocaleProvider><ReportImportModal isOpen onClose={vi.fn()} onConfirm={onConfirm} /></LocaleProvider>);
    fireEvent.change(screen.getByPlaceholderText(/每列可用 Tab/), { target: { value: 'Glucose\t105\tmg/dL\t70-99\tH' } });
    expect(screen.getByText('確認並分析')).toBeTruthy();
    fireEvent.click(screen.getByText('確認並分析'));
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('確認並分析'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0].items[0]).toMatchObject({ value: '105', confirmed: true });
  });

  it('submits only confirmed redacted rows when OCR text contains spaced PHI', () => {
    const onConfirm = vi.fn();
    render(<LocaleProvider><ReportImportModal isOpen onClose={vi.fn()} onConfirm={onConfirm} /></LocaleProvider>);
    fireEvent.change(screen.getByPlaceholderText(/每列可用 Tab/), {
      target: {
        value: [
          '受 檢 者 ﹕ 測 試 人 員 報 告 日 期 ﹕ 2026-00-30',
          'Name: Test Person',
          'Glucose 105 mg/dL 70-99 H',
        ].join('\n'),
      },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('確認並分析'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const payload = onConfirm.mock.calls[0][0] as Record<string, unknown>;
    const serialized = JSON.stringify(payload);
    for (const forbidden of ['受檢者', '受 檢 者', '測試人員', '測 試 人 員', 'Test Person']) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(payload).not.toHaveProperty('text');
    expect(payload).not.toHaveProperty('rawText');
  });

  it('unticks edited rows and keeps rows visible with an inline API error', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('報告內容超過 128 KB 上限'));
    render(<LocaleProvider><ReportImportModal isOpen onClose={vi.fn()} onConfirm={onConfirm} /></LocaleProvider>);
    fireEvent.change(screen.getByPlaceholderText(/每列可用 Tab/), { target: { value: 'Glucose\t105\tmg/dL\t70-99\tH' } });
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    fireEvent.change(screen.getByLabelText('value-1'), { target: { value: '106' } });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByText('確認並分析'));
    expect(await screen.findByRole('alert')).toHaveTextContent('報告內容超過 128 KB 上限');
    expect(screen.getByDisplayValue('106')).toBeInTheDocument();
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it('can delete an incomplete row and add a new row without changing other confirmations', () => {
    const onConfirm = vi.fn();
    render(<LocaleProvider><ReportImportModal isOpen onClose={vi.fn()} onConfirm={onConfirm} /></LocaleProvider>);
    fireEvent.change(screen.getByPlaceholderText(/每列可用 Tab/), { target: { value: 'Glucose\t105\tmg/dL\t70-99\tH\nGlucose ??? mg/dL' } });
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();
    fireEvent.click(screen.getAllByRole('button', { name: '刪除' })[1]);
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByRole('checkbox')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: '新增一列' }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.getAllByLabelText(/label-/)).toHaveLength(2);
  });
});

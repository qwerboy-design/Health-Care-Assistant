import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from '@/components/chat/ChatInput';

// Mock子組件
vi.mock('@/components/providers/LocaleProvider', () => ({
  useLocale: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'chat.inputPlaceholder': '輸入訊息...',
        'chat.send': '發送',
        'chat.hideOptions': '隱藏選項',
        'chat.showOptions': '顯示選項',
        'chat.optionsHint': '功能與模型設定',
        'chat.uploaded': '已上傳',
        'chat.remove': '移除',
        'chat.modelVisionWarning': '此檔案需要支持視覺的模型',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/components/chat/FunctionSelector', () => ({
  FunctionSelector: ({ value, onChange }: any) => (
    <div data-testid="function-selector">
      FunctionSelector
      <button onClick={() => onChange('test-function')}>Select Function</button>
    </div>
  ),
}));

vi.mock('@/components/chat/WorkloadSelector', () => ({
  WorkloadSelector: ({ value, onChange }: any) => (
    <div data-testid="workload-selector">
      WorkloadSelector
      <button onClick={() => onChange('professional')}>Select Workload</button>
    </div>
  ),
}));

vi.mock('@/components/chat/FileUploader', () => ({
  FileUploader: ({ onFileSelect, onUploadSuccess, onUploadError }: any) => (
    <div data-testid="file-uploader">
      FileUploader
      <button onClick={() => {
        const file = new File(['test'], 'test.txt', { type: 'text/plain' });
        onFileSelect(file);
      }}>
        Select File
      </button>
      <button onClick={() => onUploadSuccess('https://example.com/file.txt')}>
        Upload Success
      </button>
      <button onClick={() => onUploadError('Upload failed')}>
        Upload Error
      </button>
    </div>
  ),
}));

vi.mock('@/components/chat/ModelSelector', () => ({
  ModelSelector: ({ value, onChange, userCredits }: any) => (
    <div data-testid="model-selector">
      ModelSelector
      <button onClick={() => onChange('claude-opus-4')}>Select Model</button>
    </div>
  ),
}));

// Mock fetch for model API
global.fetch = vi.fn();

describe('ChatInput', () => {
  const mockOnSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          models: [
            { model_name: 'claude-sonnet-4-5-20250929', display_name: 'Claude Sonnet 4.5', supports_vision: true },
            { model_name: 'claude-opus-4', display_name: 'Claude Opus 4', supports_vision: false },
          ],
        },
      }),
    });
  });

  describe('基本渲染', () => {
    it('應該渲染 textarea 和發送按鈕', () => {
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      expect(screen.getByPlaceholderText('輸入訊息...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '發送' })).toBeInTheDocument();
    });

    it('當 disabled=true 時應該禁用輸入和按鈕', () => {
      render(<ChatInput onSend={mockOnSend} disabled={true} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      const sendButton = screen.getByRole('button', { name: '發送' });

      expect(textarea).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });

    it('空白訊息時應該禁用發送按鈕', () => {
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      const sendButton = screen.getByRole('button', { name: '發送' });
      expect(sendButton).toBeDisabled();
    });
  });

  describe('isEmptyState 屬性測試', () => {
    it('isEmptyState=true 時 textarea 應該有 3 行初始高度', () => {
      render(<ChatInput onSend={mockOnSend} isEmptyState={true} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      expect(Number(textarea.rows)).toBe(3);
    });

    it('isEmptyState=false 時 textarea 應該有 1 行初始高度', () => {
      render(<ChatInput onSend={mockOnSend} isEmptyState={false} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      expect(Number(textarea.rows)).toBe(1);
    });

    it('isEmptyState=true 時 textarea 應該有 max-h-[300px] 類別', () => {
      render(<ChatInput onSend={mockOnSend} isEmptyState={true} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      expect(textarea.className).toContain('max-h-[300px]');
    });

    it('isEmptyState=false 時 textarea 應該有 max-h-[150px] 類別', () => {
      render(<ChatInput onSend={mockOnSend} isEmptyState={false} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      expect(textarea.className).toContain('max-h-[150px]');
    });

    it('預設情況（未傳入 isEmptyState）應該使用 false', () => {
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      expect(Number(textarea.rows)).toBe(1);
      expect(textarea.className).toContain('max-h-[150px]');
    });

    it('textarea 應該有 transition-all 類別以支持平滑過渡', () => {
      render(<ChatInput onSend={mockOnSend} isEmptyState={true} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      expect(textarea.className).toContain('transition-all');
      expect(textarea.className).toContain('duration-300');
    });
  });

  describe('訊息發送功能', () => {
    it('應該能夠輸入文字', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      await user.type(textarea, 'Hello World');

      expect(textarea.value).toBe('Hello World');
    });

    it('輸入文字後應該啟用發送按鈕', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      const sendButton = screen.getByRole('button', { name: '發送' });

      await user.type(textarea, 'Hello');

      expect(sendButton).not.toBeDisabled();
    });

    it('點擊發送按鈕應該調用 onSend', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      await user.type(textarea, 'Hello World');

      const sendButton = screen.getByRole('button', { name: '發送' });
      await user.click(sendButton);

      expect(mockOnSend).toHaveBeenCalledWith('Hello World', expect.objectContaining({
        workloadLevel: 'standard',
        modelName: 'claude-sonnet-4-5-20250929',
      }));
    });

    it('按 Enter 鍵應該發送訊息', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      await user.type(textarea, 'Hello World');
      await user.keyboard('{Enter}');

      expect(mockOnSend).toHaveBeenCalled();
    });

    it('按 Shift+Enter 應該換行而不發送', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      await user.type(textarea, 'Line 1');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      await user.type(textarea, 'Line 2');

      expect(mockOnSend).not.toHaveBeenCalled();
      expect(textarea.value).toContain('Line 1');
      expect(textarea.value).toContain('Line 2');
    });

    it('發送後應該清空 textarea', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      await user.type(textarea, 'Hello World');

      const sendButton = screen.getByRole('button', { name: '發送' });
      await user.click(sendButton);

      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('只有空白字符時不應該啟用發送按鈕', () => {
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '   ' } });

      const sendButton = screen.getByRole('button', { name: '發送' });
      expect(sendButton).toBeDisabled();
    });
  });

  describe('檔案上傳功能', () => {
    it('應該顯示檔案上傳組件', () => {
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      expect(screen.getByTestId('file-uploader')).toBeInTheDocument();
    });

    it('選擇檔案後應該顯示檔案名稱', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      const selectFileButton = screen.getByRole('button', { name: 'Select File' });
      await user.click(selectFileButton);

      await waitFor(() => {
        expect(screen.getByText(/test\.txt/)).toBeInTheDocument();
      });
    });

    it('應該能夠移除已選擇的檔案', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      await user.click(screen.getByRole('button', { name: 'Select File' }));
      
      await waitFor(() => {
        expect(screen.getByText(/test\.txt/)).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: '移除' });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText(/test\.txt/)).not.toBeInTheDocument();
      });
    });

    it('發送後應該清除檔案狀態', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      const selectFileButton = screen.getByRole('button', { name: 'Select File' });
      await user.click(selectFileButton);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      await user.type(textarea, 'Message with file');

      const sendButton = screen.getByRole('button', { name: '發送' });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.queryByText(/test\.txt/)).not.toBeInTheDocument();
      });
    });
  });

  describe('選項面板功能', () => {
    it('應該有顯示/隱藏選項按鈕', () => {
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      expect(screen.getByRole('button', { name: /顯示選項/ })).toBeInTheDocument();
    });

    it('點擊後應該顯示選項面板組件', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      const toggleButton = screen.getByRole('button', { name: /顯示選項/ });
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByTestId('model-selector')).toBeInTheDocument();
        expect(screen.getByTestId('function-selector')).toBeInTheDocument();
        expect(screen.getByTestId('workload-selector')).toBeInTheDocument();
      });
    });
  });

  describe('自動高度調整', () => {
    it('輸入多行文字時應該自動調整 textarea 高度', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} isEmptyState={true} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      
      const longText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      await user.type(textarea, longText);

      expect(textarea.value).toBe(longText);
    });
  });

  describe('預設值測試', () => {
    it('應該使用預設的 workloadLevel: standard', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      await user.type(textarea, 'Test message');

      const sendButton = screen.getByRole('button', { name: '發送' });
      await user.click(sendButton);

      expect(mockOnSend).toHaveBeenCalledWith('Test message', expect.objectContaining({
        workloadLevel: 'standard',
      }));
    });

    it('應該使用預設的模型', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={mockOnSend} userCredits={100} />);

      const textarea = screen.getByPlaceholderText('輸入訊息...') as HTMLTextAreaElement;
      await user.type(textarea, 'Test message');

      const sendButton = screen.getByRole('button', { name: '發送' });
      await user.click(sendButton);

      expect(mockOnSend).toHaveBeenCalledWith('Test message', expect.objectContaining({
        modelName: 'claude-sonnet-4-5-20250929',
      }));
    });
  });
});

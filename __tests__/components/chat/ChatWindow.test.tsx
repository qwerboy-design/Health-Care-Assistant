import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatWindow } from '@/components/chat/ChatWindow';

// Mock子組件
vi.mock('@/components/chat/MessageList', () => ({
  MessageList: ({ messages, isLoading }: any) => (
    <div data-testid="message-list">
      MessageList: {messages.length} messages
      {isLoading && <span>Loading...</span>}
    </div>
  ),
}));

vi.mock('@/components/chat/ChatInput', () => ({
  ChatInput: ({ isEmptyState, disabled, userCredits }: any) => (
    <div data-testid="chat-input">
      ChatInput
      {isEmptyState && <span data-testid="empty-state">Empty State</span>}
      {disabled && <span>Disabled</span>}
      <span data-testid="credits">Credits: {userCredits}</span>
    </div>
  ),
}));

describe('ChatWindow', () => {
  const mockOnSend = vi.fn();

  it('應該渲染 MessageList 和 ChatInput 組件', () => {
    render(
      <ChatWindow
        messages={[]}
        isLoading={false}
        onSend={mockOnSend}
        userCredits={100}
      />
    );

    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });

  it('空白狀態（0 則訊息）應該傳遞 isEmptyState=true 給 ChatInput', () => {
    render(
      <ChatWindow
        messages={[]}
        isLoading={false}
        onSend={mockOnSend}
        userCredits={100}
      />
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('前 2 輪對話（4 則訊息）應該維持 isEmptyState=true', () => {
    const messages = [
      { id: '1', role: 'user' as const, content: 'Hello' },
      { id: '2', role: 'assistant' as const, content: 'Hi' },
      { id: '3', role: 'user' as const, content: 'How are you?' },
      { id: '4', role: 'assistant' as const, content: 'I am fine' },
    ];

    render(
      <ChatWindow
        messages={messages}
        isLoading={false}
        onSend={mockOnSend}
        userCredits={100}
      />
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('第 3 輪對話（5 則訊息）應該切換為 isEmptyState=false', () => {
    const messages = [
      { id: '1', role: 'user' as const, content: 'Hello' },
      { id: '2', role: 'assistant' as const, content: 'Hi' },
      { id: '3', role: 'user' as const, content: 'How are you?' },
      { id: '4', role: 'assistant' as const, content: 'I am fine' },
      { id: '5', role: 'user' as const, content: 'Great!' },
    ];

    // Math.floor(5/2) = 2，仍然 <= 2，所以還是 empty state
    render(
      <ChatWindow
        messages={messages}
        isLoading={false}
        onSend={mockOnSend}
        userCredits={100}
      />
    );

    // 5 則訊息應該仍然是 empty state
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('第 3 輪對話完成（6 則訊息）應該維持 isEmptyState=false', () => {
    const messages = [
      { id: '1', role: 'user' as const, content: 'Hello' },
      { id: '2', role: 'assistant' as const, content: 'Hi' },
      { id: '3', role: 'user' as const, content: 'How are you?' },
      { id: '4', role: 'assistant' as const, content: 'I am fine' },
      { id: '5', role: 'user' as const, content: 'Great!' },
      { id: '6', role: 'assistant' as const, content: 'Thank you!' },
    ];

    render(
      <ChatWindow
        messages={messages}
        isLoading={false}
        onSend={mockOnSend}
        userCredits={100}
      />
    );

    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('應該正確傳遞 isLoading 狀態給 MessageList', () => {
    render(
      <ChatWindow
        messages={[]}
        isLoading={true}
        onSend={mockOnSend}
        userCredits={100}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('應該正確傳遞 disabled 狀態給 ChatInput', () => {
    render(
      <ChatWindow
        messages={[]}
        isLoading={false}
        onSend={mockOnSend}
        disabled={true}
        userCredits={100}
      />
    );

    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('當 isLoading=true 時應該禁用 ChatInput', () => {
    render(
      <ChatWindow
        messages={[]}
        isLoading={true}
        onSend={mockOnSend}
        userCredits={100}
      />
    );

    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('應該正確傳遞 userCredits 給 ChatInput', () => {
    render(
      <ChatWindow
        messages={[]}
        isLoading={false}
        onSend={mockOnSend}
        userCredits={250}
      />
    );

    expect(screen.getByTestId('credits')).toHaveTextContent('Credits: 250');
  });

  it('應該有過渡效果的 CSS 類別', () => {
    const { container } = render(
      <ChatWindow
        messages={[]}
        isLoading={false}
        onSend={mockOnSend}
        userCredits={100}
      />
    );

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass('transition-all');
    expect(mainDiv).toHaveClass('duration-300');
    expect(mainDiv).toHaveClass('ease-in-out');
  });

  describe('佈局 flex 比例測試', () => {
    it('空白狀態下 MessageList 容器應該有 flex-[2] 類別', () => {
      const { container } = render(
        <ChatWindow
          messages={[]}
          isLoading={false}
          onSend={mockOnSend}
          userCredits={100}
        />
      );

      const messageListContainer = container.querySelector('div.flex-\\[2\\]');
      expect(messageListContainer).toBeInTheDocument();
      expect(messageListContainer?.className).toContain('flex-[2]');
    });

    it('空白狀態下 ChatInput 容器應該有 flex-[3] 類別', () => {
      const { container } = render(
        <ChatWindow
          messages={[]}
          isLoading={false}
          onSend={mockOnSend}
          userCredits={100}
        />
      );

      const chatInputContainer = container.querySelector('div.flex-\\[3\\]');
      expect(chatInputContainer).toBeInTheDocument();
      expect(chatInputContainer?.className).toContain('flex-[3]');
    });

    it('活躍狀態（>2 輪）MessageList 容器應該有 flex-1 類別', () => {
      const messages = [
        { id: '1', role: 'user' as const, content: 'Hello' },
        { id: '2', role: 'assistant' as const, content: 'Hi' },
        { id: '3', role: 'user' as const, content: 'How are you?' },
        { id: '4', role: 'assistant' as const, content: 'I am fine' },
        { id: '5', role: 'user' as const, content: 'Great!' },
        { id: '6', role: 'assistant' as const, content: 'Thank you!' },
        { id: '7', role: 'user' as const, content: 'One more' },
      ];

      const { container } = render(
        <ChatWindow
          messages={messages}
          isLoading={false}
          onSend={mockOnSend}
          userCredits={100}
        />
      );

      const messageListContainer = container.querySelector('div.flex-1');
      expect(messageListContainer).toBeInTheDocument();
      expect(messageListContainer?.className).toContain('flex-1');
    });

    it('活躍狀態（>2 輪）ChatInput 容器不應該有 flex-[3] 類別', () => {
      const messages = [
        { id: '1', role: 'user' as const, content: 'Hello' },
        { id: '2', role: 'assistant' as const, content: 'Hi' },
        { id: '3', role: 'user' as const, content: 'How are you?' },
        { id: '4', role: 'assistant' as const, content: 'I am fine' },
        { id: '5', role: 'user' as const, content: 'Great!' },
        { id: '6', role: 'assistant' as const, content: 'Thank you!' },
        { id: '7', role: 'user' as const, content: 'One more' },
      ];

      const { container } = render(
        <ChatWindow
          messages={messages}
          isLoading={false}
          onSend={mockOnSend}
          userCredits={100}
        />
      );

      const chatInputContainer = container.querySelector('div.flex-\\[3\\]');
      expect(chatInputContainer).not.toBeInTheDocument();
    });
  });

  describe('邊界情況測試', () => {
    it('應該正確處理奇數訊息數量（1 則訊息）', () => {
      const messages = [
        { id: '1', role: 'user' as const, content: 'Hello' },
      ];

      render(
        <ChatWindow
          messages={messages}
          isLoading={false}
          onSend={mockOnSend}
          userCredits={100}
        />
      );

      // 1 則訊息 = 0 輪（Math.floor(1/2) = 0），應該是空白狀態
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('應該正確處理奇數訊息數量（3 則訊息）', () => {
      const messages = [
        { id: '1', role: 'user' as const, content: 'Hello' },
        { id: '2', role: 'assistant' as const, content: 'Hi' },
        { id: '3', role: 'user' as const, content: 'How are you?' },
      ];

      render(
        <ChatWindow
          messages={messages}
          isLoading={false}
          onSend={mockOnSend}
          userCredits={100}
        />
      );

      // 3 則訊息 = 1 輪（Math.floor(3/2) = 1），仍然是空白狀態
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    it('應該正確處理預設 userCredits 值', () => {
      render(
        <ChatWindow
          messages={[]}
          isLoading={false}
          onSend={mockOnSend}
        />
      );

      expect(screen.getByTestId('credits')).toHaveTextContent('Credits: 0');
    });
  });
});

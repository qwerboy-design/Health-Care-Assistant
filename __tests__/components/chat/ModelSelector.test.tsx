import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/providers/LocaleProvider', () => ({
  useLocale: () => ({
    t: (key: string) => ({
      'chat.aiModel': 'AI model',
      'chat.noModels': 'No models',
      'chat.textOnly': 'text only',
      'chat.credits': 'Credits',
      'chat.creditsInsufficient': 'Insufficient credits',
      'chat.consumeCredits': 'Uses',
      'common.loading': 'Loading',
    }[key] || key),
  }),
}));

import { ModelSelector } from '@/components/chat/ModelSelector';

describe('ModelSelector', () => {
  const createModelResponse = () =>
    new Response(
      JSON.stringify({
        success: true,
        data: {
          models: [
            {
              id: 'model-1',
              model_name: 'claude-sonnet-4-5-20250929',
              display_name: 'Claude Sonnet 4.5',
              supports_vision: true,
              credits_per_use: 5,
            },
            {
              id: 'model-2',
              model_name: 'claude-haiku-4-5-20251001',
              display_name: 'Claude Haiku 4.5',
              supports_vision: false,
              credits_per_use: 1,
            },
          ],
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => createModelResponse()));
  });

  it('loads model options and shows credits per use for each model', async () => {
    const onChange = vi.fn();

    render(<ModelSelector value="" onChange={onChange} userCredits={10} />);

    const sonnet = await screen.findByRole('option', { name: 'Claude Sonnet 4.5 - 5 Credits' });
    const haiku = screen.getByRole('option', { name: 'Claude Haiku 4.5 text only - 1 Credits' });
    expect(sonnet).not.toBeDisabled();
    expect(haiku).not.toBeDisabled();
    expect(screen.queryByText(/cost|price/i)).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/models', { cache: 'no-store' });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('claude-sonnet-4-5-20250929');
    });
  });

  it('disables models the user cannot afford and auto-selects the first affordable model', async () => {
    const onChange = vi.fn();

    render(<ModelSelector value="" onChange={onChange} userCredits={3} />);

    const sonnet = await screen.findByRole('option', {
      name: 'Claude Sonnet 4.5 - 5 Credits (Insufficient credits)',
    });
    const haiku = screen.getByRole('option', { name: 'Claude Haiku 4.5 text only - 1 Credits' });
    expect(sonnet).toBeDisabled();
    expect(haiku).not.toBeDisabled();
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('claude-haiku-4-5-20251001');
    });
  });

  it('keeps an unaffordable selected model selected and flags insufficient credits', async () => {
    const onChange = vi.fn();

    render(
      <ModelSelector value="claude-sonnet-4-5-20250929" onChange={onChange} userCredits={0} />,
    );

    await screen.findByRole('option', { name: 'Claude Sonnet 4.5 - 5 Credits (Insufficient credits)' });
    expect(screen.getByRole('option', { name: /Claude Haiku 4\.5/ })).toBeDisabled();
    expect(screen.getByText('Uses: 5 Credits')).toBeInTheDocument();
    expect(screen.getByText('Insufficient credits')).toBeInTheDocument();
    await waitFor(() => expect(onChange).not.toHaveBeenCalled());
  });

  it('refetches the non-financial model list when the window regains focus', async () => {
    render(<ModelSelector value="claude-sonnet-4-5-20250929" onChange={vi.fn()} />);

    await screen.findByRole('option', { name: /Claude Sonnet 4\.5/ });
    fireEvent(window, new Event('focus'));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it('does not import the browser Supabase client or reference model_pricing', () => {
    const source = readFileSync(join(process.cwd(), 'components/chat/ModelSelector.tsx'), 'utf8');

    expect(source).not.toContain('@/lib/supabase/client');
    expect(source).not.toContain('model_pricing');
    expect(source).not.toContain('credits_cost');
  });
});

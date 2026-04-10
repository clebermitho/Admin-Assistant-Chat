import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@/test/test-utils';
import PromptsPage from '@/pages/Prompts';

vi.mock('@/api/client', () => ({
  settingsApi: {
    list: vi.fn(),
    bulkUpdate: vi.fn(),
  },
}));

import { settingsApi } from '@/api/client';

const mockSettingsList = vi.mocked(settingsApi.list);

describe('PromptsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettingsList.mockResolvedValue({ settings: {} });
  });

  it('usa placeholder canônico de base única nos prompts padrão e ajuda da UI', async () => {
    render(<PromptsPage />);

    await waitFor(() => expect(mockSettingsList).toHaveBeenCalledTimes(1));

    expect(screen.queryByText(/\{\{BASE_COREN\}\}/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\{\{BASE_SISTEMA\}\}/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/\{\{KNOWLEDGE_CONTEXT\}\}/).length).toBeGreaterThan(0);

    const suggestionsPrompt = screen.getByPlaceholderText('Prompt de sugestões...') as HTMLTextAreaElement;
    const chatPrompt = screen.getByPlaceholderText('Prompt do chat...') as HTMLTextAreaElement;

    expect(suggestionsPrompt.value).toContain('{{KNOWLEDGE_CONTEXT}}');
    expect(chatPrompt.value).toContain('{{KNOWLEDGE_CONTEXT}}');
    expect(suggestionsPrompt.value).not.toContain('{{BASE_COREN}}');
    expect(suggestionsPrompt.value).not.toContain('{{BASE_SISTEMA}}');
    expect(chatPrompt.value).not.toContain('{{BASE_COREN}}');
    expect(chatPrompt.value).not.toContain('{{BASE_SISTEMA}}');
  });
});

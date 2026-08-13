import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoboOverlay } from './RoboOverlay';
import { RoboProvider } from './RoboProvider';
import { RoboCharacter } from './RoboCharacter';
import { ROBO_STATES } from './robo-states';
import { detectRoboLanguage } from './robo-language';
import { getRoboGuide } from './robo-guides';
import { roboService } from '@/services/robo-service';

vi.mock('@/services/robo-service', () => ({
  roboService: { chat: vi.fn() },
}));

function renderRobo() {
  return render(
    <MemoryRouter>
      <RoboProvider>
        <RoboOverlay />
      </RoboProvider>
    </MemoryRouter>,
  );
}

describe('Robo overlay', () => {
  beforeEach(() => {
    vi.mocked(roboService.chat).mockReset();
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true });
  });

  it('renders the official character and opens chat', async () => {
    renderRobo();
    expect(screen.getByRole('button', { name: 'Open Robo AI Assistant' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Robo AI Assistant' }));
    expect(await screen.findByRole('dialog', { name: 'Robo AI Assistant' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Minimize Robo' }));
    expect(screen.queryByRole('dialog', { name: 'Robo AI Assistant' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Robo AI Assistant' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close Robo chat' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sends chat, shows loading, and can clear', async () => {
    let resolveChat: (value: Awaited<ReturnType<typeof roboService.chat>>) => void = () => undefined;
    vi.mocked(roboService.chat).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveChat = resolve;
        }),
    );
    renderRobo();
    fireEvent.click(screen.getByRole('button', { name: 'Open Robo AI Assistant' }));
    fireEvent.change(screen.getByLabelText('Message Robo'), { target: { value: 'આજે કેટલા booking છે?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Robo is thinking…')).toBeInTheDocument();
    resolveChat({
      reply: 'આજે 2 bookings છે.',
      language: 'gu',
      state: 'talking',
      provider: 'local-erp',
      toolsUsed: ['get_today_bookings'],
    });
    expect(await screen.findByText('આજે 2 bookings છે.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear conversation' }));
    expect(screen.queryByText('આજે 2 bookings છે.')).not.toBeInTheDocument();
  });

  it('retries the last prompt', async () => {
    vi.mocked(roboService.chat).mockRejectedValueOnce(new Error('fail')).mockResolvedValueOnce({
      reply: 'ok',
      language: 'en',
      state: 'talking',
      provider: 'local-erp',
      toolsUsed: [],
    });
    renderRobo();
    fireEvent.click(screen.getByRole('button', { name: 'Open Robo AI Assistant' }));
    fireEvent.change(screen.getByLabelText('Message Robo'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('fail');
    fireEvent.click(screen.getByRole('button', { name: 'Retry last message' }));
    expect(await screen.findByText('ok')).toBeInTheDocument();
  });

  it('hides the floating overlay without affecting the rest of the page', () => {
    renderRobo();
    fireEvent.click(screen.getByRole('button', { name: 'Hide Robo' }));
    expect(screen.queryByRole('button', { name: 'Open Robo AI Assistant' })).not.toBeInTheDocument();
  });

  it('moves toward a guidance target and highlights it', async () => {
    vi.mocked(roboService.chat).mockResolvedValue({
      reply: 'હું બતાવું છું.',
      language: 'gu',
      state: 'guiding',
      guideId: 'add-client',
      provider: 'local-erp',
      toolsUsed: [],
    });
    render(
      <MemoryRouter>
        <nav data-robo-target="clients-nav">Clients</nav>
        <RoboProvider>
          <RoboOverlay />
        </RoboProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open Robo AI Assistant' }));
    fireEvent.change(screen.getByLabelText('Message Robo'), {
      target: { value: 'Client કેવી રીતે add કરવો?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => {
      expect(document.querySelector('.robo-overlay.is-center-left')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continue Robo guide' })).toBeInTheDocument();
    });
  });

  it('shows the Gujarati offline message without calling the API', async () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false });
    renderRobo();
    fireEvent.click(screen.getByRole('button', { name: 'Open Robo AI Assistant' }));
    fireEvent.change(screen.getByLabelText('Message Robo'), { target: { value: 'hi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText(/Robo AI માટે internet connection જરૂરી છે/)).toBeInTheDocument();
    expect(roboService.chat).not.toHaveBeenCalled();
  });
});

describe('Robo character states', () => {
  it('renders every mood state', () => {
    const { rerender } = render(<RoboCharacter state="idle" />);
    for (const state of ROBO_STATES) {
      rerender(<RoboCharacter state={state} />);
      expect(document.querySelector(`[data-robo-state="${state}"]`)).toBeInTheDocument();
    }
  });
});

describe('Robo language and guides', () => {
  it('detects Gujarati, Hindi, and English', () => {
    expect(detectRoboLanguage('આજે કેટલા booking છે?')).toBe('gu');
    expect(detectRoboLanguage('आज कितनी booking हैं?')).toBe('hi');
    expect(detectRoboLanguage('How many bookings do I have today?')).toBe('en');
  });

  it('has reusable guidance steps with stable targets', () => {
    const guide = getRoboGuide('add-client');
    expect(guide?.steps[0].target).toBe('clients-nav');
    expect(guide?.steps[1].target).toBe('add-client');
  });
});

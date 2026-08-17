import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoboOverlay } from './RoboOverlay';
import { RoboProvider } from './RoboProvider';
import { RoboCharacter } from './RoboCharacter';
import { ROBO_STATES } from './robo-states';
import { detectRoboLanguage } from './robo-language';
import { getRoboGuide } from './robo-guides';
import { inspectGltfJson } from './robo-webgl';
import { ROBO_SESSION_KEY } from './robo-interaction';
import { roboService } from '@/services/robo-service';

vi.mock('@/services/robo-service', () => ({
  roboService: { chat: vi.fn() },
}));

function pointer(target: Document | HTMLElement, type: string, clientX: number, clientY: number) {
  target.dispatchEvent(
    new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY, buttons: 1 }),
  );
}

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
    sessionStorage.clear();
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

  it('renders a transparent cutout character at a large default bottom-right size', () => {
    renderRobo();
    const overlay = document.querySelector('.robo-overlay') as HTMLElement;
    expect(overlay).toHaveClass('is-bottom-right');
    expect(overlay.style.left).not.toBe('');
    expect(overlay.style.top).not.toBe('');
    expect(Number.parseInt(overlay.style.height, 10)).toBeGreaterThanOrEqual(240);
    expect(document.querySelector('[data-robo-asset="cutout"]')).toBeInTheDocument();
    expect(document.querySelector('.robo-character img')?.getAttribute('src')).toBe('/robo/robo-character.png');
    expect(document.querySelector('[data-robo-visual="2d"]')).toBeInTheDocument();
    expect(document.querySelector('.robo-eye-stage')).toBeInTheDocument();
  });

  it('drags with pointer events, persists the point, and does not treat a tiny move as a drag', () => {
    renderRobo();
    const handle = screen.getByRole('button', { name: 'Open Robo AI Assistant' });
    const overlay = document.querySelector('.robo-overlay') as HTMLElement;
    const startLeft = overlay.style.left;
    const startTop = overlay.style.top;

    act(() => {
      pointer(handle, 'pointerdown', 400, 400);
      pointer(handle, 'pointermove', 403, 401);
      pointer(handle, 'pointerup', 403, 401);
    });
    expect(overlay.style.left).toBe(startLeft);

    act(() => {
      pointer(handle, 'pointerdown', 400, 400);
      pointer(handle, 'pointermove', 280, 260);
      pointer(handle, 'pointerup', 280, 260);
    });
    expect(overlay.style.left !== startLeft || overlay.style.top !== startTop).toBe(true);
    expect(sessionStorage.getItem(ROBO_SESSION_KEY)).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Robo AI Assistant' })).not.toBeInTheDocument();
  });

  it('keeps voice mute available without opening chat', () => {
    renderRobo();
    fireEvent.click(screen.getByRole('button', { name: 'Mute Robo' }));
    expect(screen.getByRole('button', { name: 'Unmute Robo' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Robo AI Assistant' })).not.toBeInTheDocument();
  });

  it('toggles 3D inspection controls without opening chat', () => {
    renderRobo();
    fireEvent.click(screen.getByRole('button', { name: 'Inspect Robo in 3D' }));
    expect(document.querySelector('.robo-overlay.is-inspect')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset 3D view' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Auto-rotate Robo' }));
    expect(screen.getByRole('button', { name: 'Stop auto-rotate' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Robo AI Assistant' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Exit 3D view' }));
    expect(document.querySelector('.robo-overlay.is-inspect')).not.toBeInTheDocument();
  });

  it('keeps chat controls usable while the character is interactive', async () => {
    renderRobo();
    fireEvent.click(screen.getByRole('button', { name: 'Open Robo AI Assistant' }));
    expect(await screen.findByRole('dialog', { name: 'Robo AI Assistant' })).toBeInTheDocument();
    expect(screen.getByLabelText('Message Robo')).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Minimize Robo' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('moves the eyes toward the pointer', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 400,
      y: 400,
      top: 400,
      left: 400,
      bottom: 430,
      right: 480,
      width: 80,
      height: 30,
      toJSON() {
        return {};
      },
    });
    renderRobo();
    const overlay = document.querySelector('.robo-overlay') as HTMLElement;
    pointer(document, 'pointermove', 0, 0);
    await waitFor(() => {
      expect(Number(overlay.style.getPropertyValue('--robo-eye-x'))).toBeLessThan(0);
      expect(Number(overlay.style.getPropertyValue('--robo-eye-y'))).toBeLessThan(0);
    });
    pointer(document, 'pointermove', 2000, 2000);
    await waitFor(() => {
      expect(Number(overlay.style.getPropertyValue('--robo-eye-x'))).toBeGreaterThan(0);
      expect(Number(overlay.style.getPropertyValue('--robo-eye-y'))).toBeGreaterThan(0);
    });
    vi.restoreAllMocks();
  });
});

describe('Robo character states', () => {
  it('renders every mood state', () => {
    const { rerender } = render(<RoboCharacter state="idle" interactive />);
    for (const state of ROBO_STATES) {
      rerender(<RoboCharacter state={state} interactive />);
      expect(document.querySelector(`[data-robo-state="${state}"]`)).toBeInTheDocument();
      expect(document.querySelector(`.robo-character-motion.is-${state}`)).toBeInTheDocument();
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
    expect(guide?.steps[2].target).toBe('client-name');
    expect(guide?.steps[3].target).toBe('save-client');
  });

  it('keeps an RGBA cutout of the official character', () => {
    const png = readFileSync(join(process.cwd(), 'public/robo/robo-character.png'));
    expect(png.subarray(0, 8).toString('ascii')).toContain('PNG');
    expect(png[25]).toBe(6);
  });

  it('ships the generated full-body Robo GLB', () => {
    const glb = readFileSync(join(process.cwd(), 'public/models/white_mesh.glb'));
    expect(glb.subarray(0, 4).toString('ascii')).toBe('glTF');
    expect(glb.length).toBeGreaterThan(1000);
    const jsonLength = glb.readUInt32LE(12);
    const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8').replace(/\0+$/, ''));
    expect((json.meshes ?? []).length).toBeGreaterThan(0);
    expect((json.nodes ?? []).length).toBeGreaterThan(0);
    expect(json.skins).toBeUndefined();
    expect(json.materials ?? []).toEqual([]);
    expect(inspectGltfJson(json)).toMatchObject({
      rigged: false,
      canRecolorParts: false,
      hasUvs: false,
      hasNamedEyeParts: false,
    });
  });
});

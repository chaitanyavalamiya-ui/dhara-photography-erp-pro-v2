import type { RoboPosition } from './robo-positions';
import type { RoboState } from './robo-states';
import { detectRoboLanguage } from './robo-language';
import { findRoboNavTarget } from './robo-navigation';

export type RoboCommand =
  | { kind: 'guide'; guideId: string; reply: string; state: RoboState }
  | { kind: 'ask'; route: string; position?: RoboPosition; state: RoboState }
  | {
      kind: 'goto';
      target: string;
      route: string;
      position?: RoboPosition;
      reply: string;
      state: RoboState;
    };

function reply(language: ReturnType<typeof detectRoboLanguage>, gu: string, hi: string, en: string): string {
  if (language === 'hi') return hi;
  if (language === 'en') return en;
  return gu;
}

function goto(
  id: string,
  language: ReturnType<typeof detectRoboLanguage>,
  gu: string,
  hi: string,
  en: string,
): RoboCommand | null {
  const nav = findRoboNavTarget(id);
  if (!nav) return null;
  return {
    kind: 'goto',
    target: nav.target,
    route: nav.route,
    position: nav.position,
    state: 'talking',
    reply: reply(language, gu, hi, en),
  };
}

export function detectRoboCommand(text: string): RoboCommand | null {
  const value = text.toLowerCase().trim();
  const language = detectRoboLanguage(text);
  if (!value) return null;

  if (/backup|બેકઅપ|बैकअप/.test(value)) {
    return {
      kind: 'guide',
      guideId: 'backup',
      state: 'guiding',
      reply: reply(language, 'હું બતાવું છું. Backup & Restore અહીં છે.', 'मैं दिखाता हूँ। Backup यहाँ है।', 'I will show you Backup & Restore.'),
    };
  }

  if (/invoice|ઇન્વોઇસ|इनवॉइस|બિલ/.test(value) && /કેવી|कैसे|how|teach|શીખ|सिख/.test(value)) {
    return {
      kind: 'guide',
      guideId: 'create-invoice',
      state: 'teaching',
      reply: reply(language, 'હું invoice બનાવવાનું શીખવું છું.', 'मैं invoice बनाना सिखाता हूँ।', 'I will teach you how to make an invoice.'),
    };
  }

  if (/client|ક્લાયન્ટ|ग्राहक/.test(value) && /add|create|નવો|नया|બનાવ|जोड़|કેવી|कैसे|how/.test(value)) {
    return {
      kind: 'guide',
      guideId: 'add-client',
      state: 'guiding',
      reply: reply(language, 'હું બતાવું છું. પહેલા Clients ખોલો.', 'मैं दिखाता हूँ। पहले Clients खोलें।', 'I will show you. First open Clients.'),
    };
  }

  if (/booking|બુકિંગ|बुकिंग/.test(value) && /add|create|નવી|नई|બનાવ|जोड़|કેવી|कैसे|how|make/.test(value)) {
    return {
      kind: 'guide',
      guideId: 'add-booking',
      state: 'guiding',
      reply: reply(
        language,
        'બરાબર, નવી બુકિંગ માટેનું ફોર્મ ખોલું છું.',
        'ठीक है, नई बुकिंग का फॉर्म खोलता हूँ।',
        'Alright, I will open the new booking form.',
      ),
    };
  }

  if (/invoice|ઇન્વોઇસ|इनवॉइस|બિલ/.test(value) && /add|create|નવુ|नया|બનાવ|make|generate/.test(value)) {
    return {
      kind: 'guide',
      guideId: 'create-invoice',
      state: 'guiding',
      reply: reply(
        language,
        'બરાબર, હું invoice બનાવવા તરફ લઈ જાઉં છું.',
        'ठीक है, मैं invoice बनाने ले चलता हूँ।',
        'Alright, I will take you to create an invoice.',
      ),
    };
  }

  if (/today|આજ|आज/.test(value) && /income|આવક|आमदनी|cash|received/.test(value)) {
    return { kind: 'ask', route: '/reports', position: 'center-right', state: 'talking' };
  }

  if (/today|આજ|आज/.test(value) && /booking|બુકિંગ|बुकिंग/.test(value) && /કેટલા|कितनी|how many|count/.test(value)) {
    return { kind: 'ask', route: '/bookings', position: 'center-left', state: 'talking' };
  }

  if (/today|આજની|आज की/.test(value) && /booking|બુકિંગ|बुकिंग/.test(value) && /બતાવ|दिखा|show/.test(value)) {
    return goto(
      'bookings',
      language,
      'હા, હું આજની બુકિંગ બતાવું છું.',
      'हाँ, मैं आज की बुकिंग दिखाता हूँ।',
      'Yes, I will show today’s bookings.',
    );
  }

  if (/dashboard|ડેશબોર્ડ|डैशबोर्ड/.test(value)) {
    return goto( 'dashboard', language, 'હું ડેશબોર્ડ પર લઈ જાઉં છું.', 'मैं डैशबोर्ड पर ले चलता हूँ।', 'I will take you to the dashboard.');
  }
  if (/calendar|કેલેન્ડર|कैलेंडर/.test(value)) {
    return goto('calendar', language, 'કેલેન્ડર ખોલું છું.', 'कैलेंडर खोलता हूँ।', 'I am opening the calendar.');
  }
  if (/report|રિપોર્ટ|रिपोर्ट/.test(value)) {
    return goto('reports', language, 'રિપોર્ટ બતાવું છું.', 'रिपोर्ट दिखाता हूँ।', 'I will show reports.');
  }
  if (/expense|ખર્ચ|खर्च/.test(value)) {
    return goto('expenses', language, 'ખર્ચ બતાવું છું.', 'खर्च दिखाता हूँ।', 'I will show expenses.');
  }
  if (/gallery|ગેલેરી|गैलरी/.test(value)) {
    return goto('gallery', language, 'ગેલેરી ખોલું છું.', 'गैलरी खोलता हूँ।', 'I am opening the gallery.');
  }
  if (/account|એકાઉન્ટ|खाता/.test(value)) {
    return goto('accounts', language, 'એકાઉન્ટ ખોલું છું.', 'अकाउंट खोलता हूँ।', 'I am opening accounts.');
  }
  if (/deliver|ડિલિવરી|डिलीवरी/.test(value)) {
    return goto('delivery', language, 'ડિલિવરી બતાવું છું.', 'डिलीवरी दिखाता हूँ।', 'I will show deliveries.');
  }
  if (/setting|સેટિંગ|सेटिंग/.test(value)) {
    return goto('settings', language, 'સેટિંગ્સ ખોલું છું.', 'सेटिंग्स खोलता हूँ।', 'I am opening settings.');
  }
  if (/client|ક્લાયન્ટ|ग्राहक/.test(value) && /બતાવ|दिखा|show|open|ખોલ/.test(value)) {
    return goto('clients', language, 'ક્લાયન્ટ બતાવું છું.', 'क्लाइंट दिखाता हूँ।', 'I will show clients.');
  }
  if (/booking|બુકિંગ|बुकिंग/.test(value) && /બતાવ|दिखा|show|open|ખોલ|take me/.test(value)) {
    return goto('bookings', language, 'બુકિંગ તરફ જાઉં છું.', 'बुकिंग पर ले चलता हूँ।', 'I will take you to bookings.');
  }
  if (/invoice|ઇન્વોઇસ|इनवॉइस/.test(value) && /બતાવ|दिखा|show|open|ખોલ/.test(value)) {
    return goto('invoices', language, 'ઇન્વોઇસ બતાવું છું.', 'इनवॉइस दिखाता हूँ।', 'I will show invoices.');
  }

  return null;
}

export const ROBO_QUICK_ACTIONS = [
  { label: 'નવો Client', prompt: 'Client કેવી રીતે add કરવો?' },
  { label: 'નવી Booking', prompt: 'નવી booking કેવી રીતે બનાવવી?' },
  { label: 'આજની Booking', prompt: 'આજે કેટલા booking છે?' },
  { label: 'આજની આવક', prompt: 'આજની income બતાવો' },
  { label: 'Invoice શીખવો', prompt: 'Invoice કેવી રીતે બનાવવું?' },
  { label: 'Backup', prompt: 'Backup કેવી રીતે લેવો?' },
] as const;

const MEMORY_KEY = 'dhara-robo-memory';

export function rememberRoboUse(prompt: string): number {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as { count?: number; last?: string[] }) : {};
    const last = Array.isArray(parsed.last) ? parsed.last : [];
    const next = { count: (parsed.count ?? 0) + 1, last: [...last, prompt].slice(-12) };
    localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
    return next.count;
  } catch {
    return 0;
  }
}

export function roboMemoryCount(): number {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { count?: number };
    return typeof parsed.count === 'number' ? parsed.count : 0;
  } catch {
    return 0;
  }
}

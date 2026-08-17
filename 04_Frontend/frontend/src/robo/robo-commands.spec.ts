import { describe, expect, it } from 'vitest';
import { detectRoboCommand } from './robo-commands';

describe('robo commands from the feature poster', () => {
  it('starts the add-client guide', () => {
    expect(detectRoboCommand('Client કેવી રીતે add કરવો?')?.kind).toBe('guide');
    expect(detectRoboCommand('Add new client')).toMatchObject({ kind: 'guide', guideId: 'add-client' });
  });

  it('starts booking, invoice, and backup guides', () => {
    expect(detectRoboCommand('નવી booking કેવી રીતે બનાવવી?')).toMatchObject({ kind: 'guide', guideId: 'add-booking' });
    expect(detectRoboCommand('Invoice કેવી રીતે બનાવવું?')).toMatchObject({ kind: 'guide', guideId: 'create-invoice' });
    expect(detectRoboCommand('Backup કેવી રીતે લેવો?')).toMatchObject({ kind: 'guide', guideId: 'backup' });
  });

  it('routes today booking and income questions', () => {
    expect(detectRoboCommand('આજે કેટલા booking છે?')).toMatchObject({ kind: 'ask', route: '/bookings' });
    expect(detectRoboCommand('આજની બુકિંગ બતાવો')).toMatchObject({
      kind: 'goto',
      target: 'booking-nav',
      reply: 'હા, હું આજની બુકિંગ બતાવું છું.',
    });
    expect(detectRoboCommand('આજની income બતાવો')).toMatchObject({ kind: 'ask', route: '/reports' });
  });

  it('walks to semantic ERP pages from Gujarati and English voice phrases', () => {
    expect(detectRoboCommand('ક્લાયન્ટ બતાવો')).toMatchObject({ kind: 'goto', target: 'clients-nav' });
    expect(detectRoboCommand('કેલેન્ડર ખોલો')).toMatchObject({ kind: 'goto', route: '/calendar' });
    expect(detectRoboCommand('રિપોર્ટ બતાવો')).toMatchObject({ kind: 'goto', route: '/reports' });
    expect(detectRoboCommand('ખર્ચ બતાવો')).toMatchObject({ kind: 'goto', target: 'expenses-nav' });
    expect(detectRoboCommand('ડેશબોર્ડ પર જાઓ')).toMatchObject({ kind: 'goto', route: '/dashboard' });
    expect(detectRoboCommand('Take me to Bookings')).toMatchObject({ kind: 'goto', target: 'booking-nav' });
    expect(detectRoboCommand('નવી બુકિંગ બનાવો')).toMatchObject({ kind: 'guide', guideId: 'add-booking' });
    expect(detectRoboCommand('ઇન્વોઇસ બનાવો')).toMatchObject({ kind: 'guide', guideId: 'create-invoice' });
  });
});

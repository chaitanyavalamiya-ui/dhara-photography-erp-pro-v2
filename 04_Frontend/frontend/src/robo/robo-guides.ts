import type { RoboPosition } from './robo-positions';
import type { RoboState } from './robo-states';

export interface GuideStep {
  id: string;
  message: string;
  target: string;
  position?: RoboPosition;
  state?: RoboState;
  route?: string;
}

export interface RoboGuide {
  id: string;
  steps: GuideStep[];
}

export const ROBO_GUIDES: RoboGuide[] = [
  {
    id: 'add-client',
    steps: [
      {
        id: 'clients-nav',
        message: 'હું બતાવું છું. પહેલા Clients ખોલો.',
        target: 'clients-nav',
        route: '/clients',
        position: 'center-left',
        state: 'guiding',
      },
      {
        id: 'add-client',
        message: 'Add Client દબાવો.',
        target: 'add-client',
        route: '/clients',
        position: 'top-right',
        state: 'teaching',
      },
    ],
  },
  {
    id: 'add-booking',
    steps: [
      {
        id: 'booking-nav',
        message: 'Bookings પર જાઓ.',
        target: 'booking-nav',
        route: '/bookings',
        position: 'center-left',
        state: 'guiding',
      },
      {
        id: 'add-booking',
        message: 'Add Booking દબાવો.',
        target: 'add-booking',
        route: '/bookings',
        position: 'top-right',
        state: 'teaching',
      },
    ],
  },
  {
    id: 'create-invoice',
    steps: [
      {
        id: 'invoice-nav',
        message: 'Invoices પર જાઓ.',
        target: 'invoice-nav',
        route: '/invoices',
        position: 'center-left',
        state: 'guiding',
      },
      {
        id: 'add-invoice',
        message: 'Generate Invoice દબાવો.',
        target: 'add-invoice',
        route: '/invoices',
        position: 'top-right',
        state: 'teaching',
      },
    ],
  },
  {
    id: 'backup',
    steps: [
      {
        id: 'backup-nav',
        message: 'Backup & Restore અહીં છે.',
        target: 'backup-nav',
        route: '/settings?tab=backup-restore',
        position: 'center-left',
        state: 'guiding',
      },
    ],
  },
];

export function getRoboGuide(id: string): RoboGuide | undefined {
  return ROBO_GUIDES.find((guide) => guide.id === id);
}

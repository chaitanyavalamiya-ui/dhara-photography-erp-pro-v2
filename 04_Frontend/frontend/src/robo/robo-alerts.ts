export type RoboAlertKind =
  | 'booking-tomorrow'
  | 'payment-due'
  | 'album-pending'
  | 'client-follow-up'
  | 'backup-reminder';

export interface RoboAlert {
  id: string;
  kind: RoboAlertKind;
  message: string;
  createdAt: string;
}

import type { DeliverableType, DeliveryStatus } from '@/services/deliveries-service';

export function deliveryStatusTone(status: DeliveryStatus | string): string {
  switch (status) {
    case 'ready':
      return 'is-amber';
    case 'delivered':
      return 'is-green';
    default:
      return 'is-cyan';
  }
}

export function deliverableTypeTone(type: DeliverableType | string): string {
  switch (type) {
    case 'album':
    case 'mini_album':
      return 'is-gold';
    case 'pendrive':
    case 'hard_disk':
    case 'soft_copy':
      return 'is-cyan';
    case 'video':
    case 'reels':
      return 'is-magenta';
    case 'calendar':
      return 'is-amber';
    default:
      return 'is-purple';
  }
}

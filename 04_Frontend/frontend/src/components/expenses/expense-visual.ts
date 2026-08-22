export function expenseCategoryTone(categoryCode: string): string {
  switch (categoryCode) {
    case 'staff':
      return 'is-rose';
    case 'travel':
    case 'fuel':
      return 'is-amber';
    case 'food':
    case 'venue':
      return 'is-gold';
    case 'equipment':
    case 'camera_rental':
    case 'drone':
      return 'is-cyan';
    case 'album_printing':
    case 'printing':
    case 'editing':
      return 'is-purple';
    case 'electricity':
    case 'internet':
    case 'office':
      return 'is-cyan';
    case 'marketing':
      return 'is-magenta';
    default:
      return 'is-gold';
  }
}

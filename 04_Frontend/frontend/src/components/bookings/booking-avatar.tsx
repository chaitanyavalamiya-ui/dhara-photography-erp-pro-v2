const TONES = ['gold', 'cyan', 'purple', 'magenta', 'amber', 'blue'] as const;

export function bookingInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function bookingAvatarTone(name: string): (typeof TONES)[number] {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % TONES.length;
  }
  return TONES[hash];
}

export function BookingAvatar({
  name,
  size = 'md',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <span className={`dhara-bookings-avatar is-${bookingAvatarTone(name)} is-${size}`} aria-hidden>
      {bookingInitials(name) || 'B'}
    </span>
  );
}

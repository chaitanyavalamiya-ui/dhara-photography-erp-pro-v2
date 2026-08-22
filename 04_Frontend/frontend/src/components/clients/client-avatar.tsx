export function clientInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const TONES = ['gold', 'cyan', 'purple', 'magenta', 'amber', 'blue'] as const;

export type ClientAvatarTone = (typeof TONES)[number];

export function clientAvatarTone(name: string): ClientAvatarTone {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % TONES.length;
  }
  return TONES[hash];
}

export function ClientAvatar({
  name,
  size = 'md',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <span className={`dhara-clients-avatar is-${clientAvatarTone(name)} is-${size}`} aria-hidden>
      {clientInitials(name) || 'C'}
    </span>
  );
}

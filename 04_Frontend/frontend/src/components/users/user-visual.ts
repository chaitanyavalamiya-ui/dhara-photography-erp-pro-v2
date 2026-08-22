export function userStatusTone(isActive: boolean, isLocked?: boolean): string {
  if (isLocked) return 'is-amber';
  return isActive ? 'is-green' : 'is-gold';
}

export function userInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const letters = parts.map((part) => part[0] ?? '').join('');
  return letters.toUpperCase() || '?';
}

export const formatActivityDate = (isoDate: string) =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoDate));

export const formatDay = (isoDate: string) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(
    new Date(isoDate),
  );

export const formatTime = (isoDate: string) =>
  new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(isoDate),
  );

export const relativeTime = (isoDate: string) => {
  const elapsed = Date.now() - new Date(isoDate).getTime();
  const hours = Math.max(1, Math.round(elapsed / (60 * 60 * 1000)));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

/**
 * Reliability is only meaningful after repeated attendance. New members should
 * never appear to have a proven 100% track record merely because the seed value
 * is 100.
 */
export const reliabilityLabel = (completedActivities: number, reliabilityScore: number) =>
  completedActivities >= 3 ? `${reliabilityScore}% reliable` : 'New member';

export const initialsFromName = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

export const handleFromName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 20) || 'newmember';

export const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

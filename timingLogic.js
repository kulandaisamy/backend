export function isExpired(paste, now) {
  if (paste.time_limit === null) return false; // unlimited time
  return now - paste.created_at > paste.time_limit * 1000;
}

export function hasViewsLeft(paste) {
  if (paste.remaining_views === null) return true; // unlimited views
  return paste.remaining_views > 0;
}
export function decrementViews(paste) {
  if (paste.remaining_views !== null) {
    paste.remaining_views -= 1;
  }
}

export function getExpiresAt(paste) {
  if (paste.time_limit === null) return null;
  return new Date(paste.created_at + paste.time_limit * 1000).toISOString();
}

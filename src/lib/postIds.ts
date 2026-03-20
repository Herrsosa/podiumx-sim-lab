const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPersistedPostId(postId: string | null | undefined): postId is string {
  return typeof postId === 'string' && UUID_PATTERN.test(postId);
}

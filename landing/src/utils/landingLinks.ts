/** Anchor href: on `/waitlist` (or any non-home route), prefix with `/` so sections resolve on the homepage. */
export function landingAnchor(hash: string, pathname: string): string {
  const clean = hash.startsWith('#') ? hash : `#${hash}`;
  return pathname === '/' ? clean : `/${clean}`;
}

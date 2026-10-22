export function isClosedLaunch(
  value: string | undefined = process.env.NEXT_PUBLIC_LAUNCH_MODE
): boolean {
  return value === 'closed';
}

/**
 * Race `promise` against a timer. If the timer wins, a later rejection on
 * `promise` must not become an unhandled rejection.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage = 'timeout'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  void promise.catch(() => {});
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

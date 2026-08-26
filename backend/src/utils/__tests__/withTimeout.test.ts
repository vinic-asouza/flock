import { withTimeout } from '../withTimeout';

describe('withTimeout', () => {
  it('should resolve when the promise finishes first', async () => {
    await expect(withTimeout(Promise.resolve(42), 200)).resolves.toBe(42);
  });

  it('should reject with the original error when the promise fails first', async () => {
    await expect(
      withTimeout(Promise.reject(new Error('boom')), 200)
    ).rejects.toThrow('boom');
  });

  it('should reject with the timeout message when the timer wins', async () => {
    const hanging = new Promise<never>(() => undefined);
    await expect(withTimeout(hanging, 10, 'stripe_health_timeout')).rejects.toThrow(
      'stripe_health_timeout'
    );
  });

  it('should not emit unhandledRejection when the timed-out promise rejects later', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);

    let rejectLate: ((error: Error) => void) | undefined;
    const late = new Promise<never>((_, reject) => {
      rejectLate = reject;
    });

    try {
      await expect(withTimeout(late, 10, 'stripe_health_timeout')).rejects.toThrow(
        'stripe_health_timeout'
      );
      rejectLate?.(new Error('late stripe error'));
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(unhandled).toHaveLength(0);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});

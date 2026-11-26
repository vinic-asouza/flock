import { resolveSameSite } from '../cookieUtils';

describe('resolveSameSite', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCookieSameSite = process.env.COOKIE_SAMESITE;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalCookieSameSite === undefined) {
      delete process.env.COOKIE_SAMESITE;
    } else {
      process.env.COOKIE_SAMESITE = originalCookieSameSite;
    }
  });

  it('defaults to lax in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.COOKIE_SAMESITE;
    expect(resolveSameSite()).toBe('lax');
  });

  it('defaults to lax in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.COOKIE_SAMESITE;
    expect(resolveSameSite()).toBe('lax');
  });

  it('honors COOKIE_SAMESITE override', () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_SAMESITE = 'none';
    expect(resolveSameSite()).toBe('none');
  });
});

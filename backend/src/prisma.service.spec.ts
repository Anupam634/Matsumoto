import {
  DEFAULT_POOL_SIZE,
  poolSizeFromEnv,
  withPoolSize,
} from './prisma.service';

describe('withPoolSize', () => {
  it('adds a connection_limit to a URL that has none', () => {
    expect(withPoolSize('postgresql://u:p@db:5432/app', 10)).toBe(
      'postgresql://u:p@db:5432/app?connection_limit=10',
    );
  });

  it('keeps the query parameters already there', () => {
    const url = new URL(
      withPoolSize('postgresql://u:p@db:5432/app?schema=public&sslmode=require', 10)!,
    );
    expect(url.searchParams.get('schema')).toBe('public');
    expect(url.searchParams.get('sslmode')).toBe('require');
    expect(url.searchParams.get('connection_limit')).toBe('10');
  });

  it('keeps a percent-encoded password intact', () => {
    const url = new URL(withPoolSize('postgresql://u:p%40ss%2Fw@db/app', 10)!);
    expect(decodeURIComponent(url.password)).toBe('p@ss/w');
  });

  it('leaves a connection_limit the URL already sets alone', () => {
    const url = 'postgresql://u:p@db/app?connection_limit=25';
    expect(withPoolSize(url, 10)).toBe(url);
  });

  it('passes a missing or unparseable URL through untouched', () => {
    expect(withPoolSize(undefined, 10)).toBeUndefined();
    expect(withPoolSize('', 10)).toBe('');
    expect(withPoolSize('not a url', 10)).toBe('not a url');
  });
});

describe('poolSizeFromEnv', () => {
  it('uses a positive integer as given', () => {
    expect(poolSizeFromEnv('20')).toBe(20);
  });

  it.each([undefined, '', '0', '-5', '2.5', 'ten'])(
    'falls back to the default for %p',
    (value) => {
      expect(poolSizeFromEnv(value)).toBe(DEFAULT_POOL_SIZE);
    },
  );
});

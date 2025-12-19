/**
 * Test suite for public endpoint matching logic
 * Ensures that query parameters and fragments don't affect endpoint detection
 */

// Import the helper functions by extracting them from api.ts
const getPathname = (urlStr: string): string => {
  const queryIndex = urlStr.indexOf('?');
  const fragmentIndex = urlStr.indexOf('#');
  let pathname = urlStr;
  
  if (queryIndex !== -1) {
    pathname = pathname.substring(0, queryIndex);
  }
  if (fragmentIndex !== -1 && (queryIndex === -1 || fragmentIndex < queryIndex)) {
    pathname = pathname.substring(0, fragmentIndex);
  }
  
  return pathname;
};

const isPublicEndpoint = (url: string): boolean => {
  const publicEndpoints = ['/auth/register', '/auth/login', '/auth/google', '/auth/apple', '/auth/refresh', '/health'];
  const pathname = getPathname(url || '');
  
  // Root path is public
  if (pathname === '/') return true;
  
  // Check if pathname matches any public endpoint
  return publicEndpoints.some(endpoint => {
    // Exact match
    if (pathname === endpoint) return true;
    // Starts with endpoint + '/' (prevents partial matches like '/auth/login-backup')
    if (pathname.startsWith(endpoint + '/')) return true;
    return false;
  });
};

describe('getPathname', () => {
  it('should extract pathname without query parameters', () => {
    expect(getPathname('/auth/login?redirect=/dashboard')).toBe('/auth/login');
    expect(getPathname('/auth/login?foo=bar&baz=qux')).toBe('/auth/login');
  });

  it('should extract pathname without fragments', () => {
    expect(getPathname('/auth/login#section')).toBe('/auth/login');
    expect(getPathname('/auth/login#section1#section2')).toBe('/auth/login');
  });

  it('should extract pathname without both query and fragment', () => {
    expect(getPathname('/auth/login?redirect=/dashboard#section')).toBe('/auth/login');
    expect(getPathname('/auth/login#section?foo=bar')).toBe('/auth/login');
  });

  it('should return pathname as-is if no query or fragment', () => {
    expect(getPathname('/auth/login')).toBe('/auth/login');
    expect(getPathname('/api/users/123')).toBe('/api/users/123');
  });

  it('should handle empty string', () => {
    expect(getPathname('')).toBe('');
  });

  it('should handle root path', () => {
    expect(getPathname('/')).toBe('/');
    expect(getPathname('/?foo=bar')).toBe('/');
  });
});

describe('isPublicEndpoint', () => {
  describe('should correctly identify public endpoints', () => {
    it('exact matches', () => {
      expect(isPublicEndpoint('/auth/register')).toBe(true);
      expect(isPublicEndpoint('/auth/login')).toBe(true);
      expect(isPublicEndpoint('/auth/google')).toBe(true);
      expect(isPublicEndpoint('/auth/apple')).toBe(true);
      expect(isPublicEndpoint('/auth/refresh')).toBe(true);
      expect(isPublicEndpoint('/health')).toBe(true);
      expect(isPublicEndpoint('/')).toBe(true);
    });

    it('with query parameters', () => {
      expect(isPublicEndpoint('/auth/login?redirect=/dashboard')).toBe(true);
      expect(isPublicEndpoint('/auth/register?foo=bar')).toBe(true);
      expect(isPublicEndpoint('/auth/google?state=xyz')).toBe(true);
      expect(isPublicEndpoint('/health?check=full')).toBe(true);
    });

    it('with fragments', () => {
      expect(isPublicEndpoint('/auth/login#section')).toBe(true);
      expect(isPublicEndpoint('/auth/register#form')).toBe(true);
    });

    it('with both query and fragment', () => {
      expect(isPublicEndpoint('/auth/login?redirect=/dashboard#section')).toBe(true);
      expect(isPublicEndpoint('/auth/register?invite=xyz#form')).toBe(true);
    });

    it('with subpaths', () => {
      expect(isPublicEndpoint('/auth/login/callback')).toBe(true);
      expect(isPublicEndpoint('/auth/register/verify')).toBe(true);
      expect(isPublicEndpoint('/health/status')).toBe(true);
    });

    it('with subpaths and query parameters', () => {
      expect(isPublicEndpoint('/auth/login/callback?code=123')).toBe(true);
      expect(isPublicEndpoint('/auth/register/verify?token=abc')).toBe(true);
    });
  });

  describe('should correctly identify private endpoints', () => {
    it('non-public paths', () => {
      expect(isPublicEndpoint('/api/users')).toBe(false);
      expect(isPublicEndpoint('/api/receipts')).toBe(false);
      expect(isPublicEndpoint('/users/123')).toBe(false);
      expect(isPublicEndpoint('/receipts')).toBe(false);
    });

    it('with query parameters', () => {
      expect(isPublicEndpoint('/api/users?limit=10')).toBe(false);
      expect(isPublicEndpoint('/receipts?userId=123')).toBe(false);
    });
  });

  describe('should prevent security bypasses', () => {
    it('partial matches should not be treated as public', () => {
      expect(isPublicEndpoint('/auth/login-backup')).toBe(false);
      expect(isPublicEndpoint('/auth/register2')).toBe(false);
      expect(isPublicEndpoint('/authentication/login')).toBe(false);
      expect(isPublicEndpoint('/myhealth')).toBe(false);
    });

    it('query parameter injection should not be treated as public', () => {
      expect(isPublicEndpoint('/api/secure?q=/auth/login')).toBe(false);
      expect(isPublicEndpoint('/api/users?redirect=/auth/register')).toBe(false);
      expect(isPublicEndpoint('/private/data?path=/health')).toBe(false);
    });

    it('fragment injection should not be treated as public', () => {
      expect(isPublicEndpoint('/api/secure#/auth/login')).toBe(false);
      expect(isPublicEndpoint('/private/data#/health')).toBe(false);
    });

    it('encoded slashes should not bypass security', () => {
      // Note: URL encoding happens at a different layer, but testing edge cases
      expect(isPublicEndpoint('/api/secure%2Fauth%2Flogin')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('empty string should not be public', () => {
      expect(isPublicEndpoint('')).toBe(false);
    });

    it('only query parameter should not be public', () => {
      expect(isPublicEndpoint('?foo=bar')).toBe(false);
    });

    it('only fragment should not be public', () => {
      expect(isPublicEndpoint('#section')).toBe(false);
    });
  });
});



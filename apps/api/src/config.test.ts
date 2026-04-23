import { describe, expect, it } from 'vitest';

import { getAppConfig } from './config';

describe('getAppConfig', () => {
  it('parses comma-separated WEB_ORIGIN values', () => {
    const config = getAppConfig({ WEB_ORIGIN: 'http://one.test, http://two.test ,http://three.test' } as NodeJS.ProcessEnv);

    expect(config.webOrigins).toEqual([
      'http://one.test',
      'http://two.test',
      'http://three.test',
    ]);
  });
});

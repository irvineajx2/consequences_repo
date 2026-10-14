#!/usr/bin/env node
/**
 * npm run check-avatar: validates the avatar catalogue, renders every reference case with the app's
 * renderer and compares it with docs/avatar/reference/, and writes contact sheets (every base in
 * every set, every hat on every base) to avatar-sheets/ (gitignored). See tests/avatar/check.test.ts.
 */
process.env.AVATAR_SHEETS = '1';
require('jest')
  .run(['tests/avatar', '--colors'])
  .catch(() => {
    process.exitCode = 1;
  });

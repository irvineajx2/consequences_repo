import fs from 'fs';
import path from 'path';

const coreDir = path.join(__dirname, '../../src/core');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|js|jsx)$/.test(entry.name) ? [full] : [];
  });
}

const files = sourceFiles(coreDir);
const importPattern = /(?:from\s+|import\s+|require\s*\(\s*)['"]([^'"]+)['"]/g;

describe('core purity', () => {
  it('has source files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  test.each(files.map((f) => [path.relative(coreDir, f), f]))(
    '%s does not import react, react-native or expo',
    (_name, file) => {
      const source = fs.readFileSync(file, 'utf8');
      const modules = [...source.matchAll(importPattern)].map((m) => m[1]);
      for (const mod of modules) {
        expect(mod).not.toMatch(/^(react|react-native|expo[^/]*|@expo\/.*)(\/|$)/);
      }
    },
  );

  test.each(files.map((f) => [path.relative(coreDir, f), f]))('%s is ruler-agnostic', (_name, file) => {
    const source = fs.readFileSync(file, 'utf8');
    expect(source).not.toMatch(/elizabeth|armada|spain|gloriana/i);
  });
});

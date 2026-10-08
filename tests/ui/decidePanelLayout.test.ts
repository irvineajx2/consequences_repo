import { decidePanelLayout } from '../../src/ui/decidePanelLayout';

// The defaults match the Tudor skin: 22 pt panel padding, 56 pt buttons with 8 pt gaps, 21 pt
// narration lines, an 8 pt gap below the panel.
const LARGE = 844; // e.g. iPhone 14, 34 pt home indicator
const SMALL = 667; // e.g. iPhone SE, no home indicator
const twoLines = 2 * 21;

describe('decidePanelLayout', () => {
  it('keeps full-size buttons within 35% on a large phone with two options', () => {
    const layout = decidePanelLayout(LARGE, 2, { bottomInset: 34 });
    expect(layout.buttonHeight).toBe(56);
    expect(layout.decidePanelHeight).toBe(layout.readPanelHeight);
    expect(layout.decidePanelHeight + 34 + 8).toBeLessThanOrEqual(LARGE * 0.35);
    expect(layout.narrationHeight).toBeGreaterThanOrEqual(twoLines);
    expect(layout.fits).toBe(true);
  });

  it('shortens buttons, but not below 44, to stay within 35% on a large phone with three options', () => {
    const layout = decidePanelLayout(LARGE, 3, { bottomInset: 34 });
    expect(layout.buttonHeight).toBeLessThan(56);
    expect(layout.buttonHeight).toBeGreaterThanOrEqual(44);
    expect(layout.decidePanelHeight).toBe(layout.readPanelHeight);
    expect(layout.decidePanelHeight + 34 + 8).toBeLessThanOrEqual(LARGE * 0.35);
    expect(layout.narrationHeight).toBeGreaterThanOrEqual(twoLines);
  });

  it('shortens buttons only as far as needed', () => {
    const layout = decidePanelLayout(LARGE, 3, { bottomInset: 34 });
    const taller = layout.buttonHeight + 2;
    // One step taller would not have left room for two lines of narration.
    const content = layout.decidePanelHeight - 44;
    expect(3 * (taller + 8) + twoLines).toBeGreaterThan(content);
  });

  it('keeps full-size buttons within 35% on a small phone with two options', () => {
    const layout = decidePanelLayout(SMALL, 2);
    expect(layout.buttonHeight).toBe(56);
    expect(layout.decidePanelHeight).toBe(layout.readPanelHeight);
    expect(layout.fits).toBe(true);
  });

  it('grows the decide phase, at most to 40%, on a small phone with three options', () => {
    const layout = decidePanelLayout(SMALL, 3);
    expect(layout.buttonHeight).toBe(44);
    expect(layout.decidePanelHeight).toBeGreaterThan(layout.readPanelHeight);
    expect(layout.decidePanelHeight + 8).toBeGreaterThan(SMALL * 0.35);
    expect(layout.decidePanelHeight + 8).toBeLessThanOrEqual(SMALL * 0.4);
    expect(layout.readPanelHeight + 8).toBeLessThanOrEqual(SMALL * 0.35);
    expect(layout.narrationHeight).toBeGreaterThanOrEqual(twoLines);
    expect(layout.fits).toBe(true);
  });

  it('never lets the read phase pass 35% or the decide phase pass 40%, even when nothing fits', () => {
    const layout = decidePanelLayout(480, 4);
    expect(layout.readPanelHeight + 8).toBeLessThanOrEqual(480 * 0.35);
    expect(layout.decidePanelHeight + 8).toBeLessThanOrEqual(480 * 0.4);
    expect(layout.buttonHeight).toBe(44);
    expect(layout.fits).toBe(false);
  });
});

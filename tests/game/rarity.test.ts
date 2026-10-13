import { rulers } from '../../src/data/rulers';
import { endingRarity, RARITY_TIERS, tierFor } from '../../src/game/rarity';

describe('ending rarity data', () => {
  test.each(rulers.map((r) => [r.id, r] as const))('%s: every ending has a share and a tier, from 1,000,000 history-leaning runs', (_id, ruler) => {
    expect(ruler.rarity.runs).toBeGreaterThanOrEqual(1_000_000);
    expect(Object.keys(ruler.rarity.endings).sort()).toEqual(Object.keys(ruler.rules.endings).sort());
    for (const id of Object.keys(ruler.rules.endings)) {
      const r = endingRarity(ruler.rarity, id)!;
      expect(r.share).toBeGreaterThan(0);
      expect(RARITY_TIERS).toContain(r.tier);
      // The tier matches the thresholds (and the 10-run floor).
      expect(r.tier).toBe(tierFor(r.share, r.runs));
      expect(r.share).toBeCloseTo(r.runs / ruler.rarity.runs, 12);
    }
  });

  it('classes shares by the thresholds', () => {
    expect(tierFor(0.05, 50000)).toBe('common');
    expect(tierFor(0.0499, 49900)).toBe('uncommon');
    expect(tierFor(0.01, 10000)).toBe('uncommon');
    expect(tierFor(0.0099, 9900)).toBe('rare');
    expect(tierFor(0.001, 1000)).toBe('rare');
    expect(tierFor(0.00099, 990)).toBe('epic');
    expect(tierFor(0.0001, 100)).toBe('epic');
    expect(tierFor(0.000099, 99)).toBe('legendary');
    // Fewer than 10 simulated runs: Legendary whatever the share.
    expect(tierFor(0.5, 9)).toBe('legendary');
  });
});

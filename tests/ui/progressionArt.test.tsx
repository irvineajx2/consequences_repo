// Reanimated's and Worklets' own Jest mocks: the native worklets runtime is not available under Jest.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

import { Image, PixelRatio, Text, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { applyRunRewards, emptyProgression, type RewardOutcome, xpAtLevel } from '../../src/game/progression';
import { applyRunResult, emptyRulerProfile } from '../../src/game/profile';
import { BandGem, Medallion, MedallionSlot, XpBar } from '../../src/ui/progression/ProgressionArt';
import { RewardsOverlay } from '../../src/ui/progression/RewardsOverlay';
import { SkinProvider } from '../../src/ui/skin/SkinProvider';
import { tudorSkin } from '../../src/ui/skin/tudor';
import { goldenCases } from '../core/helpers';

const { progression: art } = tudorSkin;
const gloriana = goldenCases.find((c) => c.name === 'historical_path')!;

function flatStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatStyle));
  return style && typeof style === 'object' ? (style as Record<string, unknown>) : {};
}

function render(element: React.ReactElement, width = 200): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<SkinProvider skin={tudorSkin}>{element}</SkinProvider>);
  });
  act(() => {
    for (const view of tree.root.findAll((n) => n.type === View && typeof n.props.onLayout === 'function')) {
      view.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height: 18 } } });
    }
  });
  return tree;
}

const imageStyle = (tree: ReactTestRenderer, source: unknown) =>
  flatStyle(tree.root.findAll((n) => n.type === Image && n.props.source === source)[0].props.style);
const numberStyle = (level: number) => flatStyle(render(<Medallion level={level} />).root.findByType(Text).props.style);

/** Renders the rewards panel on fake timers, with helpers to read what it shows. */
function playRewards(rewards: RewardOutcome) {
  const tree = render(<RewardsOverlay rewards={rewards} onDone={() => {}} />);
  return {
    tree,
    images: (source: unknown) => tree.root.findAll((n) => n.type === Image && n.props.source === source),
    text: () => tree.root.findAllByType(Text).map((t) => [t.props.children].flat().join('')).join('\n'),
    barFill: () => tree.root.findByType(XpBar).props.fraction as number,
    laurels: () =>
      tree.root
        .findAll((n) => n.type === Image && (n.props.source === art.images.laurel || n.props.source === art.images.laurel_major))
        .map((n) => (n.props.source === art.images.laurel_major ? 'major' : 'normal')),
    wait: (ms: number) =>
      act(() => {
        jest.advanceTimersByTime(ms);
      }),
  };
}

/** A repeat Gloriana run (no new ending), earning `repeats` x 170 XP, from `totalXp` into the account. */
function repeatRun(totalXp: number, repeats = 1): RewardOutcome {
  const result = {
    ending: 'gloriana',
    score: 120,
    decisions: Array.from({ length: repeats }, () => gloriana.expected.decisions).flat(),
    finishedAt: '2026-10-12T00:00:00.000Z',
  };
  const reached = applyRunResult(emptyRulerProfile, result).profile;
  return applyRunRewards({ ...emptyProgression, totalXp }, 'elizabeth-i', 'r2', result, reached);
}

// The panel's timings: the bar starts after 0.3 s and fills over 1.1 s; a level-up holds 1.6 s.
const LEVEL_UP_AT = 300 + 1100;

describe('progression art', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('draws the XP bar as three slices on whole pixels, the middle overlapping each cap by a pixel', () => {
    const tree = render(<XpBar fraction={0.5} />, 200.3);
    const left = imageStyle(tree, art.images.bar_left);
    const mid = imageStyle(tree, art.images.bar_mid);
    const right = imageStyle(tree, art.images.bar_right);
    const pixel = 1 / PixelRatio.get();
    const onPixel = (n: number) => Math.abs(n * PixelRatio.get() - Math.round(n * PixelRatio.get())) < 1e-9;
    for (const n of [left.width, right.left, right.width]) expect(onPixel(n as number)).toBe(true);
    expect(mid.left).toBeCloseTo((left.width as number) - pixel, 9);
    expect((mid.left as number) + (mid.width as number)).toBeCloseTo((right.left as number) + pixel, 9);
    expect(left.width).toBe(PixelRatio.roundToNearestPixel(art.layout.bar.capLeftWidthPt));
  });

  it('colours the medallion by rank: blue, green, red, purple, gold, gold at levels 1, 5, 10, 15, 20, 30', () => {
    const levels: [number, string][] = [
      [1, 'blue'],
      [4, 'blue'],
      [5, 'green'],
      [10, 'red'],
      [15, 'purple'],
      [20, 'gold'],
      [30, 'gold'],
    ];
    for (const [level, colour] of levels) {
      const tier = art.ranks.tiers[colour];
      const image = render(<Medallion level={level} />).root.findByType(Image);
      expect(image.props.source).toBe(art.images[tier.image]);
      // Higher ranks are physically larger: each tier's own height, at one shared scale.
      expect(flatStyle(image.props.style).height).toBe(tier.heightPt);
    }
  });

  it('draws the level number in Cinzel inside the rim: parchment, but dark ink on the gold tier', () => {
    const cases = [
      [3, 'blue', art.colors.level],
      [15, 'purple', art.colors.level],
      [20, 'gold', tudorSkin.colors.panelText],
    ] as const;
    for (const [level, colour, ink] of cases) {
      const tier = art.ranks.tiers[colour];
      const style = numberStyle(level);
      const width = tier.heightPt * tier.aspect;
      expect(style.fontFamily).toBe(tudorSkin.fonts.caption);
      expect(style.color).toBe(ink);
      expect(style.width).toBeCloseTo(width * tier.text.interiorRadiusFraction * 2, 9);
      expect((style.left as number) + (style.width as number) / 2).toBeCloseTo(width * tier.text.centreX, 9);
      expect((style.top as number) + (style.height as number) / 2).toBeCloseTo(tier.heightPt * tier.text.centreY, 9);
    }
    // Relative to the space inside the rim, more digits draw smaller.
    const fill = (level: number) => (numberStyle(level).fontSize as number) / (numberStyle(level).width as number);
    expect(fill(100)).toBeLessThan(fill(30));
    expect(fill(30)).toBeLessThan(fill(9));
  });

  it("keeps the plate's medallion slot the same size at every rank", () => {
    const box = (level: number) => flatStyle(render(<MedallionSlot level={level} />).root.findAllByType(View)[0].props.style);
    const first = box(1);
    expect(first.height).toBe(Math.max(...Object.values(art.ranks.tiers).map((t) => t.heightPt)));
    for (const level of [5, 10, 15, 20, 30, 100]) {
      expect([box(level).width, box(level).height]).toEqual([first.width, first.height]);
    }
  });

  it('shows each band gem at its layout size', () => {
    const style = flatStyle(render(<BandGem band="legendary" />).root.findByType(Image).props.style);
    expect(style.height).toBe(18);
    expect(style.width).toBeCloseTo(18 * 0.9179, 6);
  });

  it('shows the rewards with the ending band gem, and the laurel on level-up', () => {
    const rewards = applyRunRewards(
      emptyProgression,
      'elizabeth-i',
      'r1',
      { ending: 'gloriana', decisions: gloriana.expected.decisions },
      emptyRulerProfile,
    );
    const panel = playRewards(rewards);
    expect(panel.text()).toContain('+270 XP');
    expect(panel.text()).toContain('Rare ending');
    expect(panel.text()).toContain('+80 Gold, new ending');
    expect(panel.images(art.images.gem_rare)).toHaveLength(1);
    expect(panel.laurels()).toEqual([]);
    panel.wait(LEVEL_UP_AT + 100);
    expect(panel.laurels()).toEqual(['normal']);
    expect(flatStyle(panel.images(art.images.laurel)[0].props.style).height).toBe(art.ranks.laurel.heightPt);
    expect(panel.text()).toContain('Level 2');
  });

  it('levelling from 4 to 5 plays the major laurel, the green medallion and "Scribe", held longer', () => {
    const panel = playRewards(repeatRun(xpAtLevel(5) - 50));
    panel.wait(LEVEL_UP_AT + 50);
    expect(panel.laurels()).toEqual(['major']);
    expect(panel.images(art.images.medallion_green)).toHaveLength(1);
    expect(panel.text()).toContain('Level 5');
    expect(panel.text()).toContain('Scribe');
    // A normal level-up moves on after 1.6 s; this one is still held at 2.0 s, and over by 2.5 s.
    panel.wait(2000);
    expect(panel.barFill()).toBe(1);
    panel.wait(500);
    expect(panel.barFill()).toBe(0);
  });

  it('levelling from 5 to 6 plays the normal laurel, with no rank title', () => {
    const panel = playRewards(repeatRun(xpAtLevel(6) - 50));
    panel.wait(LEVEL_UP_AT + 50);
    expect(panel.laurels()).toEqual(['normal']);
    expect(panel.images(art.images.medallion_green)).toHaveLength(1);
    expect(panel.text()).toContain('Level 6');
    expect(panel.text()).not.toContain('Scribe');
    panel.wait(1600);
    expect(panel.barFill()).toBe(0);
  });

  it('plays each level of a multi-level run in turn, the major laurel only on the rank boundary', () => {
    const rewards = repeatRun(xpAtLevel(4) + 350, 3);
    expect([rewards.levelBefore, rewards.levelAfter]).toEqual([4, 6]);
    const panel = playRewards(rewards);
    panel.wait(LEVEL_UP_AT + 50);
    expect(panel.laurels()).toEqual(['major']);
    // After the 2.4 s major hold, the bar fills level 5, then the normal laurel for level 6.
    panel.wait(2400);
    panel.wait(LEVEL_UP_AT + 50);
    expect(panel.laurels()).toEqual(['normal']);
    expect(panel.text()).toContain('Level 6');
  });
});

// Reanimated's and Worklets' own Jest mocks: the native worklets runtime is not available under Jest.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

import { Image, PixelRatio, Text, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { applyRunRewards, emptyProgression } from '../../src/game/progression';
import { emptyRulerProfile } from '../../src/game/profile';
import { BandGem, Medallion, XpBar } from '../../src/ui/progression/ProgressionArt';
import { RewardsOverlay } from '../../src/ui/progression/RewardsOverlay';
import { SkinProvider } from '../../src/ui/skin/SkinProvider';
import { tudorSkin } from '../../src/ui/skin/tudor';
import { goldenCases } from '../core/helpers';

const { progression: art } = tudorSkin;

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

describe('progression art', () => {
  it('draws the XP bar as three slices on whole pixels, the middle overlapping each cap by a pixel', () => {
    const tree = render(<XpBar fraction={0.5} />, 200.3);
    const left = imageStyle(tree, art.images.bar_left);
    const mid = imageStyle(tree, art.images.bar_mid);
    const right = imageStyle(tree, art.images.bar_right);
    const pixel = 1 / PixelRatio.get();
    const onPixel = (n: number) => Math.abs(n * PixelRatio.get() - Math.round(n * PixelRatio.get())) < 1e-9;
    for (const n of [left.width, right.left, right.width, left.width as number]) expect(onPixel(n as number)).toBe(true);
    expect(mid.left).toBeCloseTo((left.width as number) - pixel, 9);
    expect((mid.left as number) + (mid.width as number)).toBeCloseTo((right.left as number) + pixel, 9);
    expect(left.width).toBe(PixelRatio.roundToNearestPixel(art.layout.bar.capLeftWidthPt));
  });

  it('centres the level number in the medallion in Cinzel, smaller for three digits', () => {
    const size = (level: number) =>
      flatStyle(render(<Medallion level={level} />).root.findByType(Text).props.style).fontSize as number;
    const style = flatStyle(render(<Medallion level={7} />).root.findByType(Text).props.style);
    expect(style.fontFamily).toBe(tudorSkin.fonts.caption);
    expect(style.color).toBe(art.colors.level);
    expect(size(100)).toBeLessThan(size(10));
    expect(size(10)).toBeLessThan(size(7));
  });

  it('shows each band gem at its layout size', () => {
    const style = flatStyle(render(<BandGem band="legendary" />).root.findByType(Image).props.style);
    expect(style.height).toBe(18);
    expect(style.width).toBeCloseTo(18 * 0.9179, 6);
  });

  it('shows the rewards with the ending band gem, and the laurel on level-up', () => {
    jest.useFakeTimers();
    const run = goldenCases.find((c) => c.name === 'historical_path')!;
    const rewards = applyRunRewards(emptyProgression, 'elizabeth-i', 'r1', {
      ending: 'gloriana',
      decisions: run.expected.decisions,
    }, emptyRulerProfile);
    const tree = render(<RewardsOverlay rewards={rewards} onDone={() => {}} />);
    const text = () => tree.root.findAllByType(Text).map((t) => [t.props.children].flat().join('')).join('\n');
    expect(text()).toContain('+270 XP');
    expect(text()).toContain('Rare ending');
    expect(text()).toContain('+80 Gold, new ending');
    expect(tree.root.findAll((n) => n.type === Image && n.props.source === art.images.gem_rare)).toHaveLength(1);
    const laurels = () => tree.root.findAll((n) => n.type === Image && n.props.source === art.images.laurel);
    expect(laurels()).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(laurels()).toHaveLength(1);
    expect(flatStyle(laurels()[0].props.style).height).toBe(art.layout.laurel.heightPt);
    expect(text()).toContain('Level 2');
    jest.useRealTimers();
  });
});

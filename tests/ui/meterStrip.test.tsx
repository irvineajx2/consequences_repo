// Reanimated's and Worklets' own Jest mocks: the native worklets runtime is not available under Jest.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

import { Image, type ImageSourcePropType } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getRuler, type Ruler } from '../../src/data/rulers';
import * as session from '../../src/game/session';
import { MeterStrip } from '../../src/ui/meters/MeterStrip';
import { RulerProvider } from '../../src/ui/RulerContext';
import { SkinProvider } from '../../src/ui/skin/SkinProvider';
import { tudorSkin } from '../../src/ui/skin/tudor';

const skin = tudorSkin.meters;
const metrics = { frame: { x: 0, y: 0, width: 430, height: 932 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

function flatStyle(style: unknown): Record<string, number> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatStyle));
  return style && typeof style === 'object' ? (style as Record<string, number>) : {};
}

function render(ruler: Ruler): ReactTestRenderer {
  const state = session.start(ruler.rules, ruler.ui).run.state;
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <SafeAreaProvider initialMetrics={metrics}>
        <SkinProvider skin={tudorSkin}>
          <RulerProvider ruler={ruler}>
            <MeterStrip state={state} />
          </RulerProvider>
        </SkinProvider>
      </SafeAreaProvider>,
    );
  });
  return tree;
}

/** The style of the image drawn from `source` (the first, if several). */
const styleOf = (tree: ReactTestRenderer, source: ImageSourcePropType) =>
  flatStyle(tree.root.findAll((n) => n.type === Image && n.props.source === source)[0]?.props.style);

describe('meter icons at 1.2x', () => {
  it.each([['elizabeth-i', 'tr', 'treasury'], ['julius-caesar', 'fortune', 'fortune']])(
    '%s: the %s icon is 20%% larger, with its drained copy, shadow and glow still aligned',
    (rulerId, _meter, name) => {
      const tree = render(getRuler(rulerId));
      const m = skin.metrics[name];
      const height = skin.layout.fillHeight * 1.2;
      const width = height * m.aspect;
      const pad = m.effectPadPt * 1.2;
      // On a wide phone nothing shrinks: exactly 1.2x the skin's size.
      expect(styleOf(tree, skin.images[`${name}_empty`])).toMatchObject({ left: 0, top: 0, width, height });
      expect(styleOf(tree, skin.images[name])).toMatchObject({ left: 0, bottom: 0, width, height });
      // Shadow and glow: larger by the scaled pad on every side, centred (the shadow a scaled 2 pt lower).
      expect(styleOf(tree, skin.images[`${name}_shadow`])).toMatchObject({
        left: -pad,
        top: -pad + skin.layout.shadowOffset * 1.2,
        width: width + 2 * pad,
        height: height + 2 * pad,
      });
      expect(styleOf(tree, skin.images[`${name}_glow`])).toMatchObject({ left: 0, top: 0, width: width + 2 * pad, height: height + 2 * pad });
    },
  );

  it("draws Charles's placeholder medals 20% larger too", () => {
    const tree = render(getRuler('charles-i'));
    const slots = tree.root.findAll((n) => typeof n.type !== 'string' && n.props.accessibilityRole === 'button' && 'onPress' in n.props);
    expect(slots).toHaveLength(5);
    for (const slot of slots) expect(flatStyle(slot.props.style).height).toBeCloseTo(skin.layout.fillHeight * 1.2, 9);
  });
});

// Reanimated's and Worklets' own Jest mocks: the native worklets runtime is not available under Jest.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

import { Image } from 'expo-image';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getRuler, rulers, type Ruler } from '../../src/data/rulers';
import * as session from '../../src/game/session';
import type { SessionView } from '../../src/game/session';
import { imageRegistries } from '../../src/ui/imageRegistry';
import { getImage, placeholderImage } from '../../src/ui/images';
import { bundledCachePolicy } from '../../src/ui/RulerImage';
import { SessionScreen } from '../../src/ui/SessionScreen';
import { SkinProvider } from '../../src/ui/skin/SkinProvider';
import { tudorSkin } from '../../src/ui/skin/tudor';

const noop = () => {};
const handlers = {
  onDecide: noop,
  onChoose: noop,
  onContinue: noop,
  onPlayAgain: noop,
  onChronicle: noop,
  onBackToTitle: noop,
};
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

function screen(ruler: Ruler, view: SessionView) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <SkinProvider skin={tudorSkin}>
        <SessionScreen rulerId={ruler.id} view={view} text={ruler.text} {...handlers} />
      </SkinProvider>
    </SafeAreaProvider>
  );
}

/** The opening views of a new run: the prologue, then the era 1 card. */
function openingViews(ruler: Ruler): SessionView[] {
  let s = session.start(ruler.rules, ruler.ui);
  const views = [s.view];
  s = session.continue(s);
  views.push(s.view);
  return views;
}

/** The background image a rendered view draws. */
const drawnImage = (tree: ReactTestRenderer) => tree.root.findByType(Image).props;

/** This ruler's own image for an id: its registered file, or the placeholder until it is drawn. */
const own = (ruler: Ruler, id: string) => imageRegistries[ruler.id]?.[id] ?? placeholderImage;

describe("a new run's opening images", () => {
  test.each(rulers.map((r) => [r.id, r] as const))(
    '%s: the prologue and era 1 card show its own images, never disk-cached',
    (_id, ruler) => {
      const [prologue, era1] = openingViews(ruler);
      expect(prologue).toMatchObject({ kind: 'prologue', image: ruler.ui.prologue?.image });
      expect(era1).toMatchObject({ kind: 'era', eraId: 'era1', image: ruler.ui.eras?.[0].image });
      for (const view of [prologue, era1]) {
        let tree!: ReactTestRenderer;
        act(() => {
          tree = create(screen(ruler, view));
        });
        const image = 'image' in view ? view.image : '';
        expect(drawnImage(tree).source).toBe(own(ruler, image));
        expect(drawnImage(tree).cachePolicy).toBe(bundledCachePolicy);
      }
    },
  );

  it.each([
    ['julius-caesar', 'elizabeth-i'],
    ['charles-i', 'elizabeth-i'],
    ['elizabeth-i', 'julius-caesar'],
  ])('after a %s run, a new %s run opens with its own images', (firstId, nextId) => {
    const first = getRuler(firstId);
    const next = getRuler(nextId);
    let tree!: ReactTestRenderer;
    act(() => {
      tree = create(screen(first, openingViews(first)[0]));
    });
    for (const view of openingViews(next)) {
      act(() => {
        tree.update(screen(next, view));
      });
      const image = 'image' in view ? view.image : '';
      expect(drawnImage(tree).source).toBe(own(next, image));
    }
  });

  it("Elizabeth's prologue and era 1 card are her own P1 and ERA1 files", () => {
    const elizabeth = getRuler('elizabeth-i');
    const [prologue, era1] = openingViews(elizabeth);
    expect(getImage('elizabeth-i', 'image' in prologue ? prologue.image : '')).toBe(imageRegistries['elizabeth-i'].P1);
    expect(getImage('elizabeth-i', 'image' in era1 ? era1.image : '')).toBe(imageRegistries['elizabeth-i'].ERA1);
  });
});

describe('era card images', () => {
  test.each(rulers.map((r) => [r.id, r] as const))(
    "%s: every era card and era variant uses one of the ruler's own image ids",
    (_id, ruler) => {
      const others = rulers.filter((r) => r.id !== ruler.id).flatMap((r) => Object.values(imageRegistries[r.id] ?? {}));
      for (const era of ruler.ui.eras ?? []) {
        for (const id of [era.image, ...(era.variants ?? []).map((v) => v.image)]) {
          const source = getImage(ruler.id, id);
          // Registered for this ruler (or not drawn yet: the placeholder), never another ruler's file.
          expect(source).toBe(own(ruler, id));
          expect(others).not.toContain(source);
          if (ruler.id !== 'charles-i') expect(imageRegistries[ruler.id][id]).toBeDefined();
        }
      }
    },
  );
});

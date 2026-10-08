import { Image, Text, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { GameButton } from '../../src/ui/GameButton';
import { SkinPanel } from '../../src/ui/skin/SkinPanel';
import { SkinProvider } from '../../src/ui/skin/SkinProvider';
import { tudorSkin } from '../../src/ui/skin/tudor';
import type { Skin } from '../../src/ui/skin/types';

// A skin with different colours, fonts and images: the components must pick all of it up.
const testImages = Object.fromEntries(Object.keys(tudorSkin.images).map((name, i) => [name, 9000 + i]));
const testSkin: Skin = {
  ...tudorSkin,
  id: 'test',
  colors: {
    panelText: '#010203',
    panelCaption: '#040506',
    buttonText: '#0A0B0C',
    screenBackground: '#000000',
  },
  fonts: { caption: 'TestCaption', body: 'TestBody', button: 'TestButton' },
  images: testImages,
};

function flatStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatStyle));
  return style && typeof style === 'object' ? (style as Record<string, unknown>) : {};
}

/** Renders, then reports a size to every measuring view so the frames draw their slices. */
function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(element);
  });
  act(() => {
    for (const view of tree.root.findAll((n) => n.type === View && typeof n.props.onLayout === 'function')) {
      view.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 120 } } });
    }
  });
  return tree;
}

const imageSources = (tree: ReactTestRenderer) => tree.root.findAllByType(Image).map((i) => i.props.source);

describe('switching skins', () => {
  it('restyles the button text and frame from the skin', () => {
    const tree = render(
      <SkinProvider skin={testSkin}>
        <GameButton label="Underfund it; he pays the rest" onPress={() => {}} />
      </SkinProvider>,
    );
    const label = tree.root.findByType(Text);
    expect(flatStyle(label.props.style)).toMatchObject({ color: '#0A0B0C', fontFamily: 'TestButton' });
    expect(label.props.numberOfLines).toBeUndefined();
    const sources = imageSources(tree);
    expect(sources).toHaveLength(9);
    expect(sources).toEqual(expect.arrayContaining([testImages.button_c, testImages.button_tl]));
    for (const s of sources) expect(Object.values(testImages)).toContain(s);
  });

  it('draws the panel from the skin', () => {
    const tree = render(
      <SkinProvider skin={testSkin}>
        <SkinPanel>
          <Text>Body</Text>
        </SkinPanel>
      </SkinProvider>,
    );
    const sources = imageSources(tree);
    // fill + four edges + four corners + two ornaments
    expect(sources).toHaveLength(11);
    expect(sources[0]).toBe(testImages.panel_fill);
    for (const s of sources) expect(Object.values(testImages)).toContain(s);
  });

  it('uses the Tudor skin when no provider is given', () => {
    const tree = render(<GameButton label="Continue" onPress={() => {}} />);
    const label = tree.root.findByType(Text);
    expect(flatStyle(label.props.style)).toMatchObject({ color: tudorSkin.colors.buttonText });
  });

  it('exposes the label as the accessible name of a button', () => {
    const tree = render(<GameButton label="Fully supply powder and shot" onPress={() => {}} />);
    const button = tree.root.find((n) => n.props.accessibilityRole === 'button');
    expect(button.props.accessibilityLabel).toBe('Fully supply powder and shot');
  });
});

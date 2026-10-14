// Reanimated's and Worklets' own Jest mocks: the native worklets runtime is not available under Jest.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useFocusEffect: (cb: () => void) => require('react').useEffect(cb, [cb]),
  useLocalSearchParams: () => ({}),
}));

let mockData: { profile: unknown; view: unknown; update: jest.Mock } = { profile: null, view: null, update: jest.fn() };
jest.mock('@/ui/profile/useProfileData', () => ({ useProfileData: () => mockData }));

let mockTitleProfile: unknown = null;
jest.mock('@/ui/useRunSave', () => ({ useLatestSave: () => ({ ruler: null, discarded: false, loading: false }) }));
jest.mock('@/ui/useProfile', () => ({ useProfile: () => mockTitleProfile, useUnlockAll: () => [false, () => {}] }));
jest.mock('@/ui/profile/useAchievementCheck', () => ({ useAchievementCheck: () => ({ checked: true, newlyEarned: [] }) }));

import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ProfileScreen from '@/app/profile';
import TitleScreen from '@/app/index';
import { rulers } from '@/data/rulers';
import { achievementList } from '@/game/achievements';
import type { Profile } from '@/game/profile';
import { profileView } from '@/game/profileView';
import { endingText } from '@/game/text';
import { profileRulers } from '@/ui/profile/profileRulers';
import { allRulerFacts } from '@/ui/profile/rulerFacts';
import { SkinProvider } from '@/ui/skin/SkinProvider';
import { tudorSkin } from '@/ui/skin/tudor';
import { midGame } from '../game/profileFixtures';

const mockRouter = (jest.requireMock('expo-router') as { router: { push: jest.Mock; back: jest.Mock } }).router;

const metrics = { frame: { x: 0, y: 0, width: 375, height: 667 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

function render(element: React.ReactElement): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <SafeAreaProvider initialMetrics={metrics}>
        <SkinProvider skin={tudorSkin}>{element}</SkinProvider>
      </SafeAreaProvider>,
    );
  });
  return tree;
}

function showProfile(profile: Profile) {
  mockData = { profile, view: profileView(profile, profileRulers(profile, false)), update: jest.fn() };
  return render(<ProfileScreen />);
}

/** Every string the screen shows or reads aloud. */
function everything(tree: ReactTestRenderer): string {
  const out: string[] = [];
  const walk = (node: ReactTestInstance | string) => {
    if (typeof node === 'string') return void out.push(node);
    if (typeof node.props.accessibilityLabel === 'string') out.push(node.props.accessibilityLabel);
    node.children.forEach(walk);
  };
  walk(tree.root);
  return out.join('\n');
}

const pressables = (tree: ReactTestRenderer) =>
  tree.root.findAll((n) => typeof n.type !== 'string' && typeof n.props.onPress === 'function' && n.props.accessibilityRole !== undefined);

describe('the profile screen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows every section for a mid-game player', () => {
    const text = everything(showProfile(midGame));
    for (const part of ['Chronicler', 'Novice', 'Rarest achievement', 'Faithful Copy', 'Endings: 3 of 64 reached', 'Common endings: 2 of 28 reached', 'Elizabeth I', 'Julius Caesar', 'Charles I', 'Complete a reign as Julius Caesar to unlock', 'Complete a reign as Charles I to unlock', 'Cleopatra VII', 'Weekly history quiz: coming soon', 'Avatar']) {
      expect(text).toContain(part);
    }
  });

  it('never names an unreached ending, branch scene or unearned hidden achievement, even with every row open', () => {
    const tree = showProfile(midGame);
    // Open each rarity row in turn (one is open at a time), gathering everything shown.
    const shown = [everything(tree)];
    const rows = () => pressables(tree).filter((n) => n.props.accessibilityState?.expanded !== undefined);
    for (let i = 0; i < rows().length; i++) {
      act(() => rows()[i].props.onPress());
      shown.push(everything(tree));
    }
    const text = shown.join('\n');
    const record = midGame.rulers;
    for (const ruler of rulers) {
      const reached = record[ruler.rules.ruler]?.endings ?? {};
      for (const id of Object.keys(ruler.rules.endings)) {
        const title = endingText(ruler.text, id).title;
        if (reached[id]) expect(text).toContain(title);
        else expect(text).not.toContain(title);
      }
      for (const scene of ruler.rules.scenes.filter((s) => s.branch)) expect(text).not.toContain(scene.title);
    }
    for (const a of achievementList(allRulerFacts).filter((x) => x.hidden)) {
      expect(text).not.toContain(a.title);
      expect(text).not.toContain(a.description);
    }
    expect(text).toContain('???');
  });

  it('features an earned achievement from its detail view', () => {
    const tree = showProfile(midGame);
    const badge = pressables(tree).find((n) => String(n.props.accessibilityLabel).startsWith('In Their Footsteps: Elizabeth'))!;
    act(() => badge.props.onPress());
    const feature = tree.root.findAll((n) => n.props.label === 'Feature on profile' && typeof n.props.onPress === 'function')[0];
    act(() => feature.props.onPress());
    const change = mockData.update.mock.calls[0][0] as (p: Profile) => Profile;
    expect(change(midGame).identity.featuredAchievementId).toBe('elizabeth_history');
  });

  it('shows the empty featured state for a new player', () => {
    const { emptyProfile } = jest.requireActual('@/game/profile') as typeof import('@/game/profile');
    expect(everything(showProfile(emptyProfile))).toContain('Earn achievements to feature one here');
  });
});

describe('navigation', () => {
  beforeEach(() => jest.clearAllMocks());

  it("the title screen's Profile button and level plate (its medallion) both open the profile", () => {
    mockTitleProfile = midGame;
    const tree = render(<TitleScreen />);
    const button = tree.root.findAll((n) => n.props.label === 'Profile' && typeof n.props.onPress === 'function')[0];
    act(() => button.props.onPress());
    const plate = pressables(tree).find((n) => String(n.props.accessibilityLabel).endsWith('Open your profile'))!;
    act(() => plate.props.onPress());
    expect(mockRouter.push.mock.calls).toEqual([['/profile'], ['/profile']]);
  });

  it('back on the profile returns to the title screen', () => {
    const tree = showProfile(midGame);
    const back = tree.root.findAll((n) => n.props.label === 'Back' && typeof n.props.onPress === 'function')[0];
    act(() => back.props.onPress());
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});

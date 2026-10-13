import { router } from 'expo-router';
import { useState } from 'react';
import { setFeatured } from '@/game/achievements';
import { GameButton } from '@/ui/GameButton';
import {
  AchievementDialog,
  AchievementGrid,
  FeaturedBanner,
  NicknameDialog,
  ProfileHeader,
  QuizCard,
  RarityRows,
  RulerCards,
  SectionTitle,
  SummaryTiles,
} from '@/ui/profile/ProfileSections';
import { allRulerFacts } from '@/ui/profile/rulerFacts';
import { useProfileData } from '@/ui/profile/useProfileData';
import { ScreenScaffold } from '@/ui/screens/ScreenScaffold';
import { strings } from '@/ui/strings';

/**
 * Everything the player has achieved, on one scrolling screen. Works offline; nothing unreached is
 * ever named (the view hides it before it gets here).
 */
export default function ProfileScreen() {
  const { view, update } = useProfileData();
  const [editing, setEditing] = useState(false);
  const [openAchievement, setOpenAchievement] = useState<string | null>(null);
  const shown = view?.achievements.find((a) => a.id === openAchievement) ?? null;

  return (
    <ScreenScaffold
      title={strings.profileTitle}
      footer={<GameButton label={strings.back} onPress={() => router.back()} />}
    >
      {view && (
        <>
          <ProfileHeader view={view} onEditNickname={() => setEditing(true)} />
          <FeaturedBanner featured={view.featured} rulers={allRulerFacts} onPress={setOpenAchievement} />
          <SummaryTiles view={view} />
          <SectionTitle>{strings.sectionRarity}</SectionTitle>
          <RarityRows rows={view.rarity} />
          <SectionTitle>{strings.sectionRulers}</SectionTitle>
          <RulerCards rulers={view.rulers} />
          <SectionTitle>{strings.sectionAchievements}</SectionTitle>
          <AchievementGrid achievements={view.achievements} onPress={setOpenAchievement} />
          <QuizCard />
          <NicknameDialog
            key={editing ? 'open' : 'closed'}
            visible={editing}
            current={view.identity.nickname}
            onClose={() => setEditing(false)}
            onSave={(nickname) => {
              update((p) => ({ ...p, identity: { ...p.identity, nickname } }));
              setEditing(false);
            }}
          />
          <AchievementDialog
            achievement={shown}
            onClose={() => setOpenAchievement(null)}
            onFeature={(id) => update((p) => setFeatured(p, id))}
          />
        </>
      )}
    </ScreenScaffold>
  );
}

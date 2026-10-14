// A development screen: pick a look, head, top and bottoms (and eyes closed) and see the render, as
// the reference renderer draws it, to compare with docs/avatar/reference/. Reached from the dressing
// room with the hidden testing switch on.
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import cases from '../../docs/avatar/reference/cases.json';
import { avatarCatalogue as cat, type AvatarSlot, equip, type Outfit } from '@/game/avatar';
import { AvatarFigure } from '@/ui/avatar/AvatarFigure';
import { GameButton } from '@/ui/GameButton';
import { ScreenScaffold } from '@/ui/screens/ScreenScaffold';
import { useSkin } from '@/ui/skin/SkinProvider';
import { strings } from '@/ui/strings';
import { spacing, textSizes } from '@/ui/theme';

type Case = Outfit & { eyesClosed?: boolean };
const CASES = cases as Record<string, Case>;

export default function AvatarLabScreen() {
  const skin = useSkin();
  const { width } = useWindowDimensions();
  const [outfit, setOutfit] = useState<Outfit>({ base: 'b1' });
  const [eyesClosed, setEyesClosed] = useState(false);
  const [shown, setShown] = useState<string | null>(null);
  const figure = Math.min(320, width - 2 * spacing.lg);
  const pick = (slot: AvatarSlot, id: string | undefined) => {
    setShown(null);
    setOutfit((o) => equip(o, slot, id));
  };
  const label = { fontFamily: skin.fonts.caption, color: skin.screen.mutedText };
  const row = (title: string, options: [string, string | undefined][], selected: string | undefined, onPick: (id: string | undefined) => void) => (
    <View style={styles.row}>
      <Text style={[textSizes.caption, label]}>{title.toUpperCase()}</Text>
      <ScrollView horizontal contentContainerStyle={styles.chips}>
        {options.map(([name, id]) => (
          <Chip key={name} label={name} selected={selected === id} onPress={() => onPick(id)} />
        ))}
      </ScrollView>
    </View>
  );
  const itemsWith = (has: (id: string) => boolean): [string, string | undefined][] => [
    [strings.slotNone, undefined],
    ...Object.keys(cat.items).filter(has).map((id): [string, string] => [id, id]),
  ];

  return (
    <ScreenScaffold title={strings.avatarLab} footer={<GameButton label={strings.back} onPress={() => router.back()} />}>
      {/* The lab background the reference renders use. */}
      <View style={[styles.stage, { backgroundColor: cat.backgroundColour }]}>
        <AvatarFigure outfit={outfit} width={figure} variant="full" animate={false} eyesClosed={eyesClosed} />
      </View>
      {row(strings.referenceCase, Object.keys(CASES).map((k): [string, string] => [k.slice(0, 2), k]), shown ?? undefined, (k) => {
        if (k === undefined) return;
        const { eyesClosed: closed = false, ...o } = CASES[k];
        setOutfit(o);
        setEyesClosed(closed);
        setShown(k);
      })}
      {shown !== null && <Text style={[textSizes.muted, label]}>{shown}</Text>}
      {row(strings.look, Object.keys(cat.bases).map((b): [string, string] => [b, b]), outfit.base, (b) => b && setOutfit((o) => ({ ...o, base: b })))}
      {row(strings.slotHead, itemsWith((id) => cat.items[id].pieces.head !== undefined), outfit.head, (id) => pick('head', id))}
      {row(strings.slotTop, itemsWith((id) => cat.items[id].slots.includes('top') || cat.items[id].slot === 'full'), outfit.top, (id) => pick('top', id))}
      {row(strings.slotBottoms, itemsWith((id) => cat.items[id].slots.includes('bottoms')), outfit.bottoms, (id) => pick('bottoms', id))}
      {row(strings.eyesClosed, [['open', 'open'], ['closed', 'closed']], eyesClosed ? 'closed' : 'open', (v) => setEyesClosed(v === 'closed'))}
    </ScreenScaffold>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const skin = useSkin();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, { borderColor: selected ? skin.screen.highlight : skin.screen.mutedText, backgroundColor: selected ? skin.screen.highlightFill : 'transparent' }]}
    >
      <Text style={[textSizes.muted, { fontFamily: skin.fonts.body, color: skin.screen.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', borderRadius: 8, paddingVertical: spacing.sm },
  row: { gap: 4 },
  chips: { gap: spacing.xs, paddingRight: spacing.md },
  chip: { minHeight: 36, paddingHorizontal: spacing.sm, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

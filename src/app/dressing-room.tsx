import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getRuler } from '@/data/rulers';
import { avatarCatalogue as cat, type AvatarSlot, equip, type Outfit } from '@/game/avatar';
import type { Profile } from '@/game/profile';
import { buyItem, outfitItems, owns, priceOf, unlockText, wearOutfit } from '@/game/wardrobe';
import { setPlayerOutfit } from '@/ui/avatar/playerOutfit';
import { GameButton } from '@/ui/GameButton';
import { AvatarView } from '@/ui/profile/AvatarView';
import { Coin } from '@/ui/progression/ProgressionArt';
import { allRulerFacts } from '@/ui/profile/rulerFacts';
import { useProfileData } from '@/ui/profile/useProfileData';
import { ScreenScaffold } from '@/ui/screens/ScreenScaffold';
import { useSkin } from '@/ui/skin/SkinProvider';
import { format, formatNumber, strings } from '@/ui/strings';
import { spacing, textSizes } from '@/ui/theme';
import { useUnlockAll } from '@/ui/useProfile';

const SLOTS: { slot: AvatarSlot; label: string }[] = [
  { slot: 'head', label: strings.slotHead },
  { slot: 'top', label: strings.slotTop },
  { slot: 'bottoms', label: strings.slotBottoms },
];

/** Items that can be worn in a slot: heads by their head piece, tops by top (or full), bottoms. */
const itemsFor = (slot: AvatarSlot) =>
  Object.entries(cat.items).filter(([, item]) =>
    slot === 'head' ? item.pieces.head !== undefined : slot === 'top' ? item.slots.includes('top') || item.slot === 'full' : item.slots.includes('bottoms'),
  );

/**
 * Choose a look and try on any item for free; buy with gold, or see how an item unlocks, and wear
 * an outfit once everything in it is owned.
 */
export default function DressingRoomScreen() {
  const skin = useSkin();
  const { profile, update } = useProfileData();
  const [devPrices] = useUnlockAll();
  const [trial, setTrial] = useState<Outfit | null>(null);
  const [slot, setSlot] = useState<AvatarSlot>('top');
  if (!profile) return <ScreenScaffold title={strings.dressingRoom}>{null}</ScreenScaffold>;

  const outfit = trial ?? profile.identity.avatar;
  const worn = profile.identity.avatar;
  const wearable = outfitItems(outfit).every((id) => owns(profile, id));
  const same = JSON.stringify(outfit) === JSON.stringify(worn);
  const text = { fontFamily: skin.fonts.body, color: skin.screen.text };
  const muted = { fontFamily: skin.fonts.body, color: skin.screen.mutedText };
  const save = (change: (p: Profile) => Profile) => update(change);

  return (
    <ScreenScaffold
      title={strings.dressingRoom}
      footer={
        <>
          <GameButton
            label={same ? strings.wearing : strings.wearOutfit}
            disabled={same || !wearable}
            onPress={() => {
              save((p) => wearOutfit(p, outfit));
              setPlayerOutfit(outfit);
              setTrial(null);
            }}
          />
          {devPrices && <GameButton label={strings.avatarLab} onPress={() => router.push('/avatar-lab')} />}
          <GameButton label={strings.back} onPress={() => router.back()} />
        </>
      }
    >
      <View style={styles.stage}>
        <AvatarView size={150} variant="full" outfit={outfit} />
        <View style={styles.stageSide}>
          <View style={styles.gold} accessible accessibilityLabel={`${formatNumber(profile.progression.gold)} Gold`}>
            <Coin size={18} />
            <Text style={[textSizes.body, text]}>{formatNumber(profile.progression.gold)}</Text>
          </View>
          {!wearable && <Text style={[textSizes.muted, muted]}>{strings.ownEverything}</Text>}
        </View>
      </View>

      <Text style={[textSizes.caption, muted, styles.label]}>{strings.look.toUpperCase()}</Text>
      <View style={styles.chips}>
        {Object.entries(cat.bases).map(([id, base], i) => (
          <Chip
            key={id}
            label={String(i + 1)}
            a11y={format(strings.lookLabel, { n: i + 1, label: base.label })}
            selected={outfit.base === id}
            onPress={() => setTrial({ ...outfit, base: id })}
          />
        ))}
      </View>
      <Text style={[textSizes.muted, muted]}>{cat.bases[outfit.base]?.label}</Text>

      <View style={styles.chips}>
        {SLOTS.map((s) => (
          <Chip key={s.slot} label={s.label} selected={slot === s.slot} onPress={() => setSlot(s.slot)} />
        ))}
      </View>

      <ItemRow
        name={strings.slotNone}
        selected={outfit[slot] === undefined}
        onPress={() => setTrial(equip(outfit, slot, undefined))}
      />
      {itemsFor(slot).map(([id, item]) => {
        const isWorn = worn[slot] === id;
        let status: string;
        let buy: (() => void) | undefined;
        if (owns(profile, id)) status = isWorn ? strings.worn : strings.owned;
        else if (item.unlock.type === 'gold') {
          const price = priceOf(id, devPrices);
          if (price === null) status = strings.priceTBC;
          else if (profile.progression.gold < price) status = format(strings.needGold, { price, gold: formatNumber(profile.progression.gold) });
          else {
            status = format(strings.buyFor, { price });
            buy = () => save((p) => {
              const result = buyItem(p, id, new Date().toISOString(), devPrices);
              return result.ok ? result.profile : p;
            });
          }
        } else {
          const rule = unlockText(id, profile, allRulerFacts);
          status = rule === null ? strings.unlockedByAchievement : format(strings.unlockRule, { rule });
        }
        return (
          <ItemRow
            key={id}
            name={item.name}
            ruler={item.rulerSet ? getRuler(item.rulerSet).text.ruler.name : undefined}
            note={item.note}
            status={status}
            selected={outfit[slot] === id}
            onPress={() => setTrial(equip(outfit, slot, id))}
            onBuy={buy}
          />
        );
      })}
    </ScreenScaffold>
  );
}

function Chip({ label, a11y, selected, onPress }: { label: string; a11y?: string; selected: boolean; onPress: () => void }) {
  const skin = useSkin();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={a11y ?? label}
      style={[
        styles.chip,
        { borderColor: selected ? skin.screen.highlight : skin.screen.mutedText, backgroundColor: selected ? skin.screen.highlightFill : 'transparent' },
      ]}
    >
      <Text style={[textSizes.body, { fontFamily: skin.fonts.caption, color: skin.screen.text }]}>{label}</Text>
    </Pressable>
  );
}

function ItemRow({
  name,
  ruler,
  note,
  status,
  selected,
  onPress,
  onBuy,
}: {
  name: string;
  ruler?: string;
  note?: string;
  status?: string;
  selected: boolean;
  onPress: () => void;
  onBuy?: () => void;
}) {
  const skin = useSkin();
  const text = { fontFamily: skin.fonts.body, color: skin.screen.text };
  const muted = { fontFamily: skin.fonts.body, color: skin.screen.mutedText };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={[name, ruler, status, note].filter(Boolean).join('. ')}
      style={[styles.item, { backgroundColor: skin.progression.colors.plate, borderColor: selected ? skin.screen.highlight : 'transparent' }]}
    >
      <View style={styles.itemHead}>
        <Text style={[textSizes.body, text, styles.flex]}>{name}</Text>
        {ruler !== undefined && <Text style={[textSizes.caption, muted]}>{ruler.toUpperCase()}</Text>}
      </View>
      {note !== undefined && <Text style={[textSizes.muted, muted]}>{note}</Text>}
      {status !== undefined && (
        <View style={styles.itemFoot}>
          <Text style={[textSizes.muted, text, styles.flex]}>{status}</Text>
          {onBuy && <GameButton label={strings.buy} onPress={onBuy} minHeight={36} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, flexShrink: 1 },
  stage: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end', paddingHorizontal: spacing.xs },
  stageSide: { flex: 1, gap: spacing.sm },
  gold: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { minWidth: 44, minHeight: 36, paddingHorizontal: spacing.sm, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  item: { borderRadius: 10, borderWidth: 1, padding: spacing.sm, gap: 4 },
  itemHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  itemFoot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});

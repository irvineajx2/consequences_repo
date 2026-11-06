// The phase panel, in the lower part of the map screen: the cohort and cavalry sliders (in their
// steps, always totalling 100%), the commander's position (set by tapping the map), the phase's
// moves with their icons and descriptions, and Commit. Tabs keep it to one screen on a small phone.
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { type BattleData, menPerBin, type Orders, percent, setBin, stepCount } from '../../battle';
import type { BattleText } from '../../data/battles';
import { GameButton } from '../GameButton';
import { bundledCachePolicy } from '../RulerImage';
import { SkinPanel } from '../skin/SkinPanel';
import { useSkin } from '../skin/SkinProvider';
import { useSkinTextStyles } from '../skin/textStyles';
import { format, formatNumber, strings } from '../strings';
import { battleIcons } from './battleArt';
import { StepSlider } from './StepSlider';

type Tab = 'cohorts' | 'cavalry' | 'move';

interface Props {
  readonly data: BattleData;
  readonly text: BattleText;
  readonly phase: number;
  readonly orders: Orders;
  readonly onChange: (orders: Orders) => void;
  readonly onCommit: () => void;
  /** Current pool sizes, to show the men each bin holds. */
  readonly cohortsSize: number;
  readonly cavalrySize: number;
  /** Height of one slider or move row. */
  readonly rowHeight: number;
  /** Fixed height of the tab's content, so the panel never jumps between tabs. */
  readonly contentHeight: number;
  readonly buttonHeight?: number;
}

export function PhasePanel(props: Props) {
  const { data, text, phase, orders, onChange, onCommit, rowHeight, contentHeight, buttonHeight } = props;
  const skin = useSkin();
  const type = useSkinTextStyles();
  const [tab, setTab] = useState<Tab>('cohorts');
  const binName = (bin: string) => text.sectors[bin]?.name ?? text.pools[bin] ?? bin;
  const tabs: [Tab, string][] = [
    ['cohorts', text.pools.cohorts],
    ['cavalry', text.pools.cavalry],
    ['move', strings.battles.move],
  ];

  const sliders = (pool: 'cohorts' | 'cavalry', size: number) => {
    const p = data.pools[pool];
    const steps = orders[pool];
    const men = menPerBin(p, size, steps);
    return p.bins.map((bin, i) => {
      const reserve = i === p.bins.length - 1;
      const share = format(strings.battles.binShare, { percent: percent(p, steps[i]) });
      return (
        <StepSlider
          key={bin}
          label={reserve ? format(strings.battles.reserveLabel, { reserve: binName(bin) }) : binName(bin)}
          value={steps[i]}
          steps={stepCount(p)}
          valueText={share}
          height={rowHeight}
          accessibilityLabel={`${binName(bin)}, ${formatNumber(men[bin])} ${text.pools[pool].toLowerCase()}`}
          onChange={reserve ? undefined : (v) => onChange({ ...orders, [pool]: setBin(p, steps, i, v) })}
        />
      );
    });
  };

  return (
    <SkinPanel>
      <View style={styles.tabs} accessibilityRole="tablist">
        {tabs.map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setTab(id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === id }}
            style={[styles.tab, { borderColor: skin.colors.panelCaption }, tab === id && { backgroundColor: skin.colors.panelCaption }]}
          >
            <Text style={[type.caption, styles.tabLabel, tab === id && { color: '#F4E9D2' }]} numberOfLines={1}>
              {label.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ height: contentHeight }}>
        {tab === 'cohorts' && sliders('cohorts', props.cohortsSize)}
        {tab === 'cavalry' && sliders('cavalry', props.cavalrySize)}
        {tab === 'move' && (
          <ScrollView>
            {(data.phases[String(phase)]?.moves ?? []).map((m) => {
              const chosen = orders.move === m;
              const move = text.moves[m];
              return (
                <Pressable
                  key={m}
                  onPress={() => onChange({ ...orders, move: m })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: chosen }}
                  accessibilityLabel={format(strings.battles.moveLabel, { label: move?.label ?? m, desc: move?.desc ?? '' })}
                  style={[
                    styles.move,
                    { minHeight: rowHeight + 8, borderColor: chosen ? skin.colors.panelCaption : 'transparent' },
                    chosen && styles.moveChosen,
                  ]}
                >
                  {battleIcons[m] ? (
                    <Image source={battleIcons[m]} style={styles.moveIcon} cachePolicy={bundledCachePolicy} accessible={false} />
                  ) : (
                    <View style={styles.moveIcon} />
                  )}
                  <View style={styles.moveText}>
                    <Text style={[type.body, styles.moveLabel]}>{move?.label ?? m}</Text>
                    <Text style={[type.muted, styles.moveDesc]}>{move?.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
      <Text style={[type.muted, styles.commander]} accessibilityHint={strings.battles.commanderHint}>
        {format(strings.battles.commanderAt, { place: text.sectors[orders.commander]?.name ?? orders.commander })}
        {' · '}
        {strings.battles.commanderTap}
      </Text>
      <GameButton
        label={`${strings.battles.commit}: ${text.moves[orders.move]?.label ?? orders.move}`}
        onPress={onCommit}
        minHeight={buttonHeight}
      />
    </SkinPanel>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  tab: { flex: 1, borderWidth: 1, borderRadius: 4, paddingVertical: 6, alignItems: 'center' },
  tabLabel: { fontSize: 11, lineHeight: 14 },
  move: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, marginBottom: 3 },
  moveChosen: { backgroundColor: 'rgba(122, 31, 31, 0.08)' },
  moveIcon: { width: 34, height: 35 },
  moveText: { flex: 1 },
  moveLabel: { fontSize: 14, lineHeight: 18 },
  moveDesc: { fontSize: 12, lineHeight: 15 },
  commander: { fontSize: 12, lineHeight: 15, marginTop: 4 },
});

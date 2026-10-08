// Sizing for a choice scene's panel. Pure TypeScript so it can be unit-tested.

export interface DecidePanelOptions {
  /** Safe-area inset below the panel, in points. */
  readonly bottomInset?: number;
  /** Gap between the panel and the safe area. */
  readonly outerGap?: number;
  /** The panel's vertical content padding (each side). */
  readonly panelPadding?: number;
  /** Preferred option button height. */
  readonly buttonHeight?: number;
  /** Buttons are never shorter than this: the minimum comfortable tap target. */
  readonly minButtonHeight?: number;
  /** How much to shorten buttons per step while looking for a fit. */
  readonly buttonStep?: number;
  /** Space above each button. */
  readonly buttonGap?: number;
  readonly narrationLineHeight?: number;
  /** Narration lines that must stay visible above the buttons. */
  readonly minNarrationLines?: number;
  /** Share of the screen the panel may cover in the read phase (and normally in decide). */
  readonly readShare?: number;
  /** Share the panel may grow to in the decide phase when nothing else fits. */
  readonly maxDecideShare?: number;
}

export interface DecidePanelLayout {
  /** Parchment height in the read phase; never more than `readShare` of the screen. */
  readonly readPanelHeight: number;
  /** Parchment height in the decide phase; equals the read height unless the panel had to grow. */
  readonly decidePanelHeight: number;
  /** Height of each option button. */
  readonly buttonHeight: number;
  /** Space left for the narration above the buttons in the decide phase. */
  readonly narrationHeight: number;
  /** Whether at least `minNarrationLines` of narration fit. */
  readonly fits: boolean;
}

/**
 * Picks the decide-phase sizing: keep the panel at `readShare` of the screen if the buttons plus
 * two lines of narration fit, shortening buttons step by step down to `minButtonHeight`; if they
 * still don't fit, let the decide phase grow, up to `maxDecideShare`. Assumes one-line labels; a
 * wrapped label takes its space from the narration, never from the buttons.
 */
export function decidePanelLayout(
  screenHeight: number,
  optionCount: number,
  {
    bottomInset = 0,
    outerGap = 8,
    panelPadding = 22,
    buttonHeight = 56,
    minButtonHeight = 44,
    buttonStep = 2,
    buttonGap = 8,
    narrationLineHeight = 21,
    minNarrationLines = 2,
    readShare = 0.35,
    maxDecideShare = 0.4,
  }: DecidePanelOptions = {},
): DecidePanelLayout {
  const panelFor = (share: number) => Math.floor(screenHeight * share - bottomInset - outerGap);
  const contentOf = (panel: number) => panel - 2 * panelPadding;
  const buttonsOf = (height: number) => optionCount * (height + buttonGap);
  const minNarration = minNarrationLines * narrationLineHeight;

  const readPanel = panelFor(readShare);
  const result = (panel: number, button: number): DecidePanelLayout => {
    const narrationHeight = Math.max(0, contentOf(panel) - buttonsOf(button));
    return {
      readPanelHeight: Math.min(readPanel, panel),
      decidePanelHeight: panel,
      buttonHeight: button,
      narrationHeight,
      fits: narrationHeight >= minNarration,
    };
  };

  // 1. Shorten buttons, within the read-phase share.
  const floor = Math.min(buttonHeight, minButtonHeight);
  for (let button = buttonHeight; button >= floor; button -= buttonStep) {
    if (buttonsOf(button) + minNarration <= contentOf(readPanel)) return result(readPanel, button);
  }
  if (buttonsOf(floor) + minNarration <= contentOf(readPanel)) return result(readPanel, floor);

  // 2. Grow the decide phase just enough, up to its cap.
  const needed = Math.ceil(buttonsOf(floor) + minNarration + 2 * panelPadding);
  return result(Math.min(needed, panelFor(maxDecideShare)), floor);
}

// The registered rulers as the profile sees them. A new ruler appears here with no profile changes.
import { getRuler, type Ruler, rulerUnlocked, rulers as registered } from '../../data/rulers';
import type { Profile } from '../../game/profile';
import type { ProfileRuler } from '../../game/profileView';
import { endingText } from '../../game/text';
import { allRulerFacts } from './rulerFacts';

export function profileRulers(profile: Profile, unlockAll: boolean, rulers: readonly Ruler[] = registered): ProfileRuler[] {
  return rulers.map((ruler, i) => ({
    facts: rulers === registered ? allRulerFacts[i] : allRulerFacts.find((f) => f.id === ruler.id)!,
    name: ruler.text.ruler.name,
    ...(ruler.ui.rulerCard ? { cardImage: ruler.ui.rulerCard.image } : {}),
    unlocked: rulerUnlocked(ruler, profile, unlockAll),
    ...(ruler.unlockedBy !== undefined ? { unlockedByName: getRuler(ruler.unlockedBy).text.ruler.name } : {}),
    endingTitle: (id: string) => endingText(ruler.text, id).title,
  }));
}

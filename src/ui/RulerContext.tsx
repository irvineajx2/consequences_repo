import { createContext, type ReactNode, useContext } from 'react';
import { type Ruler, rulers } from '../data/rulers';

const RulerContext = createContext<Ruler>(rulers[0]);

/** The ruler being played or shown: its rules, text, presentation and images. */
export function RulerProvider({ ruler, children }: { ruler: Ruler; children: ReactNode }) {
  return <RulerContext.Provider value={ruler}>{children}</RulerContext.Provider>;
}

export function useRuler(): Ruler {
  return useContext(RulerContext);
}

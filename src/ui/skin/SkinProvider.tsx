import { createContext, type ReactNode, useContext } from 'react';
import { tudorSkin } from './tudor';
import type { Skin } from './types';

const SkinContext = createContext<Skin>(tudorSkin);

/** Supplies the skin to everything below it. Without a provider, the Tudor skin is used. */
export function SkinProvider({ skin, children }: { skin: Skin; children: ReactNode }) {
  return <SkinContext.Provider value={skin}>{children}</SkinContext.Provider>;
}

export function useSkin(): Skin {
  return useContext(SkinContext);
}

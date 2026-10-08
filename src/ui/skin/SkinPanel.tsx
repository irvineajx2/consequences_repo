import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { NineSlice } from './NineSlice';
import { useSkin } from './SkinProvider';

/** The skin's illustrated panel around its children. */
export function SkinPanel({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { panel, images } = useSkin();
  return (
    <NineSlice
      frame={panel.frame}
      scale={panel.scale}
      images={images}
      fill={panel.fill}
      ornaments={panel.ornaments}
      contentPadding={panel.contentPadding}
      style={style}
    >
      {children}
    </NineSlice>
  );
}

import { Image, type ImageSourcePropType } from 'react-native';

/** The natural size of a bundled image, in source pixels. */
export function assetSize(source: ImageSourcePropType): { width: number; height: number } | null {
  const resolved = Image.resolveAssetSource(source);
  return resolved ? { width: resolved.width, height: resolved.height } : null;
}

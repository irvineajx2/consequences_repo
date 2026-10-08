import type { ImageSourcePropType } from 'react-native';
import { getAssetByID } from 'react-native-web/dist/modules/AssetRegistry';

/**
 * The natural size of a bundled image, in source pixels. React Native Web has no
 * `Image.resolveAssetSource`, so read the registry it uses to size images itself.
 */
export function assetSize(source: ImageSourcePropType): { width: number; height: number } | null {
  if (typeof source === 'number') {
    const asset = getAssetByID(source);
    return asset ? { width: asset.width, height: asset.height } : null;
  }
  if (source && !Array.isArray(source) && typeof source === 'object' && 'width' in source) {
    const { width, height } = source;
    return width !== undefined && height !== undefined ? { width, height } : null;
  }
  return null;
}

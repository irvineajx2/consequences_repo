import type { ImageSourcePropType } from 'react-native';
import { imageRegistries } from './imageRegistry';

/** Shown for images not drawn yet, and for locked endings. */
export const placeholderImage: ImageSourcePropType = require('../../assets/placeholder.png');

/** A ruler's image by id, or the placeholder when it has not been drawn yet. */
export function getImage(rulerId: string, id: string): ImageSourcePropType {
  return imageRegistries[rulerId]?.[id] ?? placeholderImage;
}

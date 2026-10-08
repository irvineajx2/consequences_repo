import type { ImageSourcePropType } from 'react-native';
import { imageRegistry } from './imageRegistry';

/** Shown for images not drawn yet, and for locked endings. */
export const placeholderImage: ImageSourcePropType = require('../../assets/placeholder.png');

/** The image for an id from the rules, or the placeholder when it has not been drawn yet. */
export function getImage(id: string): ImageSourcePropType {
  return imageRegistry[id] ?? placeholderImage;
}

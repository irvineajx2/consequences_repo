// The game's branding. Not part of the skin: skins are swappable cosmetics, the wordmark is not.
import type { ImageSourcePropType } from 'react-native';
import { assetSize } from './skin/assetSize';

/** The "Consequences" wordmark, with the sword hanging below the letters. @2x/@3x picked per screen. */
export const wordmark: ImageSourcePropType = require('../../assets/ui/branding/wordmark.png');

/** The title screen's backdrop: a throne room, dark at the top for the wordmark. */
export const titleBackground: ImageSourcePropType = require('../../assets/ui/title.jpg');

/** Width / height of the wordmark, read from the image itself. */
export function wordmarkAspectRatio(): number {
  const size = assetSize(wordmark);
  return size && size.height > 0 ? size.width / size.height : 340 / 125;
}

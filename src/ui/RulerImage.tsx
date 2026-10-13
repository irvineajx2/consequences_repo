// Every ruler image (scenes, prologue, era cards, beats, endings, ruler cards, title backdrop) is drawn
// through this component, from an explicit ruler id and image id.
import { Image, type ImageProps } from 'expo-image';
import { getImage, placeholderImage } from './images';

/**
 * Bundled images are cached in memory only, never on disk. On Android a bundled image is loaded by
 * its numeric resource id, and those ids are reassigned (alphabetically) whenever images are added.
 * A disk cache keyed by id survives app updates, so after an update an id could return the picture
 * that had that id in an earlier build (Elizabeth's prologue showed the Pyrrhic Victory ending).
 * The images are local, so the disk cache gains nothing.
 */
export const bundledCachePolicy = 'memory' as const;

interface Props extends Omit<ImageProps, 'source' | 'cachePolicy'> {
  readonly rulerId: string;
  /** The image id; null shows the placeholder (e.g. a locked ending). */
  readonly imageId: string | null;
}

export function RulerImage({ rulerId, imageId, ...props }: Props) {
  return (
    <Image
      {...props}
      source={imageId === null ? placeholderImage : getImage(rulerId, imageId)}
      cachePolicy={bundledCachePolicy}
    />
  );
}

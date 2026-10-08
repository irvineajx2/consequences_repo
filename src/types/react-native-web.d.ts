// The one react-native-web internal we use (see src/ui/skin/assetSize.web.ts).
declare module 'react-native-web/dist/modules/AssetRegistry' {
  export function getAssetByID(id: number): { width: number; height: number } | undefined;
}

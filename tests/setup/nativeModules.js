// Native modules for component tests.
//
// Device storage: AsyncStorage's own in-memory mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Skia: component tests don't draw: the Skia package root is a light stand-in (a Canvas is a View, and
// loading art fails, so the avatar shows its stand-in). The avatar checker uses Skia for real
// through CanvasKit and its deep imports, which this leaves alone.
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Nothing = () => null;
  return {
    Canvas: ({ children, style }) => React.createElement(View, { style }, children),
    Group: ({ children }) => children ?? null,
    Vertices: Nothing,
    ImageShader: Nothing,
    Image: Nothing,
    Oval: Nothing,
    Blur: Nothing,
    vec: (x, y) => ({ x, y }),
    FilterMode: { Nearest: 0, Linear: 1 },
    MipmapMode: { None: 0, Nearest: 1, Linear: 2 },
    makeImageFromView: () => Promise.resolve(null),
    Skia: { Data: { fromURI: () => Promise.reject(new Error('Skia does not draw in tests')) } },
  };
});

// Navigation: components rendered on their own (outside a navigator) count as on a focused screen.
jest.mock('expo-router', () => ({ ...jest.requireActual('expo-router'), useIsFocused: () => true }));

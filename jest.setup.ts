import 'react-native-gesture-handler/jestSetup';

import type { ReactNode } from 'react';

// React Native Testing Library expects React 19's act environment to be explicit.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/data/storage', () => ({
  loadPersistedState: jest.fn().mockResolvedValue(null),
  savePersistedState: jest.fn().mockResolvedValue(undefined),
  clearPersistedState: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-symbols', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SymbolView: ({ fallback }: { fallback?: ReactNode }) =>
      fallback ?? React.createElement(Text, null, 'icon'),
  };
});

/**
 * @format
 */

import React from 'react';
import 'react-native-gesture-handler/jestSetup';
import ReactTestRenderer from 'react-test-renderer';
import axios from 'axios';
import App from '../App';

// App smoke test with mocked navigation and API calls.

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
}));
jest.mock('axios');
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Ensures the root app renders with mocked data.
test('renders correctly', async () => {
  mockedAxios.get.mockImplementation((url) => {
    if (String(url).includes('/api/products')) {
      return Promise.resolve({
        data: [
          {
            id: 'p1',
            name: 'Demo Phone',
            basePrice: 699,
            effectivePrice: 649,
            availableStock: 12,
            category: 'Mobile Phones',
            imageUrl: 'https://example.com/phone.png',
          },
        ],
      });
    }
    if (String(url).includes('/api/categories')) {
      return Promise.resolve({ data: ['Mobile Phones', 'Laptops'] });
    }
    if (String(url).includes('/api/promotions/active')) {
      return Promise.resolve({
        data: [
          {
            id: 'promo-1',
            campaignName: 'Launch Deal',
            promoCode: 'LAUNCH10',
            discountPercentage: 10,
          },
        ],
      });
    }
    return Promise.resolve({ data: [] });
  });

  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
    await Promise.resolve();
  });
});

// Mobile app entry: providers and navigation setup.
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import RootNavigator from './src/navigation/RootNavigator';
import { FEATURE_FLAGS } from './src/config/featureFlags';

enableScreens();

// Deep link configuration for storefront, checkout, orders, and admin routes.
const linking = {
	prefixes: ['ecomoptimizer://', 'https://ecomoptimizer.app'],
	config: {
		screens: {
			Storefront: {
				screens: {
					ProductFeed: '',
					...(FEATURE_FLAGS.enableProductDeepLinks
						? { ProductDetail: 'products/:productId' }
						: {}),
				},
			},
			Cart: {
				screens: {
					CartHome: 'cart',
					CheckoutDetails: 'checkout/details',
					CheckoutPayment: 'checkout/payment',
					CheckoutSuccess: 'checkout/success',
				},
			},
			Orders: {
				screens: {
					OrdersHome: 'orders',
				},
			},
			Profile: 'profile',
			Admin: {
				screens: {
					AdminHome: 'admin',
				},
			},
		},
	},
};

// Root app component with safe-area and navigation containers.
export default function App() {
    return (
        <SafeAreaProvider>
            <NavigationContainer linking={FEATURE_FLAGS.enableProductDeepLinks ? linking : undefined}>
                <RootNavigator />
            </NavigationContainer>
        </SafeAreaProvider>
    );
}

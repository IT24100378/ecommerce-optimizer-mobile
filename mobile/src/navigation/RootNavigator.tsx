import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProductFeedScreen from '../screens/ProductFeedScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutDetailsScreen from '../screens/CheckoutDetailsScreen';
import CheckoutPaymentScreen from '../screens/CheckoutPaymentScreen';
import CheckoutSuccessScreen from '../screens/CheckoutSuccessScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminProductDashboardScreen from '../screens/AdminProductDashboardScreen';
import AdminCategoriesScreen from '../screens/AdminCategoriesScreen';
import AdminOrdersScreen from '../screens/AdminOrdersScreen';
import AdminInventoryScreen from '../screens/AdminInventoryScreen';
import AdminPromotionsScreen from '../screens/AdminPromotionsScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminForecastScreen from '../screens/AdminForecastScreen';
import AdminReviewsScreen from '../screens/AdminReviewsScreen';
import { useStorefrontStore } from '../storefront/store';

const Tab = createBottomTabNavigator();
const StoreStack = createNativeStackNavigator();
const CartStack = createNativeStackNavigator();
const OrdersStack = createNativeStackNavigator();
const AdminStack = createNativeStackNavigator();

function StoreStackScreen() {
	return (
		<StoreStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
			<StoreStack.Screen name="ProductFeed" component={ProductFeedScreen} />
			<StoreStack.Screen name="ProductDetail" component={ProductDetailScreen} />
		</StoreStack.Navigator>
	);
}

function CartStackScreen() {
	return (
		<CartStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
			<CartStack.Screen name="CartHome" component={CartScreen} />
			<CartStack.Screen name="CheckoutDetails" component={CheckoutDetailsScreen} />
			<CartStack.Screen name="CheckoutPayment" component={CheckoutPaymentScreen} />
			<CartStack.Screen name="CheckoutSuccess" component={CheckoutSuccessScreen} />
		</CartStack.Navigator>
	);
}

function OrdersStackScreen() {
	return (
		<OrdersStack.Navigator screenOptions={{ headerShown: false }}>
			<OrdersStack.Screen name="OrdersHome" component={OrdersScreen} />
		</OrdersStack.Navigator>
	);
}

function AdminStackScreen() {
	return (
		<AdminStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
			<AdminStack.Screen name="AdminHome" component={AdminDashboardScreen} />
			<AdminStack.Screen name="AdminProducts" component={AdminProductDashboardScreen} />
			<AdminStack.Screen name="AdminCategories" component={AdminCategoriesScreen} />
			<AdminStack.Screen name="AdminOrders" component={AdminOrdersScreen} />
			<AdminStack.Screen name="AdminInventory" component={AdminInventoryScreen} />
			<AdminStack.Screen name="AdminPromotions" component={AdminPromotionsScreen} />
			<AdminStack.Screen name="AdminUsers" component={AdminUsersScreen} />
			<AdminStack.Screen name="AdminForecast" component={AdminForecastScreen} />
			<AdminStack.Screen name="AdminReviews" component={AdminReviewsScreen} />
		</AdminStack.Navigator>
	);
}

export default function RootNavigator() {
	const isAdmin = useStorefrontStore((state) => state.isAdmin);

	return (
<Tab.Navigator
  screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: '#2563eb',
    tabBarInactiveTintColor: '#94a3b8',
    tabBarStyle: { backgroundColor: '#0b0f1a', borderTopColor: '#1f2937' },
  }}
>
  <Tab.Screen name="Storefront" component={StoreStackScreen} />
  <Tab.Screen name="Cart" component={CartStackScreen} />
  {isAdmin ? (
    <Tab.Screen name="Admin" component={AdminStackScreen} />
  ) : (
    <Tab.Screen name="Orders" component={OrdersStackScreen} />
  )}
  <Tab.Screen name="Profile" component={ProfileScreen} />
</Tab.Navigator>
	);
}


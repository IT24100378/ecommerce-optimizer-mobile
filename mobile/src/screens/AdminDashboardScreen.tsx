import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_BASE_URL, useStorefrontStore } from '../storefront/store';

export default function AdminDashboardScreen() {
	const navigation = useNavigation<any>();
	const token = useStorefrontStore((state) => state.user?.token);
	const [stats, setStats] = useState<Record<string, number>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const modules = [
		{ key: 'products', label: 'Products', route: 'AdminProducts' },
		{ key: 'categories', label: 'Categories', route: 'AdminCategories' },
		{ key: 'orders', label: 'Orders', route: 'AdminOrders' },
		{ key: 'inventory', label: 'Inventory', route: 'AdminInventory' },
		{ key: 'promotions', label: 'Promotions', route: 'AdminPromotions' },
		{ key: 'users', label: 'Users', route: 'AdminUsers' },
		{ key: 'forecasts', label: 'Forecasts', route: 'AdminForecast' },
		{ key: 'reviews', label: 'Reviews', route: 'AdminReviews' },
	];

	const fetchStats = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		setError('');
		try {
			const headers = { Authorization: `Bearer ${token}` };
			const results = await Promise.allSettled([
				axios.get(`${API_BASE_URL}/api/products`),
				axios.get(`${API_BASE_URL}/api/categories`),
				axios.get(`${API_BASE_URL}/api/orders`, { headers }),
				axios.get(`${API_BASE_URL}/api/inventory`, { headers }),
				axios.get(`${API_BASE_URL}/api/promotions`, { headers }),
				axios.get(`${API_BASE_URL}/api/users`, { headers }),
				axios.get(`${API_BASE_URL}/api/forecasts`, { headers }),
				axios.get(`${API_BASE_URL}/api/reviews?adminView=true`, { headers }),
			]);
			const values = results.map((result) => (result.status === 'fulfilled' ? result.value : null));
			const failedCount = results.filter((result) => result.status === 'rejected').length;
			setStats({
				products: Array.isArray(values[0]?.data) ? values[0].data.length : 0,
				categories: Array.isArray(values[1]?.data) ? values[1].data.length : 0,
				orders: Array.isArray(values[2]?.data) ? values[2].data.length : 0,
				inventory: Array.isArray(values[3]?.data) ? values[3].data.length : 0,
				promotions: Array.isArray(values[4]?.data) ? values[4].data.length : 0,
				users: Array.isArray(values[5]?.data) ? values[5].data.length : 0,
				forecasts: Array.isArray(values[6]?.data) ? values[6].data.length : 0,
				reviews: Array.isArray(values[7]?.data) ? values[7].data.length : 0,
			});
			if (failedCount > 0) {
				setError(`${failedCount} module(s) failed to load. You can still use available modules.`);
			}
		} catch (err: any) {
			setError(err?.response?.data?.error || err?.message || 'Failed to load dashboard data.');
		} finally {
			setLoading(false);
		}
	}, [token]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.headerRow}>
					<View>
						<Text style={styles.title}>Admin Dashboard</Text>
						<Text style={styles.subtitle}>Manage all storefront modules from here.</Text>
					</View>
					<Pressable style={styles.refreshBtn} onPress={fetchStats}>
						<Text style={styles.refreshText}>Refresh</Text>
					</Pressable>
				</View>
				{loading ? <ActivityIndicator color="#2563eb" style={styles.loader} /> : null}
				{error ? <Text style={styles.errorText}>{error}</Text> : null}
				{modules.map((module) => (
					<Pressable
						key={module.route}
						onPress={() => navigation.navigate(module.route)}
						style={styles.card}
					>
						<Text style={styles.cardText}>{module.label}</Text>
						<Text style={styles.cardValue}>{stats[module.key] ?? 0}</Text>
					</Pressable>
				))}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#0b0f1a',
	},
	content: {
		padding: 24,
	},
	headerRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
	},
	refreshBtn: {
		backgroundColor: '#1f2937',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
	},
	refreshText: {
		color: '#f8fafc',
		fontSize: 12,
		fontWeight: '600',
	},
	loader: {
		marginTop: 12,
		marginBottom: 8,
	},
	errorText: {
		color: '#f87171',
		fontSize: 12,
		marginBottom: 10,
	},
	title: {
		color: '#f8fafc',
		fontSize: 24,
		fontWeight: '700',
		marginBottom: 6,
	},
	subtitle: {
		color: '#94a3b8',
		fontSize: 13,
		marginBottom: 18,
	},
	card: {
		backgroundColor: '#111827',
		borderWidth: 1,
		borderColor: '#1f2937',
		borderRadius: 12,
		paddingVertical: 14,
		paddingHorizontal: 16,
		marginBottom: 10,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	cardText: {
		color: '#f8fafc',
		fontWeight: '600',
		fontSize: 15,
	},
	cardValue: {
		color: '#22d3ee',
		fontWeight: '700',
		fontSize: 15,
	},
});


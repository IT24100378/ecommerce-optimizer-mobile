import React, { useEffect } from 'react';
import {
	ActivityIndicator,
	FlatList,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Order, useStorefrontStore } from '../storefront/store';

function formatPrice(value: number) {
	if (!Number.isFinite(value)) return '$0.00';
	return `$${value.toFixed(2)}`;
}

export default function OrdersScreen() {
	const { orders, ordersLoading, ordersError, fetchOrders } = useStorefrontStore();

	useEffect(() => {
		fetchOrders();
	}, [fetchOrders]);

	const renderItem = ({ item }: { item: Order }) => (
		<View style={styles.orderCard}>
			<View style={styles.orderHeader}>
				<Text style={styles.orderTitle}>Order #{item.id}</Text>
				<Text style={styles.orderStatus}>{item.status || 'PENDING'}</Text>
			</View>
			<Text style={styles.orderMeta}>{item.orderDate ? new Date(item.orderDate).toLocaleString() : 'Processing'}</Text>
			<Text style={styles.orderTotal}>
				{formatPrice(Number(item.discountedTotal ?? item.totalAmount ?? 0))}
			</Text>
			{item.items?.length ? (
				<View style={styles.orderItems}>
					{item.items.slice(0, 3).map((orderItem) => (
						<Text key={orderItem.id ?? orderItem.productId} style={styles.orderItemText}>
							{orderItem.product?.name || `Product ${orderItem.productId}`} × {orderItem.quantity}
						</Text>
					))}
					{item.items.length > 3 && (
						<Text style={styles.orderItemText}>+{item.items.length - 3} more</Text>
					)}
				</View>
			) : null}
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Orders</Text>
				<Text style={styles.subtitle}>Track your purchase history</Text>
			</View>
			{ordersLoading ? (
				<View style={styles.centered}>
					<ActivityIndicator size="large" color="#2563eb" />
					<Text style={styles.loadingText}>Loading orders...</Text>
				</View>
			) : ordersError ? (
				<View style={styles.centered}>
					<Text style={styles.errorText}>{ordersError}</Text>
				</View>
			) : (
				<FlatList
					data={orders}
					keyExtractor={(item) => item.id || Math.random().toString()}
					renderItem={renderItem}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={(
						<View style={styles.centered}>
							<Text style={styles.emptyText}>No orders found.</Text>
						</View>
					)}
				/>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#0b0f1a',
	},
	header: {
		padding: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#1f2937',
	},
	title: {
		color: '#f8fafc',
		fontSize: 20,
		fontWeight: '700',
	},
	subtitle: {
		color: '#94a3b8',
		fontSize: 13,
		marginTop: 4,
	},
	listContent: {
		padding: 16,
		paddingBottom: 120,
	},
	orderCard: {
		backgroundColor: '#111827',
		borderRadius: 16,
		padding: 16,
		marginBottom: 12,
		elevation: 2,
	},
	orderHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	orderTitle: {
		color: '#f8fafc',
		fontSize: 15,
		fontWeight: '700',
	},
	orderStatus: {
		color: '#22d3ee',
		fontSize: 11,
		fontWeight: '700',
	},
	orderMeta: {
		color: '#94a3b8',
		fontSize: 11,
		marginTop: 6,
	},
	orderTotal: {
		color: '#22c55e',
		fontSize: 16,
		fontWeight: '700',
		marginTop: 8,
	},
	orderItems: {
		marginTop: 8,
	},
	orderItemText: {
		color: '#cbd5f5',
		fontSize: 12,
		marginTop: 4,
	},
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	loadingText: {
		color: '#e2e8f0',
		marginTop: 12,
		fontSize: 13,
	},
	errorText: {
		color: '#f87171',
		fontSize: 14,
		textAlign: 'center',
	},
	emptyText: {
		color: '#94a3b8',
		fontSize: 14,
	},
});


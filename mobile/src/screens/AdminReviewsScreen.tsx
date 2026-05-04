// Admin reviews moderation screen.
import React, { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { API_BASE_URL, useStorefrontStore } from '../storefront/store';

// Admin interface for moderating reviews.
export default function AdminReviewsScreen() {
	const token = useStorefrontStore((state) => state.user?.token);
	const [rows, setRows] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [productId, setProductId] = useState('');

	const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);

	// Loads reviews with optional product filtering.
	const fetchRows = useCallback(async () => {
		if (!headers) return;
		setLoading(true);
		try {
			const params: Record<string, string> = { adminView: 'true' };
			if (productId.trim()) params.productId = productId.trim();
			const { data } = await axios.get(`${API_BASE_URL}/api/reviews`, {
				headers,
				params,
			});
			setRows(Array.isArray(data) ? data : []);
		} catch (error: any) {
			Alert.alert('Reviews', error?.response?.data?.error || 'Failed to load reviews');
		} finally {
			setLoading(false);
		}
	}, [headers, productId]);

	useFocusEffect(
		useCallback(() => {
			fetchRows();
			return undefined;
		}, [fetchRows])
	);

	// Toggles the hidden status of a review.
	const toggleHidden = async (review: any) => {
		if (!headers) return;
		try {
			await axios.put(`${API_BASE_URL}/api/reviews/${review.id}`, {
				isHidded: !Boolean(review.isHidded),
			}, { headers });
			await fetchRows();
		} catch (error: any) {
			Alert.alert('Review', error?.response?.data?.error || 'Failed to update review');
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Admin Reviews</Text>
				<Pressable onPress={fetchRows} style={styles.refreshBtn}>
					<Text style={styles.refreshText}>Refresh</Text>
				</Pressable>
			</View>

			<View style={styles.filterWrap}>
				<TextInput
					value={productId}
					onChangeText={setProductId}
					placeholder="Filter by Product ID"
					placeholderTextColor="#64748b"
					style={styles.filterInput}
				/>
				<Pressable onPress={fetchRows} style={styles.applyBtn}>
					<Text style={styles.applyText}>Apply</Text>
				</Pressable>
			</View>

			{loading ? (
				<ActivityIndicator color="#2563eb" style={styles.loader} />
			) : (
				<FlatList
					data={rows}
					keyExtractor={(item) => String(item.id)}
					contentContainerStyle={styles.list}
					ListEmptyComponent={<Text style={styles.empty}>No reviews found.</Text>}
					renderItem={({ item }) => (
						<View style={[styles.card, item.isHidded ? styles.cardHidden : null]}>
							<Text style={styles.cardTitle}>{item.product?.name || `Product ${item.productId}`}</Text>
							<Text style={styles.cardMeta}>By {item.user?.name || 'User'} • {item.rating}/5</Text>
							<Text style={styles.comment}>{item.comment || '(No comment)'}</Text>
							<View style={styles.actions}>
								<Pressable onPress={() => toggleHidden(item)} style={item.isHidded ? styles.showBtn : styles.hideBtn}>
									<Text style={styles.actionText}>{item.isHidded ? 'Show' : 'Hide'}</Text>
								</Pressable>
							</View>
						</View>
					)}
				/>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#0b0f1a' },
	header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	title: { color: '#f8fafc', fontSize: 20, fontWeight: '700' },
	refreshBtn: { backgroundColor: '#1f2937', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
	refreshText: { color: '#fff', fontSize: 12, fontWeight: '600' },
	filterWrap: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 8 },
	filterInput: { flex: 1, backgroundColor: '#111827', color: '#fff', borderRadius: 10, paddingHorizontal: 10, minHeight: 42 },
	applyBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
	applyText: { color: '#fff', fontWeight: '600', fontSize: 12 },
	loader: { marginTop: 24 },
	list: { padding: 14, paddingBottom: 120 },
	card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 10 },
	cardHidden: { borderLeftWidth: 4, borderLeftColor: '#ef4444', opacity: 0.75 },
	cardTitle: { color: '#f8fafc', fontWeight: '700' },
	cardMeta: { color: '#94a3b8', marginTop: 4, fontSize: 12 },
	comment: { color: '#cbd5e1', marginTop: 6, fontSize: 13 },
	actions: { marginTop: 10, alignItems: 'flex-start' },
	hideBtn: { backgroundColor: '#7c2d12', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
	showBtn: { backgroundColor: '#065f46', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
	actionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
	empty: { color: '#94a3b8', textAlign: 'center', marginTop: 30 },
});

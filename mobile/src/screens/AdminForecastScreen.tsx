// Admin demand forecast screen using AI predictions.
import React, { useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_BASE_URL, useStorefrontStore } from '../storefront/store';

// Formats a Date into YYYY-MM-DD.
function toDateString(date: Date) {
	return date.toISOString().slice(0, 10);
}

// Adds days to a date string and returns YYYY-MM-DD.
function addDays(dateString: string, days: number) {
	const d = new Date(`${dateString}T00:00:00.000Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return toDateString(d);
}

// Admin interface for forecasting demand.
export default function AdminForecastScreen() {
	const token = useStorefrontStore((state) => state.user?.token);
	const [products, setProducts] = useState<any[]>([]);
	const [selectedProductId, setSelectedProductId] = useState('');
	const [startDate, setStartDate] = useState(toDateString(new Date()));
	const [days, setDays] = useState('7');
	const [endDate, setEndDate] = useState(addDays(toDateString(new Date()), 6));
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<any>(null);
	const [error, setError] = useState('');

	const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);

	useEffect(() => {
		(async () => {
			try {
				const { data } = await axios.get(`${API_BASE_URL}/api/products`);
				const list = Array.isArray(data) ? data : [];
				setProducts(list);
				if (list.length) setSelectedProductId(String(list[0].id));
			} catch {
				setError('Failed to load products');
			}
		})();
	}, []);

	// Keeps end date in sync with the day count.
	const syncEndDateWithDays = (nextDays: string) => {
		setDays(nextDays);
		const parsedDays = Math.max(1, Number(nextDays || 1));
		setEndDate(addDays(startDate, parsedDays - 1));
	};

	// Calls the AI forecast endpoint for the selected product.
	const runForecast = async () => {
		if (!headers || !selectedProductId) return;
		const parsedDays = Number(days);
		if (!Number.isFinite(parsedDays) || parsedDays < 1 || parsedDays > 366) {
			setError('Days must be between 1 and 366');
			return;
		}
		setError('');
		setLoading(true);
		setResult(null);
		try {
			const { data } = await axios.post(`${API_BASE_URL}/api/forecasts/predict`, {
				productId: selectedProductId,
				startDate,
				endDate,
				days: parsedDays,
			}, { headers });
			setResult(data);
		} catch (e: any) {
			setError(e?.response?.data?.error || 'Failed to generate forecast');
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Admin Forecast</Text>
			</View>

			<View style={styles.formCard}>
				<Text style={styles.label}>Product</Text>
				<FlatList
					horizontal
					showsHorizontalScrollIndicator={false}
					data={products}
					keyExtractor={(item) => String(item.id)}
					renderItem={({ item }) => (
						<Pressable
							onPress={() => setSelectedProductId(String(item.id))}
							style={selectedProductId === String(item.id) ? styles.pillActive : styles.pill}
						>
							<Text style={styles.pillText}>{item.name}</Text>
						</Pressable>
					)}
				/>

				<View style={styles.row}>
					<View style={styles.flex}>
						<Text style={styles.label}>Start Date</Text>
						<TextInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" style={styles.input} />
					</View>
					<View style={styles.flex}>
						<Text style={styles.label}>Days</Text>
						<TextInput value={days} onChangeText={syncEndDateWithDays} keyboardType="numeric" placeholder="1-366" placeholderTextColor="#64748b" style={styles.input} />
					</View>
				</View>

				<Text style={styles.label}>End Date</Text>
				<TextInput value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" style={styles.input} />

				<Pressable onPress={runForecast} style={styles.primaryBtn} disabled={loading}>
					<Text style={styles.btnText}>{loading ? 'Generating...' : 'Generate Forecast'}</Text>
				</Pressable>
				{error ? <Text style={styles.errorText}>{error}</Text> : null}
			</View>

			{loading ? <ActivityIndicator color="#2563eb" style={styles.loader} /> : null}

			{result ? (
				<View style={styles.resultWrap}>
					<Text style={styles.resultTitle}>
						{result.product?.name} • {result.days} day(s)
					</Text>
					<Text style={styles.resultMeta}>
						{result.startDate} to {result.endDate}
					</Text>
					{result.inventorySnapshot ? (
						<Text style={styles.resultMeta}>
							Stock {result.inventorySnapshot.currentStock} • Restock {result.inventorySnapshot.recommendedRestock}
						</Text>
					) : null}
					<FlatList
						data={Array.isArray(result.predictions) ? result.predictions : []}
						keyExtractor={(item) => String(item.id)}
						contentContainerStyle={styles.predictionList}
						renderItem={({ item }) => (
							<View style={styles.predictionCard}>
								<Text style={styles.predictionDate}>{String(item.forecastForDate).slice(0, 10)}</Text>
								<Text style={styles.predictionDemand}>Demand {item.predictedDemand}</Text>
							</View>
						)}
					/>
				</View>
			) : null}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#0b0f1a' },
	header: { padding: 16 },
	title: { color: '#f8fafc', fontSize: 20, fontWeight: '700' },
	formCard: { marginHorizontal: 14, marginBottom: 10, backgroundColor: '#111827', borderRadius: 12, padding: 12 },
	label: { color: '#cbd5e1', fontSize: 12, marginBottom: 4, marginTop: 6 },
	row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
	flex: { flex: 1 },
	input: { backgroundColor: '#1f2937', color: '#fff', borderRadius: 8, minHeight: 40, paddingHorizontal: 10 },
	pill: { backgroundColor: '#334155', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8, marginBottom: 6 },
	pillActive: { backgroundColor: '#2563eb', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8, marginBottom: 6 },
	pillText: { color: '#fff', fontSize: 12, fontWeight: '600' },
	primaryBtn: { backgroundColor: '#2563eb', borderRadius: 8, alignItems: 'center', paddingVertical: 10, marginTop: 10 },
	btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
	errorText: { color: '#f87171', marginTop: 8, fontSize: 12 },
	loader: { marginTop: 10 },
	resultWrap: { flex: 1, marginHorizontal: 14, marginBottom: 12, backgroundColor: '#111827', borderRadius: 12, padding: 12 },
	resultTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 14 },
	resultMeta: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
	predictionCard: { borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingVertical: 10 },
	predictionDate: { color: '#f8fafc', fontSize: 13, fontWeight: '600' },
	predictionDemand: { color: '#22d3ee', fontSize: 12, marginTop: 4 },
	predictionList: { paddingBottom: 12 },
});

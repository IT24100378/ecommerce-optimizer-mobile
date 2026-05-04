// Admin inventory management screen.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import axios from 'axios';
import { API_BASE_URL, useStorefrontStore } from '../storefront/store';

type InventoryDraft = {
	productId: string;
	stockLevel: string;
	lowStockThreshold: string;
};

const emptyDraft: InventoryDraft = { productId: '', stockLevel: '0', lowStockThreshold: '10' };

// Admin interface for inventory records.
export default function AdminInventoryScreen() {
	const token = useStorefrontStore((state) => state.user?.token);
	const [rows, setRows] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [showCreate, setShowCreate] = useState(false);
	const [draft, setDraft] = useState<InventoryDraft>(emptyDraft);
	const [editingId, setEditingId] = useState('');
	const [editStock, setEditStock] = useState('');
	const [editThreshold, setEditThreshold] = useState('');

	const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);

	// Loads inventory rows.
	const fetchRows = useCallback(async () => {
		if (!headers) return;
		setLoading(true);
		try {
			const { data } = await axios.get(`${API_BASE_URL}/api/inventory`, { headers });
			setRows(Array.isArray(data) ? data : []);
		} catch (error: any) {
			Alert.alert('Inventory', error?.response?.data?.error || 'Failed to load inventory');
		} finally {
			setLoading(false);
		}
	}, [headers]);

	useEffect(() => {
		fetchRows();
	}, [fetchRows]);

	// Creates a new inventory record.
	const createRecord = async () => {
		if (!headers) return;
		const payload = {
			productId: draft.productId.trim(),
			stockLevel: Number(draft.stockLevel),
			lowStockThreshold: Number(draft.lowStockThreshold),
		};
		if (!payload.productId || Number.isNaN(payload.stockLevel) || Number.isNaN(payload.lowStockThreshold)) {
			Alert.alert('Inventory', 'Product ID, stock level and threshold are required.');
			return;
		}
		try {
			await axios.post(`${API_BASE_URL}/api/inventory`, payload, { headers });
			setShowCreate(false);
			setDraft(emptyDraft);
			await fetchRows();
		} catch (error: any) {
			Alert.alert('Inventory', error?.response?.data?.error || 'Failed to create record');
		}
	};

	// Initializes editing state for a row.
	const startEdit = (row: any) => {
		setEditingId(String(row.id));
		setEditStock(String(row.stockLevel ?? 0));
		setEditThreshold(String(row.lowStockThreshold ?? 10));
	};

	// Saves the edited inventory values.
	const saveEdit = async () => {
		if (!headers || !editingId) return;
		const payload = {
			stockLevel: Number(editStock),
			lowStockThreshold: Number(editThreshold),
		};
		if (Number.isNaN(payload.stockLevel) || Number.isNaN(payload.lowStockThreshold)) {
			Alert.alert('Inventory', 'Stock and threshold must be numeric.');
			return;
		}
		try {
			await axios.put(`${API_BASE_URL}/api/inventory/${editingId}`, payload, { headers });
			setEditingId('');
			await fetchRows();
		} catch (error: any) {
			Alert.alert('Inventory', error?.response?.data?.error || 'Failed to update record');
		}
	};

	// Confirms and deletes an inventory record.
	const removeRecord = (id: string) => {
		if (!headers) return;
		Alert.alert('Delete Record', 'Delete this inventory record?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: async () => {
					try {
						await axios.delete(`${API_BASE_URL}/api/inventory/${id}`, { headers });
						await fetchRows();
					} catch (error: any) {
						Alert.alert('Inventory', error?.response?.data?.error || 'Failed to delete record');
					}
				},
			},
		]);
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Admin Inventory</Text>
				<View style={styles.headerActions}>
					<Pressable style={styles.primaryBtn} onPress={() => setShowCreate((prev) => !prev)}>
						<Text style={styles.btnText}>{showCreate ? 'Close' : 'New'}</Text>
					</Pressable>
					<Pressable style={styles.secondaryBtn} onPress={fetchRows}>
						<Text style={styles.btnText}>Refresh</Text>
					</Pressable>
				</View>
			</View>

			{showCreate && (
				<View style={styles.formCard}>
					<Text style={styles.cardTitle}>Create Inventory Record</Text>
					<TextInput value={draft.productId} onChangeText={(value) => setDraft((prev) => ({ ...prev, productId: value }))} placeholder="Product ObjectId or Product Code" placeholderTextColor="#64748b" style={styles.input} />
					<View style={styles.row}>
						<TextInput value={draft.stockLevel} onChangeText={(value) => setDraft((prev) => ({ ...prev, stockLevel: value }))} placeholder="Stock Level" placeholderTextColor="#64748b" keyboardType="numeric" style={[styles.input, styles.flex]} />
						<TextInput value={draft.lowStockThreshold} onChangeText={(value) => setDraft((prev) => ({ ...prev, lowStockThreshold: value }))} placeholder="Threshold" placeholderTextColor="#64748b" keyboardType="numeric" style={[styles.input, styles.flex]} />
					</View>
					<Pressable style={styles.primaryBtn} onPress={createRecord}>
						<Text style={styles.btnText}>Create</Text>
					</Pressable>
				</View>
			)}

			{loading ? (
				<ActivityIndicator color="#2563eb" style={styles.loader} />
			) : (
				<FlatList
					data={rows}
					keyExtractor={(item) => String(item.id)}
					contentContainerStyle={styles.list}
					renderItem={({ item }) => {
						const lowStock = Number(item.stockLevel ?? 0) <= Number(item.lowStockThreshold ?? 0);
						const editing = editingId === String(item.id);
						return (
							<View style={[styles.card, lowStock ? styles.lowStockCard : null]}>
								<Text style={styles.cardTitle}>{item.product?.name || `Product ${item.productId}`}</Text>
								{item.product?.productCode ? <Text style={styles.meta}>Code: {item.product.productCode}</Text> : null}
								<Text style={styles.meta}>ID: {item.id}</Text>
								{editing ? (
									<View style={styles.row}>
										<TextInput value={editStock} onChangeText={setEditStock} keyboardType="numeric" placeholder="Stock" placeholderTextColor="#64748b" style={[styles.input, styles.flex]} />
										<TextInput value={editThreshold} onChangeText={setEditThreshold} keyboardType="numeric" placeholder="Threshold" placeholderTextColor="#64748b" style={[styles.input, styles.flex]} />
									</View>
								) : (
									<Text style={styles.meta}>Stock {item.stockLevel} • Threshold {item.lowStockThreshold}</Text>
								)}
								<View style={styles.row}>
									{editing ? (
										<>
											<Pressable style={styles.primaryBtn} onPress={saveEdit}><Text style={styles.btnText}>Save</Text></Pressable>
											<Pressable style={styles.secondaryBtn} onPress={() => setEditingId('')}><Text style={styles.btnText}>Cancel</Text></Pressable>
										</>
									) : (
										<>
											<Pressable style={styles.secondaryBtn} onPress={() => startEdit(item)}><Text style={styles.btnText}>Edit</Text></Pressable>
											<Pressable style={styles.dangerBtn} onPress={() => removeRecord(item.id)}><Text style={styles.btnText}>Delete</Text></Pressable>
										</>
									)}
								</View>
							</View>
						);
					}}
				/>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#0b0f1a' },
	header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	title: { color: '#f8fafc', fontSize: 20, fontWeight: '700' },
	headerActions: { flexDirection: 'row', gap: 8 },
	loader: { marginTop: 24 },
	list: { padding: 14, paddingBottom: 120 },
	formCard: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginHorizontal: 14, marginBottom: 10 },
	card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 10 },
	lowStockCard: { borderLeftWidth: 4, borderLeftColor: '#ef4444' },
	cardTitle: { color: '#f8fafc', fontWeight: '700' },
	meta: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
	input: { backgroundColor: '#1f2937', color: '#fff', borderRadius: 8, minHeight: 40, paddingHorizontal: 10, marginTop: 8 },
	row: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
	flex: { flex: 1 },
	primaryBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
	secondaryBtn: { backgroundColor: '#334155', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
	dangerBtn: { backgroundColor: '#7f1d1d', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
	btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

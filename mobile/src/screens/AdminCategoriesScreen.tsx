// Admin category management screen.
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

type CategoryRow = {
	id: string;
	name: string;
	createdAt?: string;
};

// Admin interface for managing categories.
export default function AdminCategoriesScreen() {
	const token = useStorefrontStore((state) => state.user?.token);
	const products = useStorefrontStore((state) => state.products);
	const fetchCatalog = useStorefrontStore((state) => state.fetchCatalog);
	const [categories, setCategories] = useState<CategoryRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [newCategoryName, setNewCategoryName] = useState('');
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState('');

	const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

	const categoryProductCounts = useMemo(() => {
		return products.reduce<Record<string, number>>((acc, product) => {
			const key = String(product.category || '').trim();
			if (!key) return acc;
			acc[key] = (acc[key] || 0) + 1;
			return acc;
		}, {});
	}, [products]);

	// Loads admin categories and refreshes catalog data.
	const loadData = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		try {
			const [categoriesRes] = await Promise.all([
				axios.get(`${API_BASE_URL}/api/categories/admin`, { headers }),
				fetchCatalog(),
			]);
			setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
		} catch {
			Alert.alert('Categories', 'Failed to load categories.');
		} finally {
			setLoading(false);
		}
	}, [fetchCatalog, headers, token]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	// Creates a new category.
	const handleCreate = async () => {
		const name = newCategoryName.trim();
		if (!name) {
			Alert.alert('Categories', 'Category name is required.');
			return;
		}
		setSaving(true);
		try {
			await axios.post(`${API_BASE_URL}/api/categories`, { name }, { headers });
			setNewCategoryName('');
			await loadData();
		} catch (error: any) {
			Alert.alert('Categories', error?.response?.data?.error || 'Failed to create category.');
		} finally {
			setSaving(false);
		}
	};

	// Updates an existing category name.
	const handleUpdate = async (category: CategoryRow) => {
		const name = editingName.trim();
		if (!name) {
			Alert.alert('Categories', 'Category name is required.');
			return;
		}
		setSaving(true);
		try {
			await axios.put(`${API_BASE_URL}/api/categories/${category.id}`, { name }, { headers });
			setEditingId(null);
			setEditingName('');
			await loadData();
		} catch (error: any) {
			Alert.alert('Categories', error?.response?.data?.error || 'Failed to update category.');
		} finally {
			setSaving(false);
		}
	};

	// Confirms and deletes a category.
	const handleDelete = (category: CategoryRow) => {
		Alert.alert('Delete Category', `Delete "${category.name}"?`, [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: async () => {
					setSaving(true);
					try {
						await axios.delete(`${API_BASE_URL}/api/categories/${category.id}`, { headers });
						await loadData();
					} catch (error: any) {
						Alert.alert('Categories', error?.response?.data?.error || 'Failed to delete category.');
					} finally {
						setSaving(false);
					}
				},
			},
		]);
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Admin Categories</Text>
			</View>
			<View style={styles.createRow}>
				<TextInput
					value={newCategoryName}
					onChangeText={setNewCategoryName}
					placeholder="New category name"
					placeholderTextColor="#64748b"
					style={styles.input}
				/>
				<Pressable style={styles.primaryBtn} onPress={handleCreate} disabled={saving}>
					<Text style={styles.btnText}>{saving ? '...' : 'Create'}</Text>
				</Pressable>
			</View>
			{loading ? (
				<ActivityIndicator color="#2563eb" style={styles.loader} />
			) : (
				<FlatList
					data={categories}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.list}
					renderItem={({ item }) => {
						const isEditing = editingId === item.id;
						const linkedProducts = categoryProductCounts[item.name] || 0;
						return (
							<View style={styles.card}>
								<View style={styles.info}>
									{isEditing ? (
										<TextInput
											value={editingName}
											onChangeText={setEditingName}
											style={styles.inlineInput}
											placeholder="Category name"
											placeholderTextColor="#64748b"
										/>
									) : (
										<Text style={styles.name}>{item.name}</Text>
									)}
									<Text style={styles.meta}>Products: {linkedProducts}</Text>
								</View>
								<View style={styles.actions}>
									{isEditing ? (
										<>
											<Pressable style={styles.primaryBtn} onPress={() => handleUpdate(item)} disabled={saving}>
												<Text style={styles.btnText}>Save</Text>
											</Pressable>
											<Pressable style={styles.secondaryBtn} onPress={() => { setEditingId(null); setEditingName(''); }}>
												<Text style={styles.btnText}>Cancel</Text>
											</Pressable>
										</>
									) : (
										<>
											<Pressable
												style={styles.secondaryBtn}
												onPress={() => {
													setEditingId(item.id);
													setEditingName(item.name);
												}}
											>
												<Text style={styles.btnText}>Edit</Text>
											</Pressable>
											<Pressable style={styles.dangerBtn} onPress={() => handleDelete(item)}>
												<Text style={styles.btnText}>Delete</Text>
											</Pressable>
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
	header: { padding: 16 },
	title: { color: '#f8fafc', fontSize: 20, fontWeight: '700' },
	createRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
	input: { flex: 1, backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 8, paddingHorizontal: 10, height: 42 },
	inlineInput: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 8, paddingHorizontal: 10, height: 40, minWidth: 180 },
	loader: { marginTop: 24 },
	list: { padding: 14, paddingBottom: 120 },
	card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
	info: { flex: 1, gap: 4 },
	name: { color: '#f8fafc', fontWeight: '700', fontSize: 16 },
	meta: { color: '#94a3b8', fontSize: 12 },
	actions: { gap: 8 },
	primaryBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
	secondaryBtn: { backgroundColor: '#334155', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
	dangerBtn: { backgroundColor: '#7f1d1d', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
	btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

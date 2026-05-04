// Admin product management screen for CRUD operations.
import React, { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Image,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_BASE_URL, getProductId, Product, useStorefrontStore } from '../storefront/store';

type ProductForm = {
	id?: string;
	name: string;
	sku: string;
	category: string;
	basePrice: string;
	imageUrl: string;
	description: string;
};

const emptyForm: ProductForm = {
	name: '',
	sku: '',
	category: '',
	basePrice: '',
	imageUrl: '',
	description: '',
};

// Admin interface for managing products.
export default function AdminProductDashboardScreen() {
	const { products, loading, fetchCatalog, createProduct, updateProduct, deleteProduct } = useStorefrontStore();
	const [categories, setCategories] = useState<string[]>([]);
	const [formModal, setFormModal] = useState(false);
	const [saving, setSaving] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [form, setForm] = useState<ProductForm>(emptyForm);

	// Loads available categories for product assignment.
	const fetchCategories = useCallback(async () => {
		try {
			const { data } = await axios.get(`${API_BASE_URL}/api/categories`);
			setCategories(Array.isArray(data) ? data : []);
		} catch {
			setCategories([]);
		}
	}, []);

	useEffect(() => {
		fetchCatalog();
		fetchCategories();
	}, [fetchCatalog, fetchCategories]);

	// Opens the create product modal.
	const openCreate = () => {
		setIsEditing(false);
		setForm(emptyForm);
		setFormModal(true);
	};

	// Opens the edit modal with the selected product.
	const openEdit = (product: Product) => {
		setIsEditing(true);
		setForm({
			id: String(product.id),
			name: String(product.name || ''),
			sku: String(product.sku || ''),
			category: String(product.category || ''),
			basePrice: String(product.basePrice ?? ''),
			imageUrl: String(product.imageUrl || ''),
			description: String(product.description || ''),
		});
		setFormModal(true);
	};

	// Validates and submits create/update actions.
	const submitProduct = async () => {
		if (!form.name.trim() || !form.sku.trim()) {
			Alert.alert('Product', 'Name and SKU are required.');
			return;
		}
		const basePrice = Number(form.basePrice);
		if (!Number.isFinite(basePrice) || basePrice < 0) {
			Alert.alert('Product', 'Base price must be a non-negative number.');
			return;
		}

		setSaving(true);
		const payload = {
			name: form.name.trim(),
			sku: form.sku.trim(),
			category: form.category.trim(),
			basePrice,
			imageUrl: form.imageUrl.trim() || null,
			description: form.description.trim() || null,
		};

		let ok = false;
		if (isEditing && form.id) {
			ok = await updateProduct(form.id, payload);
		} else {
			ok = await createProduct(payload);
		}
		setSaving(false);

		if (!ok) {
			Alert.alert('Product', 'Failed to save product. Check permissions and payload.');
			return;
		}
		setFormModal(false);
		await fetchCategories();
	};

	// Confirms and executes product deletion.
	const confirmDelete = (id: string) => {
		Alert.alert('Delete Product', 'Delete this product?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: async () => {
					const ok = await deleteProduct(id);
					if (!ok) Alert.alert('Product', 'Failed to delete product.');
				},
			},
		]);
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Admin Products</Text>
				<View style={styles.headerActions}>
					<Pressable style={styles.primaryBtn} onPress={openCreate}>
						<Text style={styles.btnText}>+ Product</Text>
					</Pressable>
				</View>
			</View>

			{loading ? (
				<ActivityIndicator color="#2563eb" style={styles.loader} />
			) : (
				<FlatList
					data={products}
					keyExtractor={(item) => getProductId(item)}
					contentContainerStyle={styles.list}
					renderItem={({ item }) => {
						const id = String(item.id || '');
						const price = Number(item.basePrice ?? 0).toFixed(2);
						const stock = Number(item.availableStock ?? item.stockQuantity ?? 0);
						return (
							<View style={styles.card}>
								<Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }} style={styles.image} />
								<View style={styles.info}>
									<Text style={styles.name}>{item.name}</Text>
									<Text style={styles.meta}>Code: {item.productCode ?? '-'}</Text>
									<Text style={styles.meta}>SKU: {item.sku || 'N/A'}</Text>
									<Text style={styles.meta}>{item.category || 'General'} • Stock {stock}</Text>
									<Text style={styles.price}>${price}</Text>
								</View>
								<View style={styles.actions}>
									<Pressable style={styles.secondaryBtn} onPress={() => openEdit(item)}>
										<Text style={styles.btnText}>Edit</Text>
									</Pressable>
									<Pressable style={styles.dangerBtn} onPress={() => confirmDelete(id)}>
										<Text style={styles.btnText}>Delete</Text>
									</Pressable>
								</View>
							</View>
						);
					}}
				/>
			)}

			<Modal visible={formModal} transparent animationType="slide">
				<View style={styles.modalOverlay}>
					<View style={styles.modalBody}>
						<Text style={styles.modalTitle}>{isEditing ? 'Edit Product' : 'Create Product'}</Text>
						<ScrollView style={styles.modalScroll}>
							<TextInput value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} placeholder="Name" placeholderTextColor="#64748b" style={styles.input} />
							<TextInput value={form.sku} onChangeText={(value) => setForm((prev) => ({ ...prev, sku: value }))} placeholder="SKU" placeholderTextColor="#64748b" style={styles.input} />
							<Text style={styles.label}>Category</Text>
							<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryWrap}>
								<Pressable
									onPress={() => setForm((prev) => ({ ...prev, category: '' }))}
									style={!form.category ? styles.categoryPillActive : styles.categoryPill}
								>
									<Text style={styles.categoryText}>Uncategorized</Text>
								</Pressable>
								{categories.map((category) => (
									<Pressable
										key={category}
										onPress={() => setForm((prev) => ({ ...prev, category }))}
										style={form.category === category ? styles.categoryPillActive : styles.categoryPill}
									>
										<Text style={styles.categoryText}>{category}</Text>
									</Pressable>
								))}
							</ScrollView>
							<TextInput value={form.basePrice} onChangeText={(value) => setForm((prev) => ({ ...prev, basePrice: value }))} placeholder="Base Price" placeholderTextColor="#64748b" keyboardType="numeric" style={styles.input} />
							<TextInput value={form.imageUrl} onChangeText={(value) => setForm((prev) => ({ ...prev, imageUrl: value }))} placeholder="Image URL" placeholderTextColor="#64748b" style={styles.input} />
							<TextInput value={form.description} onChangeText={(value) => setForm((prev) => ({ ...prev, description: value }))} placeholder="Description" placeholderTextColor="#64748b" style={[styles.input, styles.textArea]} multiline />
						</ScrollView>
						<View style={styles.modalActions}>
							<Pressable style={styles.secondaryBtn} onPress={() => setFormModal(false)}>
								<Text style={styles.btnText}>Cancel</Text>
							</Pressable>
							<Pressable style={styles.primaryBtn} onPress={submitProduct} disabled={saving}>
								<Text style={styles.btnText}>{saving ? 'Saving...' : 'Save'}</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>
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
	card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
	image: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#1f2937' },
	info: { flex: 1, marginLeft: 10 },
	name: { color: '#f8fafc', fontWeight: '700' },
	meta: { color: '#94a3b8', fontSize: 12, marginTop: 3 },
	price: { color: '#22d3ee', fontSize: 14, fontWeight: '700', marginTop: 6 },
	actions: { gap: 8 },
	primaryBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
	secondaryBtn: { backgroundColor: '#334155', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
	dangerBtn: { backgroundColor: '#7f1d1d', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
	btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
	modalBody: { backgroundColor: '#0f172a', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, height: '86%' },
	modalTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginBottom: 10 },
	modalScroll: { flex: 1 },
	input: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 8, paddingHorizontal: 10, minHeight: 42, marginBottom: 10 },
	textArea: { minHeight: 90, textAlignVertical: 'top' },
	label: { color: '#cbd5e1', fontSize: 12, marginBottom: 6, marginTop: 4 },
	categoryWrap: { marginBottom: 10 },
	categoryPill: { backgroundColor: '#1f2937', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8 },
	categoryPillActive: { backgroundColor: '#2563eb', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8 },
	categoryText: { color: '#fff', fontSize: 12, fontWeight: '600' },
	modalActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { API_BASE_URL, useStorefrontStore } from '../storefront/store';

type UserForm = {
	name: string;
	email: string;
	password: string;
	role: 'CUSTOMER' | 'ADMIN';
	address: string;
	preferences: string;
};

const emptyForm: UserForm = {
	name: '',
	email: '',
	password: '',
	role: 'CUSTOMER',
	address: '',
	preferences: '',
};

export default function AdminUsersScreen() {
	const token = useStorefrontStore((state) => state.user?.token);
	const [rows, setRows] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [formOpen, setFormOpen] = useState(false);
	const [editingId, setEditingId] = useState('');
	const [form, setForm] = useState<UserForm>(emptyForm);
	const [historyUser, setHistoryUser] = useState<any>(null);
	const [historyLoading, setHistoryLoading] = useState(false);

	const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);

	const fetchRows = useCallback(async () => {
		if (!headers) return;
		setLoading(true);
		try {
			const { data } = await axios.get(`${API_BASE_URL}/api/users`, { headers });
			setRows(Array.isArray(data) ? data : []);
		} catch (error: any) {
			Alert.alert('Users', error?.response?.data?.error || 'Failed to load users');
		} finally {
			setLoading(false);
		}
	}, [headers]);

	useEffect(() => {
		fetchRows();
	}, [fetchRows]);

	const openCreate = () => {
		setEditingId('');
		setForm(emptyForm);
		setFormOpen(true);
	};

	const openEdit = (user: any) => {
		setEditingId(String(user.id));
		setForm({
			name: String(user.name || ''),
			email: String(user.email || ''),
			password: '',
			role: String(user.role || 'CUSTOMER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
			address: String(user.address || ''),
			preferences: String(user.preferences || ''),
		});
		setFormOpen(true);
	};

	const saveUser = async () => {
		if (!headers) return;
		if (!form.name.trim() || !form.email.trim()) {
			Alert.alert('Users', 'Name and email are required.');
			return;
		}
		try {
			if (editingId) {
				await axios.put(`${API_BASE_URL}/api/users/${editingId}`, {
					name: form.name.trim(),
					email: form.email.trim(),
					role: form.role,
					address: form.address.trim(),
					preferences: form.preferences.trim(),
				}, { headers });
			} else {
				if (!form.password.trim() || form.password.trim().length < 6) {
					Alert.alert('Users', 'Password must be at least 6 characters.');
					return;
				}
				const { data } = await axios.post(`${API_BASE_URL}/api/users`, {
					name: form.name.trim(),
					email: form.email.trim(),
					password: form.password.trim(),
					address: form.address.trim(),
					preferences: form.preferences.trim(),
				});
				if (form.role === 'ADMIN' && data?.id) {
					await axios.put(`${API_BASE_URL}/api/users/${data.id}`, { role: 'ADMIN' }, { headers });
				}
			}
			setFormOpen(false);
			setEditingId('');
			setForm(emptyForm);
			await fetchRows();
		} catch (error: any) {
			Alert.alert('Users', error?.response?.data?.error || 'Failed to save user');
		}
	};

	const deleteUser = (id: string) => {
		if (!headers) return;
		Alert.alert('Delete User', 'Delete this user account?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: async () => {
					try {
						await axios.delete(`${API_BASE_URL}/api/users/${id}`, { headers });
						await fetchRows();
					} catch (error: any) {
						Alert.alert('Users', error?.response?.data?.error || 'Failed to delete user');
					}
				},
			},
		]);
	};

	const loadHistory = async (id: string) => {
		if (!headers) return;
		setHistoryLoading(true);
		try {
			const { data } = await axios.get(`${API_BASE_URL}/api/users/${id}`, { headers });
			setHistoryUser(data);
		} catch (error: any) {
			Alert.alert('Users', error?.response?.data?.error || 'Failed to load user history');
			setHistoryUser(null);
		} finally {
			setHistoryLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Admin Users</Text>
				<View style={styles.headerActions}>
					<Pressable style={styles.primaryBtn} onPress={() => (formOpen ? setFormOpen(false) : openCreate())}>
						<Text style={styles.btnText}>{formOpen ? 'Close' : 'New'}</Text>
					</Pressable>
					<Pressable style={styles.secondaryBtn} onPress={fetchRows}>
						<Text style={styles.btnText}>Refresh</Text>
					</Pressable>
				</View>
			</View>

			{formOpen && (
				<View style={styles.formCard}>
					<Text style={styles.cardTitle}>{editingId ? 'Edit User' : 'Create User'}</Text>
					<TextInput value={form.name} onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))} placeholder="Name" placeholderTextColor="#64748b" style={styles.input} />
					<TextInput value={form.email} onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))} placeholder="Email" placeholderTextColor="#64748b" style={styles.input} autoCapitalize="none" />
					{!editingId ? (
						<TextInput value={form.password} onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))} placeholder="Password" placeholderTextColor="#64748b" style={styles.input} secureTextEntry />
					) : null}
					<View style={styles.row}>
						<Pressable style={form.role === 'CUSTOMER' ? styles.rolePillActive : styles.rolePill} onPress={() => setForm((prev) => ({ ...prev, role: 'CUSTOMER' }))}>
							<Text style={styles.btnText}>CUSTOMER</Text>
						</Pressable>
						<Pressable style={form.role === 'ADMIN' ? styles.rolePillActive : styles.rolePill} onPress={() => setForm((prev) => ({ ...prev, role: 'ADMIN' }))}>
							<Text style={styles.btnText}>ADMIN</Text>
						</Pressable>
					</View>
					<TextInput value={form.address} onChangeText={(value) => setForm((prev) => ({ ...prev, address: value }))} placeholder="Address" placeholderTextColor="#64748b" style={styles.input} />
					<TextInput value={form.preferences} onChangeText={(value) => setForm((prev) => ({ ...prev, preferences: value }))} placeholder="Preferences" placeholderTextColor="#64748b" style={styles.input} />
					<Pressable style={styles.primaryBtn} onPress={saveUser}>
						<Text style={styles.btnText}>Save User</Text>
					</Pressable>
				</View>
			)}

			{historyUser ? (
				<View style={styles.historyCard}>
					<View style={styles.rowBetween}>
						<Text style={styles.cardTitle}>{historyUser.name} History</Text>
						<Pressable style={styles.secondaryBtn} onPress={() => setHistoryUser(null)}>
							<Text style={styles.btnText}>Close</Text>
						</Pressable>
					</View>
					{historyLoading ? (
						<ActivityIndicator color="#2563eb" style={styles.loader} />
					) : (
						<ScrollView style={styles.historyScroll}>
							{Array.isArray(historyUser.orders) && historyUser.orders.length > 0 ? historyUser.orders.map((order: any) => (
								<View key={String(order.id)} style={styles.historyItem}>
									<Text style={styles.meta}>Order #{order.id} • {order.status}</Text>
									<Text style={styles.meta}>${Number(order.totalAmount || 0).toFixed(2)} • {new Date(order.orderDate).toLocaleDateString()}</Text>
								</View>
							)) : <Text style={styles.meta}>No orders found.</Text>}
						</ScrollView>
					)}
				</View>
			) : null}

			{loading ? (
				<ActivityIndicator color="#2563eb" style={styles.loader} />
			) : (
				<FlatList
					data={rows}
					keyExtractor={(item) => String(item.id)}
					contentContainerStyle={styles.list}
					renderItem={({ item }) => (
						<View style={styles.card}>
							<Text style={styles.cardTitle}>{item.name}</Text>
							<Text style={styles.meta}>{item.email}</Text>
							<Text style={styles.meta}>{item.role} • {item.address || 'No address'}</Text>
							<View style={styles.row}>
								<Pressable style={styles.secondaryBtn} onPress={() => loadHistory(item.id)}>
									<Text style={styles.btnText}>History</Text>
								</Pressable>
								<Pressable style={styles.secondaryBtn} onPress={() => openEdit(item)}>
									<Text style={styles.btnText}>Edit</Text>
								</Pressable>
								<Pressable style={styles.dangerBtn} onPress={() => deleteUser(item.id)}>
									<Text style={styles.btnText}>Delete</Text>
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
	headerActions: { flexDirection: 'row', gap: 8 },
	loader: { marginTop: 24 },
	list: { padding: 14, paddingBottom: 120 },
	formCard: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginHorizontal: 14, marginBottom: 10 },
	historyCard: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginHorizontal: 14, marginBottom: 10, maxHeight: 220 },
	historyScroll: { marginTop: 10 },
	historyItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
	card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 10 },
	cardTitle: { color: '#f8fafc', fontWeight: '700' },
	meta: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
	input: { backgroundColor: '#1f2937', color: '#fff', borderRadius: 8, minHeight: 40, paddingHorizontal: 10, marginTop: 8 },
	row: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
	rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	primaryBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
	secondaryBtn: { backgroundColor: '#334155', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
	dangerBtn: { backgroundColor: '#7f1d1d', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
	rolePill: { backgroundColor: '#334155', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
	rolePillActive: { backgroundColor: '#4f46e5', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
	btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

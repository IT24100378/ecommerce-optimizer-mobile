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

const STATUSES = ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'];

type DraftItem = {
    productId: string;
    quantity: string;
    price: string;
};

export default function AdminOrdersScreen() {
    const token = useStorefrontStore((state) => state.user?.token);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [draftItems, setDraftItems] = useState<DraftItem[]>([{ productId: '', quantity: '1', price: '' }]);
    const [createBusy, setCreateBusy] = useState(false);

    const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);

    const fetchOrders = useCallback(async () => {
        if (!headers) return;
        setLoading(true);
        try {
            const { data } = await axios.get(`${API_BASE_URL}/api/orders`, { headers });
            setOrders(Array.isArray(data) ? data : []);
        } catch (error: any) {
            Alert.alert('Orders', error?.response?.data?.error || 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    }, [headers]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const updateStatus = async (orderId: string, nextStatus: string) => {
        if (!headers) return;
        setBusyId(orderId);
        try {
            await axios.put(`${API_BASE_URL}/api/orders/${orderId}`, { status: nextStatus }, { headers });
            await fetchOrders();
        } catch (error: any) {
            Alert.alert('Order', error?.response?.data?.error || 'Failed to update status');
        } finally {
            setBusyId('');
        }
    };

    const deleteOrder = (orderId: string) => {
        if (!headers) return;
        Alert.alert('Delete Order', 'Delete this order permanently?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    setBusyId(orderId);
                    try {
                        await axios.delete(`${API_BASE_URL}/api/orders/${orderId}`, { headers });
                        await fetchOrders();
                    } catch (error: any) {
                        Alert.alert('Order', error?.response?.data?.error || 'Failed to delete order');
                    } finally {
                        setBusyId('');
                    }
                },
            },
        ]);
    };

    const addDraftItem = () => setDraftItems((prev) => [...prev, { productId: '', quantity: '1', price: '' }]);
    const removeDraftItem = (index: number) => setDraftItems((prev) => prev.filter((_, idx) => idx !== index));
    const updateDraftItem = (index: number, field: keyof DraftItem, value: string) => {
        setDraftItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)));
    };

    const createOrder = async () => {
        if (!headers) return;
        const parsedItems = draftItems.map((item) => ({
            productId: item.productId.trim(),
            quantity: Number(item.quantity),
            price: Number(item.price),
        }));
        const invalid = parsedItems.some((item) => !item.productId || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.price) || item.price < 0);
        if (invalid) {
            Alert.alert('Order', 'Each line needs valid productId, quantity, and price.');
            return;
        }

        setCreateBusy(true);
        try {
            await axios.post(`${API_BASE_URL}/api/orders`, { items: parsedItems }, { headers });
            setShowCreate(false);
            setDraftItems([{ productId: '', quantity: '1', price: '' }]);
            await fetchOrders();
        } catch (error: any) {
            Alert.alert('Order', error?.response?.data?.error || 'Failed to create order');
        } finally {
            setCreateBusy(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Admin Orders</Text>
                <View style={styles.headerActions}>
                    <Pressable onPress={() => setShowCreate((prev) => !prev)} style={styles.btnPrimary}>
                        <Text style={styles.btnText}>{showCreate ? 'Close' : 'New'}</Text>
                    </Pressable>
                    <Pressable onPress={fetchOrders} style={styles.btnSecondary}>
                        <Text style={styles.btnText}>Refresh</Text>
                    </Pressable>
                </View>
            </View>

            {showCreate && (
                <View style={styles.formCard}>
                    <Text style={styles.cardTitle}>Create Order</Text>
                    {draftItems.map((item, index) => (
                        <View key={`${index}-${item.productId}`} style={styles.draftRow}>
                            <TextInput
                                value={item.productId}
                                onChangeText={(value) => updateDraftItem(index, 'productId', value)}
                                placeholder="Product ID"
                                placeholderTextColor="#64748b"
                                style={[styles.input, styles.flex2]}
                            />
                            <TextInput
                                value={item.quantity}
                                onChangeText={(value) => updateDraftItem(index, 'quantity', value)}
                                placeholder="Qty"
                                placeholderTextColor="#64748b"
                                keyboardType="numeric"
                                style={[styles.input, styles.flex1]}
                            />
                            <TextInput
                                value={item.price}
                                onChangeText={(value) => updateDraftItem(index, 'price', value)}
                                placeholder="Price"
                                placeholderTextColor="#64748b"
                                keyboardType="numeric"
                                style={[styles.input, styles.flex1]}
                            />
                            {draftItems.length > 1 ? (
                                <Pressable onPress={() => removeDraftItem(index)} style={styles.btnDanger}>
                                    <Text style={styles.btnText}>X</Text>
                                </Pressable>
                            ) : null}
                        </View>
                    ))}
                    <View style={styles.inlineActions}>
                        <Pressable onPress={addDraftItem} style={styles.btnSecondary}>
                            <Text style={styles.btnText}>+ Item</Text>
                        </Pressable>
                        <Pressable onPress={createOrder} style={styles.btnPrimary} disabled={createBusy}>
                            <Text style={styles.btnText}>{createBusy ? 'Saving...' : 'Create Order'}</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {loading ? (
                <ActivityIndicator color="#2563eb" style={styles.loader} />
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Order #{item.id?.slice?.(-6) || item.id}</Text>
                            <Text style={styles.cardMeta}>{item.user?.name || item.user?.email || 'Customer'} • {(item.items || []).length} items</Text>
                            <Text style={styles.cardTotal}>${Number(item.discountedTotal ?? item.totalAmount ?? 0).toFixed(2)}</Text>
                            <View style={styles.inlineActions}>
                                <FlatList
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    data={STATUSES}
                                    keyExtractor={(status) => `${item.id}-${status}`}
                                    renderItem={({ item: status }) => (
                                        <Pressable
                                            onPress={() => updateStatus(item.id, status)}
                                            disabled={busyId === item.id}
                                            style={status === item.status ? styles.statusPillActive : styles.statusPill}
                                        >
                                            <Text style={styles.statusText}>{status}</Text>
                                        </Pressable>
                                    )}
                                />
                                <Pressable onPress={() => deleteOrder(item.id)} style={styles.btnDanger} disabled={busyId === item.id}>
                                    <Text style={styles.btnText}>{busyId === item.id ? '...' : 'Delete'}</Text>
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
    card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 10 },
    cardTitle: { color: '#f8fafc', fontWeight: '700' },
    cardMeta: { color: '#94a3b8', marginTop: 4, fontSize: 12 },
    cardTotal: { color: '#22d3ee', marginTop: 6, fontSize: 15, fontWeight: '700' },
    formCard: { marginHorizontal: 14, marginBottom: 10, backgroundColor: '#111827', borderRadius: 12, padding: 12 },
    draftRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
    input: { backgroundColor: '#1f2937', borderRadius: 8, paddingHorizontal: 10, color: '#f8fafc', minHeight: 40 },
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    inlineActions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10 },
    btnPrimary: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
    btnSecondary: { backgroundColor: '#334155', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
    btnDanger: { backgroundColor: '#7f1d1d', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
    btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    statusPill: { backgroundColor: '#374151', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
    statusPillActive: { backgroundColor: '#4f46e5', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
    statusText: { color: '#fff', fontSize: 10, fontWeight: '600' },
});

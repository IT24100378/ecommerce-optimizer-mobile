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

type PromoForm = {
    campaignName: string;
    type: 'EVENT' | 'CATEGORY' | 'PRODUCT';
    promoCode: string;
    discountPercentage: string;
    startDate: string;
    endDate: string;
    categoryName: string;
    productId: string;
    isActive: boolean;
};

const PROMO_TYPES: Array<PromoForm['type']> = ['EVENT', 'CATEGORY', 'PRODUCT'];

function isoDate(date: Date) {
    return date.toISOString().slice(0, 10);
}

function futureIsoDate(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return isoDate(d);
}

function defaultForm(): PromoForm {
    return {
        campaignName: '',
        type: 'EVENT',
        promoCode: '',
        discountPercentage: '',
        startDate: isoDate(new Date()),
        endDate: futureIsoDate(14),
        categoryName: '',
        productId: '',
        isActive: true,
    };
}

export default function AdminPromotionsScreen() {
    const token = useStorefrontStore((state) => state.user?.token);
    const [rows, setRows] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState('');
    const [form, setForm] = useState<PromoForm>(defaultForm());
    const [previewMessage, setPreviewMessage] = useState('');
    const [testCode, setTestCode] = useState('');
    const [testAmount, setTestAmount] = useState('');
    const [testLoading, setTestLoading] = useState(false);
    const [testError, setTestError] = useState('');
    const [testResult, setTestResult] = useState<any | null>(null);

    const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);

    const fetchRows = useCallback(async () => {
        if (!headers) return;
        setLoading(true);
        try {
            const [promoRes, productRes, categoryRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/promotions`, { headers }),
                axios.get(`${API_BASE_URL}/api/products`),
                axios.get(`${API_BASE_URL}/api/categories`).catch(() => ({ data: [] })),
            ]);
            setRows(Array.isArray(promoRes.data) ? promoRes.data : []);
            setProducts(Array.isArray(productRes.data) ? productRes.data : []);
            setCategories(Array.isArray(categoryRes.data) ? categoryRes.data : []);
        } catch (error: any) {
            Alert.alert('Promotions', error?.response?.data?.error || 'Failed to load promotions');
        } finally {
            setLoading(false);
        }
    }, [headers]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    const openCreate = () => {
        setEditingId('');
        setForm(defaultForm());
        setPreviewMessage('');
        setFormOpen(true);
    };

    const openEdit = (promo: any) => {
        setEditingId(String(promo.id));
        setForm({
            campaignName: String(promo.campaignName || ''),
            type: String(promo.type || 'EVENT') as PromoForm['type'],
            promoCode: String(promo.promoCode || ''),
            discountPercentage: String(promo.discountPercentage ?? ''),
            startDate: String(promo.startDate || '').slice(0, 10),
            endDate: String(promo.endDate || '').slice(0, 10),
            categoryName: String(promo.categoryRef?.name || ''),
            productId: String(promo.productRef?.id || ''),
            isActive: Boolean(promo.isActive),
        });
        setPreviewMessage('');
        setFormOpen(true);
    };

    const buildPayload = () => {
        const discount = Number(form.discountPercentage);
        if (!form.campaignName.trim() || !Number.isFinite(discount) || discount <= 0) {
            throw new Error('Campaign name and valid discount are required.');
        }
        if (!form.startDate || !form.endDate) {
            throw new Error('Start and end dates are required.');
        }
        if (form.type === 'EVENT' && !form.promoCode.trim()) {
            throw new Error('Promo code is required for EVENT promotions.');
        }
        if (form.type === 'CATEGORY' && !form.categoryName.trim()) {
            throw new Error('Category is required for CATEGORY promotions.');
        }
        if (form.type === 'PRODUCT' && !form.productId.trim()) {
            throw new Error('Product is required for PRODUCT promotions.');
        }

        return {
            campaignName: form.campaignName.trim(),
            type: form.type,
            promoCode: form.type === 'EVENT' ? form.promoCode.trim().toUpperCase() : null,
            discountPercentage: discount,
            startDate: form.startDate,
            endDate: form.endDate,
            categoryName: form.type === 'CATEGORY' ? form.categoryName.trim() : null,
            productId: form.type === 'PRODUCT' ? form.productId.trim() : null,
            isActive: form.isActive,
        };
    };

    const previewPromotion = async () => {
        if (!headers) return;
        try {
            const payload = buildPayload();
            const { data } = await axios.post(`${API_BASE_URL}/api/promotions/preview`, {
                ...payload,
                promotionId: editingId || null,
            }, { headers });
            setPreviewMessage(data?.message || (data?.ok ? 'No overlap detected.' : 'Overlap detected.'));
        } catch (error: any) {
            setPreviewMessage(error?.response?.data?.error || error?.message || 'Preview failed');
        }
    };

    const savePromotion = async () => {
        if (!headers) return;
        setSaving(true);
        try {
            const payload = buildPayload();
            if (editingId) {
                await axios.put(`${API_BASE_URL}/api/promotions/${editingId}`, payload, { headers });
            } else {
                await axios.post(`${API_BASE_URL}/api/promotions`, payload, { headers });
            }
            setFormOpen(false);
            setEditingId('');
            setForm(defaultForm());
            setPreviewMessage('');
            await fetchRows();
        } catch (error: any) {
            Alert.alert('Promotions', error?.response?.data?.error || error?.message || 'Failed to save promotion');
        } finally {
            setSaving(false);
        }
    };

    const deletePromotion = (id: string) => {
        if (!headers) return;
        Alert.alert('Delete Promotion', 'Delete this promotion?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await axios.delete(`${API_BASE_URL}/api/promotions/${id}`, { headers });
                        await fetchRows();
                    } catch (error: any) {
                        Alert.alert('Promotions', error?.response?.data?.error || 'Failed to delete promotion');
                    }
                },
            },
        ]);
    };

    const runPromoTest = async () => {
        const promoCode = testCode.trim().toUpperCase();
        const originalPrice = Number(testAmount);
        if (!promoCode) {
            setTestError('Promo code is required.');
            setTestResult(null);
            return;
        }
        if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
            setTestError('Amount must be a valid number greater than 0.');
            setTestResult(null);
            return;
        }
        setTestLoading(true);
        setTestError('');
        setTestResult(null);
        try {
            const { data } = await axios.post(`${API_BASE_URL}/api/promotions/apply`, {
                promoCode,
                originalPrice,
            });
            setTestResult(data);
        } catch (error: any) {
            setTestError(error?.response?.data?.error || 'Failed to apply promo code.');
        } finally {
            setTestLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Admin Promotions</Text>
                <View style={styles.headerActions}>
                    <Pressable style={styles.primaryBtn} onPress={() => (formOpen ? setFormOpen(false) : openCreate())}>
                        <Text style={styles.btnText}>{formOpen ? 'Close' : 'New'}</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryBtn} onPress={fetchRows}>
                        <Text style={styles.btnText}>Refresh</Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.testerCard}>
                <Text style={styles.formTitle}>Promo Code Tester</Text>
                <Text style={styles.testerHint}>Validate a code against a sample order amount.</Text>
                <View style={styles.row}>
                    <TextInput
                        value={testCode}
                        onChangeText={setTestCode}
                        placeholder="Promo code"
                        placeholderTextColor="#64748b"
                        autoCapitalize="characters"
                        style={[styles.input, styles.flex]}
                    />
                    <TextInput
                        value={testAmount}
                        onChangeText={setTestAmount}
                        placeholder="Amount"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        style={[styles.input, styles.flex]}
                    />
                </View>
                <Pressable style={styles.primaryBtn} onPress={runPromoTest} disabled={testLoading}>
                    <Text style={styles.btnText}>{testLoading ? 'Applying...' : 'Apply Code'}</Text>
                </Pressable>
                {testError ? <Text style={styles.errorText}>{testError}</Text> : null}
                {testResult ? (
                    <View style={styles.testResultCard}>
                        <Text style={styles.testResultText}>Original: ${Number(testResult.originalPrice ?? 0).toFixed(2)}</Text>
                        <Text style={styles.testResultText}>Discount: -${Number(testResult.discount ?? 0).toFixed(2)} ({Number(testResult.discountPercentage ?? 0)}%)</Text>
                        <Text style={styles.testResultTotal}>Final: ${Number(testResult.discountedPrice ?? 0).toFixed(2)}</Text>
                    </View>
                ) : null}
            </View>

            {formOpen && (
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>{editingId ? 'Edit Promotion' : 'Create Promotion'}</Text>
                    <TextInput value={form.campaignName} onChangeText={(value) => setForm((prev) => ({ ...prev, campaignName: value }))} placeholder="Campaign Name" placeholderTextColor="#64748b" style={styles.input} />
                    <FlatList
                        horizontal
                        data={PROMO_TYPES}
                        keyExtractor={(item) => item}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <Pressable onPress={() => setForm((prev) => ({ ...prev, type: item }))} style={form.type === item ? styles.pillActive : styles.pill}>
                                <Text style={styles.pillText}>{item}</Text>
                            </Pressable>
                        )}
                    />

                    {form.type === 'EVENT' ? (
                        <TextInput value={form.promoCode} onChangeText={(value) => setForm((prev) => ({ ...prev, promoCode: value }))} placeholder="Promo Code" placeholderTextColor="#64748b" style={styles.input} autoCapitalize="characters" />
                    ) : null}
                    {form.type === 'CATEGORY' ? (
                        <FlatList
                            horizontal
                            data={categories}
                            keyExtractor={(item) => item}
                            showsHorizontalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <Pressable onPress={() => setForm((prev) => ({ ...prev, categoryName: item }))} style={form.categoryName === item ? styles.pillActive : styles.pill}>
                                    <Text style={styles.pillText}>{item}</Text>
                                </Pressable>
                            )}
                        />
                    ) : null}
                    {form.type === 'PRODUCT' ? (
                        <FlatList
                            horizontal
                            data={products}
                            keyExtractor={(item) => String(item.id)}
                            showsHorizontalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <Pressable onPress={() => setForm((prev) => ({ ...prev, productId: String(item.id) }))} style={form.productId === String(item.id) ? styles.pillActive : styles.pill}>
                                    <Text style={styles.pillText}>{item.name}</Text>
                                </Pressable>
                            )}
                        />
                    ) : null}

                    <TextInput value={form.discountPercentage} onChangeText={(value) => setForm((prev) => ({ ...prev, discountPercentage: value }))} placeholder="Discount %" placeholderTextColor="#64748b" keyboardType="numeric" style={styles.input} />
                    <View style={styles.row}>
                        <TextInput value={form.startDate} onChangeText={(value) => setForm((prev) => ({ ...prev, startDate: value }))} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" style={[styles.input, styles.flex]} />
                        <TextInput value={form.endDate} onChangeText={(value) => setForm((prev) => ({ ...prev, endDate: value }))} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" style={[styles.input, styles.flex]} />
                    </View>
                    <View style={styles.row}>
                        <Pressable style={styles.secondaryBtn} onPress={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}>
                            <Text style={styles.btnText}>{form.isActive ? 'Active' : 'Inactive'}</Text>
                        </Pressable>
                        <Pressable style={styles.secondaryBtn} onPress={previewPromotion}>
                            <Text style={styles.btnText}>Preview</Text>
                        </Pressable>
                        <Pressable style={styles.primaryBtn} onPress={savePromotion} disabled={saving}>
                            <Text style={styles.btnText}>{saving ? 'Saving...' : 'Save'}</Text>
                        </Pressable>
                    </View>
                    {previewMessage ? <Text style={styles.previewText}>{previewMessage}</Text> : null}
                </View>
            )}

            {loading ? (
                <ActivityIndicator color="#2563eb" style={styles.loader} />
            ) : (
                <FlatList
                    data={rows}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>{item.campaignName}</Text>
                            <Text style={styles.meta}>
                                {item.type} • {item.discountPercentage}% • {item.promoCode || (item.categoryRef?.name || item.productRef?.name || 'N/A')}
                            </Text>
                            <Text style={styles.meta}>{String(item.startDate).slice(0, 10)} to {String(item.endDate).slice(0, 10)}</Text>
                            <View style={styles.row}>
                                <Pressable style={styles.secondaryBtn} onPress={() => openEdit(item)}>
                                    <Text style={styles.btnText}>Edit</Text>
                                </Pressable>
                                <Pressable style={styles.dangerBtn} onPress={() => deletePromotion(item.id)}>
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
    testerCard: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginHorizontal: 14, marginBottom: 10 },
    formTitle: { color: '#f8fafc', fontWeight: '700', marginBottom: 8 },
    testerHint: { color: '#94a3b8', fontSize: 12, marginBottom: 8 },
    card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 10 },
    cardTitle: { color: '#f8fafc', fontWeight: '700' },
    meta: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
    input: { backgroundColor: '#1f2937', color: '#fff', borderRadius: 8, minHeight: 40, paddingHorizontal: 10, marginTop: 8 },
    row: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
    flex: { flex: 1 },
    pill: { backgroundColor: '#334155', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8, marginTop: 8 },
    pillActive: { backgroundColor: '#2563eb', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8, marginTop: 8 },
    pillText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    primaryBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
    secondaryBtn: { backgroundColor: '#334155', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
    dangerBtn: { backgroundColor: '#7f1d1d', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
    btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    previewText: { color: '#cbd5e1', fontSize: 12, marginTop: 8 },
    errorText: { color: '#f87171', fontSize: 12, marginTop: 8 },
    testResultCard: { marginTop: 8, borderRadius: 8, backgroundColor: '#0f172a', padding: 10, borderWidth: 1, borderColor: '#1f2937' },
    testResultText: { color: '#cbd5e1', fontSize: 12, marginBottom: 4 },
    testResultTotal: { color: '#22d3ee', fontSize: 14, fontWeight: '700' },
});

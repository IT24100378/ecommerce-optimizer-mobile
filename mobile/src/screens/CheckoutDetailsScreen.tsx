import React, { useMemo, useState } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStorefrontStore } from '../storefront/store';

function formatPrice(value: number) {
    if (!Number.isFinite(value)) return '$0.00';
    return `$${value.toFixed(2)}`;
}

export default function CheckoutDetailsScreen() {
    const navigation = useNavigation();
    const { cartItems, promoResult, user } = useStorefrontStore();
    const [form, setForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        address: user?.address || '',
        phone: user?.phone || '',
    });
    const [error, setError] = useState('');

    const subtotal = useMemo(() => (
        cartItems.reduce((sum, item) => {
            const price = Number(item.effectivePrice ?? item.basePrice ?? (item as any).price ?? 0);
            return sum + price * item.qty;
        }, 0)
    ), [cartItems]);

    const total = promoResult?.discountedPrice ?? subtotal;

    const handleContinue = () => {
        if (!form.name.trim() || !form.email.trim() || !form.address.trim()) {
            setError('Name, email, and address are required.');
            return;
        }
        setError('');
        navigation.navigate('CheckoutPayment' as never, { customer: form } as never);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <Pressable
                        android_ripple={{ color: '#ccc' }}
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Text style={styles.backButtonText}>Back</Text>
                    </Pressable>
                    <Text style={styles.title}>Checkout Details</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <Text style={styles.sectionTitle}>Customer Info</Text>
                <View style={styles.formCard}>
                    <TextInput
                        value={form.name}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
                        placeholder="Full name"
                        placeholderTextColor="#94a3b8"
                        style={styles.input}
                    />
                    <TextInput
                        value={form.email}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
                        placeholder="Email address"
                        placeholderTextColor="#94a3b8"
                        style={styles.input}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <TextInput
                        value={form.phone}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                        placeholder="Phone (optional)"
                        placeholderTextColor="#94a3b8"
                        style={styles.input}
                        keyboardType="phone-pad"
                    />
                    <TextInput
                        value={form.address}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, address: value }))}
                        placeholder="Delivery address"
                        placeholderTextColor="#94a3b8"
                        style={styles.input}
                        multiline
                    />
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>

                <Text style={styles.sectionTitle}>Order Summary</Text>
                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Subtotal</Text>
                        <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
                    </View>
                    {promoResult && (
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Promo discount</Text>
                            <Text style={styles.summaryDiscount}>-{formatPrice(promoResult.discount)}</Text>
                        </View>
                    )}
                    <View style={styles.summaryRowTotal}>
                        <Text style={styles.summaryTotalLabel}>Total</Text>
                        <Text style={styles.summaryTotalValue}>{formatPrice(total)}</Text>
                    </View>
                </View>

                <Pressable
                    android_ripple={{ color: '#ccc' }}
                    onPress={handleContinue}
                    style={styles.continueButton}
                >
                    <Text style={styles.continueButtonText}>Continue to Payment</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b0f1a',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerSpacer: {
        width: 52,
    },
    title: {
        color: '#f8fafc',
        fontSize: 18,
        fontWeight: '700',
    },
    backButton: {
        backgroundColor: '#1f2937',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minHeight: 48,
        minWidth: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButtonText: {
        color: '#e2e8f0',
        fontWeight: '600',
        fontSize: 12,
    },
    sectionTitle: {
        color: '#f8fafc',
        fontSize: 16,
        fontWeight: '700',
        marginTop: 12,
        marginBottom: 8,
    },
    formCard: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },
    input: {
        backgroundColor: '#0f172a',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#f8fafc',
        borderWidth: 1,
        borderColor: '#1f2937',
        minHeight: 48,
    },
    errorText: {
        color: '#f87171',
        fontSize: 12,
    },
    summaryCard: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryRowTotal: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 4,
    },
    summaryLabel: {
        color: '#94a3b8',
        fontSize: 13,
    },
    summaryValue: {
        color: '#e2e8f0',
        fontSize: 13,
        fontWeight: '600',
    },
    summaryDiscount: {
        color: '#22c55e',
        fontSize: 13,
        fontWeight: '700',
    },
    summaryTotalLabel: {
        color: '#f8fafc',
        fontSize: 14,
        fontWeight: '700',
    },
    summaryTotalValue: {
        color: '#22d3ee',
        fontSize: 18,
        fontWeight: '700',
    },
    continueButton: {
        marginTop: 16,
        backgroundColor: '#2563eb',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        elevation: 3,
    },
    continueButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 15,
    },
});


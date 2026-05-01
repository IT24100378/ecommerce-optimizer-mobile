import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Animated,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useStorefrontStore } from '../storefront/store';

function formatPrice(value: number) {
    if (!Number.isFinite(value)) return '$0.00';
    return `$${value.toFixed(2)}`;
}

function formatCard(value: string) {
    return value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
}

function formatExpiry(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}` : digits;
}

export default function CheckoutPaymentScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const { cartItems, promoResult, checkoutLoading, checkoutError, placeOrder } = useStorefrontStore();
    const customer = (route.params as { customer?: { name: string; email: string; address: string; phone?: string } })?.customer;
    const [payment, setPayment] = useState({ cardNumber: '', expiry: '', cvv: '', name: '' });
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const subtotal = useMemo(() => (
        cartItems.reduce((sum, item) => {
            const price = Number(item.effectivePrice ?? item.basePrice ?? (item as any).price ?? 0);
            return sum + price * item.qty;
        }, 0)
    ), [cartItems]);

    const total = promoResult?.discountedPrice ?? subtotal;

    const handlePay = async () => {
        if (!customer?.name || !customer?.email || !customer?.address) {
            setLocalError('Missing customer details.');
            return;
        }
        if (!payment.cardNumber || !payment.expiry || !payment.cvv || !payment.name) {
            setLocalError('Please enter complete payment details.');
            return;
        }
        setLocalError('');
        const order = await placeOrder(customer);
        if (order) {
            navigation.navigate('CheckoutSuccess' as never);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                <View style={styles.header}>
                    <Pressable
                        android_ripple={{ color: '#ccc' }}
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Text style={styles.backButtonText}>Back</Text>
                    </Pressable>
                    <Text style={styles.title}>Payment</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <View style={styles.cardPreview}>
                    <Text style={styles.previewLabel}>CARD PREVIEW</Text>
                    <Text style={styles.previewNumber}>{payment.cardNumber || '•••• •••• •••• ••••'}</Text>
                    <View style={styles.previewRow}>
                        <View>
                            <Text style={styles.previewMetaLabel}>CARD HOLDER</Text>
                            <Text style={styles.previewMetaValue}>{payment.name || 'YOUR NAME'}</Text>
                        </View>
                        <View>
                            <Text style={styles.previewMetaLabel}>EXPIRES</Text>
                            <Text style={styles.previewMetaValue}>{payment.expiry || 'MM/YY'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.formCard}>
                    <TextInput
                        value={payment.cardNumber}
                        onChangeText={(value) => setPayment((prev) => ({ ...prev, cardNumber: formatCard(value) }))}
                        placeholder="Card number"
                        placeholderTextColor="#94a3b8"
                        style={styles.input}
                        keyboardType="numeric"
                        maxLength={19}
                    />
                    <TextInput
                        value={payment.name}
                        onChangeText={(value) => setPayment((prev) => ({ ...prev, name: value }))}
                        placeholder="Name on card"
                        placeholderTextColor="#94a3b8"
                        style={styles.input}
                    />
                    <View style={styles.row}>
                        <TextInput
                            value={payment.expiry}
                            onChangeText={(value) => setPayment((prev) => ({ ...prev, expiry: formatExpiry(value) }))}
                            placeholder="MM/YY"
                            placeholderTextColor="#94a3b8"
                            style={[styles.input, styles.halfInput]}
                            keyboardType="numeric"
                            maxLength={5}
                        />
                        <TextInput
                            value={payment.cvv}
                            onChangeText={(value) => setPayment((prev) => ({ ...prev, cvv: value.replace(/\D/g, '').slice(0, 3) }))}
                            placeholder="CVV"
                            placeholderTextColor="#94a3b8"
                            style={[styles.input, styles.halfInput]}
                            keyboardType="numeric"
                            maxLength={3}
                            secureTextEntry
                        />
                    </View>
                    {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
                    {checkoutError ? <Text style={styles.errorText}>{checkoutError}</Text> : null}
                </View>

                <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Order total</Text>
                        <Text style={styles.summaryValue}>{formatPrice(total)}</Text>
                    </View>
                    <Pressable
                        android_ripple={{ color: '#ccc' }}
                        onPress={handlePay}
                        style={styles.payButton}
                        disabled={checkoutLoading}
                    >
                        {checkoutLoading ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                            <Text style={styles.payButtonText}>Pay {formatPrice(total)}</Text>
                        )}
                    </Pressable>
                </View>
            </Animated.View>
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
    cardPreview: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1f2937',
    },
    previewLabel: {
        color: '#22d3ee',
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 10,
    },
    previewNumber: {
        color: '#f8fafc',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 14,
    },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    previewMetaLabel: {
        color: '#64748b',
        fontSize: 10,
    },
    previewMetaValue: {
        color: '#e2e8f0',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
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
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfInput: {
        flex: 1,
    },
    errorText: {
        color: '#f87171',
        fontSize: 12,
    },
    summaryCard: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    summaryLabel: {
        color: '#94a3b8',
        fontSize: 13,
    },
    summaryValue: {
        color: '#22d3ee',
        fontSize: 18,
        fontWeight: '700',
    },
    payButton: {
        backgroundColor: '#22c55e',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        elevation: 3,
    },
    payButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 15,
    },
});


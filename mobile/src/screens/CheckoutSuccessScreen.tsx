import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useStorefrontStore } from '../storefront/store';

function formatPrice(value: number) {
    if (!Number.isFinite(value)) return '$0.00';
    return `$${value.toFixed(2)}`;
}

export default function CheckoutSuccessScreen() {
    const navigation = useNavigation();
    const { lastOrder } = useStorefrontStore();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>✓</Text>
                </View>
                <Text style={styles.title}>Order Placed!</Text>
                <Text style={styles.subtitle}>Your order has been confirmed.</Text>
                {lastOrder && (
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Order ID</Text>
                        <Text style={styles.summaryValue}>{lastOrder.id}</Text>
                        <Text style={styles.summaryLabel}>Total</Text>
                        <Text style={styles.summaryValue}>
                            {formatPrice(lastOrder.discountedTotal ?? lastOrder.totalAmount ?? 0)}
                        </Text>
                    </View>
                )}
                <Pressable
                    android_ripple={{ color: '#ccc' }}
                    onPress={() => navigation.navigate('Storefront' as never)}
                    style={styles.continueButton}
                >
                    <Text style={styles.continueButtonText}>Continue Shopping</Text>
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
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    badge: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(34,197,94,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    badgeText: {
        color: '#22c55e',
        fontSize: 28,
        fontWeight: '700',
    },
    title: {
        color: '#f8fafc',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        color: '#94a3b8',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
    },
    summaryCard: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        width: '100%',
        marginBottom: 16,
    },
    summaryLabel: {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 4,
    },
    summaryValue: {
        color: '#f8fafc',
        fontSize: 14,
        fontWeight: '600',
    },
    continueButton: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 24,
        minHeight: 48,
        minWidth: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueButtonText: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 15,
    },
});


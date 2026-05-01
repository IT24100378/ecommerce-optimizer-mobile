import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API_BASE_URL, useStorefrontStore } from '../storefront/store';

export default function AdminDashboardScreen() {
    const navigation = useNavigation<any>();
    const token = useStorefrontStore((state) => state.user?.token);
    const [stats, setStats] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const modules = [
        { key: 'products', label: 'Products', route: 'AdminProducts' },
        { key: 'orders', label: 'Orders', route: 'AdminOrders' },
        { key: 'inventory', label: 'Inventory', route: 'AdminInventory' },
        { key: 'promotions', label: 'Promotions', route: 'AdminPromotions' },
        { key: 'users', label: 'Users', route: 'AdminUsers' },
        { key: 'forecasts', label: 'Forecasts', route: 'AdminForecast' },
        { key: 'reviews', label: 'Reviews', route: 'AdminReviews' },
    ];

    const fetchStats = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const [products, orders, inventory, promotions, users, forecasts, reviews] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/products`),
                axios.get(`${API_BASE_URL}/api/orders`, { headers }),
                axios.get(`${API_BASE_URL}/api/inventory`, { headers }),
                axios.get(`${API_BASE_URL}/api/promotions`, { headers }),
                axios.get(`${API_BASE_URL}/api/users`, { headers }),
                axios.get(`${API_BASE_URL}/api/forecasts`, { headers }),
                axios.get(`${API_BASE_URL}/api/reviews?adminView=true`, { headers }),
            ]);
            setStats({
                products: Array.isArray(products.data) ? products.data.length : 0,
                orders: Array.isArray(orders.data) ? orders.data.length : 0,
                inventory: Array.isArray(inventory.data) ? inventory.data.length : 0,
                promotions: Array.isArray(promotions.data) ? promotions.data.length : 0,
                users: Array.isArray(users.data) ? users.data.length : 0,
                forecasts: Array.isArray(forecasts.data) ? forecasts.data.length : 0,
                reviews: Array.isArray(reviews.data) ? reviews.data.length : 0,
            });
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.title}>Admin Dashboard</Text>
                        <Text style={styles.subtitle}>Manage all storefront modules from here.</Text>
                    </View>
                    <Pressable style={styles.refreshBtn} onPress={fetchStats}>
                        <Text style={styles.refreshText}>Refresh</Text>
                    </Pressable>
                </View>
                {loading ? <ActivityIndicator color="#2563eb" style={styles.loader} /> : null}
                {modules.map((module) => (
                    <Pressable
                        key={module.route}
                        onPress={() => navigation.navigate(module.route)}
                        style={styles.card}
                    >
                        <Text style={styles.cardText}>{module.label}</Text>
                        <Text style={styles.cardValue}>{stats[module.key] ?? 0}</Text>
                    </Pressable>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b0f1a',
    },
    content: {
        padding: 24,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    refreshBtn: {
        backgroundColor: '#1f2937',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    refreshText: {
        color: '#f8fafc',
        fontSize: 12,
        fontWeight: '600',
    },
    loader: {
        marginTop: 12,
        marginBottom: 8,
    },
    title: {
        color: '#f8fafc',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 6,
    },
    subtitle: {
        color: '#94a3b8',
        fontSize: 13,
        marginBottom: 18,
    },
    card: {
        backgroundColor: '#111827',
        borderWidth: 1,
        borderColor: '#1f2937',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardText: {
        color: '#f8fafc',
        fontWeight: '600',
        fontSize: 15,
    },
    cardValue: {
        color: '#22d3ee',
        fontWeight: '700',
        fontSize: 15,
    },
});


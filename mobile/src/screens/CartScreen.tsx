import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
	ActivityIndicator,
	Alert,
	Animated,
	FlatList,
	Image,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CartItem, useStorefrontStore } from '../storefront/store';

function formatPrice(value: number) {
	if (!Number.isFinite(value)) return '$0.00';
	return `$${value.toFixed(2)}`;
}

export default function CartScreen() {
	const navigation = useNavigation();
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const {
		cartItems,
		updateQty,
		removeFromCart,
		clearCart,
		promoCode,
		promoResult,
		promoLoading,
		promoError,
		applyPromo,
		clearPromo,
	} = useStorefrontStore();
	const [promoInput, setPromoInput] = useState(promoCode);

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

	const handleApplyPromo = () => {
		applyPromo(promoInput);
	};

	const handleCheckout = () => {
		if (!cartItems.length) return;
		navigation.navigate('CheckoutDetails' as never);
	};

	const increaseQty = (item: CartItem) => {
		const availableStock = Number(item.availableStock ?? item.stockQuantity ?? 0);
		if (item.qty >= availableStock) {
			Alert.alert('Stock limit reached', `${item.name || 'This item'} has only ${availableStock} in stock.`);
			return;
		}
		updateQty(item.id, item.qty + 1);
	};

	const renderItem = ({ item }: { item: CartItem }) => (
		<View style={styles.cartItem}>
			{item.imageUrl ? (
				<Image source={{ uri: item.imageUrl }} style={styles.cartItemImage} />
			) : (
				<View style={styles.cartItemImageFallback}>
					<Text style={styles.cartItemFallbackText}>No Image</Text>
				</View>
			)}
			<View style={styles.cartItemInfo}>
				<Text style={styles.cartItemTitle} numberOfLines={1}>{item.name}</Text>
				<Text style={styles.cartItemPrice}>
					{formatPrice(Number(item.effectivePrice ?? item.basePrice ?? (item as any).price ?? 0))}
				</Text>
				<View style={styles.cartItemControls}>
					<Pressable
						android_ripple={{ color: '#ccc' }}
						onPress={() => updateQty(item.id, item.qty - 1)}
						style={styles.qtyButton}
					>
						<Text style={styles.qtyText}>-</Text>
					</Pressable>
					<Text style={styles.qtyValue}>{item.qty}</Text>
					<Pressable
						android_ripple={{ color: '#ccc' }}
						onPress={() => increaseQty(item)}
						style={styles.qtyButton}
					>
						<Text style={styles.qtyText}>+</Text>
					</Pressable>
					<Pressable
						android_ripple={{ color: '#ccc' }}
						onPress={() => removeFromCart(item.id)}
						style={styles.removeButton}
					>
						<Text style={styles.removeText}>Remove</Text>
					</Pressable>
				</View>
			</View>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<Animated.View style={[styles.content, { opacity: fadeAnim }]}>
				<FlatList
					data={cartItems}
					keyExtractor={(item) => item.id}
					renderItem={renderItem}
					contentContainerStyle={styles.listContent}
					ListHeaderComponent={(
						<View style={styles.header}>
							<View>
								<Text style={styles.title}>Your Cart</Text>
								<Text style={styles.subtitle}>Review items and apply promo codes</Text>
							</View>
							{cartItems.length > 0 && (
								<Pressable
									android_ripple={{ color: '#ccc' }}
									onPress={clearCart}
									style={styles.clearButton}
								>
									<Text style={styles.clearButtonText}>Clear</Text>
								</Pressable>
							)}
						</View>
					)}
					ListEmptyComponent={(
						<View style={styles.emptyState}>
							<Text style={styles.emptyTitle}>Your cart is empty</Text>
							<Text style={styles.emptySubtitle}>Add products from the Storefront tab.</Text>
						</View>
					)}
					ListFooterComponent={(
						<View style={styles.footer}>
							<View style={styles.promoCard}>
								<Text style={styles.sectionTitle}>Promo Code</Text>
								<View style={styles.promoRow}>
									<TextInput
										value={promoInput}
										onChangeText={setPromoInput}
										placeholder="Enter code"
										placeholderTextColor="#94a3b8"
										style={styles.promoInput}
										autoCapitalize="characters"
									/>
									<Pressable
										android_ripple={{ color: '#ccc' }}
										onPress={handleApplyPromo}
										style={styles.applyButton}
										disabled={promoLoading}
									>
										{promoLoading ? (
											<ActivityIndicator size="small" color="#ffffff" />
										) : (
											<Text style={styles.applyButtonText}>Apply</Text>
										)}
									</Pressable>
								</View>
								{promoResult && (
									<Text style={styles.promoSuccess}>
										-{formatPrice(promoResult.discount)} saved with {promoResult.discountPercentage}% off
									</Text>
								)}
								{promoError ? <Text style={styles.promoError}>{promoError}</Text> : null}
								{promoResult && (
									<Pressable
										android_ripple={{ color: '#ccc' }}
										onPress={clearPromo}
										style={styles.clearPromoButton}
									>
										<Text style={styles.clearPromoText}>Remove promo</Text>
									</Pressable>
								)}
							</View>
							<View style={styles.summaryCard}>
								<Text style={styles.sectionTitle}>Summary</Text>
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
								<Pressable
									android_ripple={{ color: '#ccc' }}
									onPress={handleCheckout}
									style={cartItems.length ? styles.checkoutButton : styles.checkoutButtonDisabled}
									disabled={!cartItems.length}
								>
									<Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
								</Pressable>
							</View>
						</View>
					)}
				/>
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
	},
	listContent: {
		padding: 16,
		paddingBottom: 140,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 16,
	},
	title: {
		color: '#f8fafc',
		fontSize: 22,
		fontWeight: '700',
	},
	subtitle: {
		color: '#94a3b8',
		fontSize: 13,
		marginTop: 4,
	},
	clearButton: {
		backgroundColor: '#1f2937',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 10,
		minHeight: 48,
		minWidth: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	clearButtonText: {
		color: '#e2e8f0',
		fontWeight: '600',
		fontSize: 12,
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyTitle: {
		color: '#f8fafc',
		fontSize: 16,
		fontWeight: '700',
	},
	emptySubtitle: {
		color: '#94a3b8',
		marginTop: 6,
		fontSize: 13,
	},
	cartItem: {
		flexDirection: 'row',
		backgroundColor: '#111827',
		borderRadius: 12,
		padding: 12,
		marginBottom: 12,
		elevation: 2,
	},
	cartItemImage: {
		width: 60,
		height: 60,
		borderRadius: 10,
		marginRight: 12,
	},
	cartItemImageFallback: {
		width: 60,
		height: 60,
		borderRadius: 10,
		marginRight: 12,
		backgroundColor: '#1f2937',
		alignItems: 'center',
		justifyContent: 'center',
	},
	cartItemFallbackText: {
		color: '#64748b',
		fontSize: 10,
	},
	cartItemInfo: {
		flex: 1,
	},
	cartItemTitle: {
		color: '#f8fafc',
		fontSize: 14,
		fontWeight: '600',
	},
	cartItemPrice: {
		color: '#22d3ee',
		marginTop: 4,
		fontWeight: '700',
	},
	cartItemControls: {
		marginTop: 8,
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 8,
	},
	qtyButton: {
		backgroundColor: '#1f2937',
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 8,
		minHeight: 48,
		minWidth: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	qtyText: {
		color: '#f8fafc',
		fontSize: 14,
		fontWeight: '700',
	},
	qtyValue: {
		color: '#f8fafc',
		fontSize: 14,
		fontWeight: '700',
		paddingHorizontal: 8,
		minWidth: 32,
		textAlign: 'center',
	},
	removeButton: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		minHeight: 48,
		minWidth: 48,
		justifyContent: 'center',
	},
	removeText: {
		color: '#f87171',
		fontSize: 12,
		fontWeight: '700',
	},
	footer: {
		marginTop: 16,
	},
	promoCard: {
		backgroundColor: '#111827',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
	},
	sectionTitle: {
		color: '#f8fafc',
		fontSize: 16,
		fontWeight: '700',
		marginBottom: 10,
	},
	promoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	promoInput: {
		flex: 1,
		backgroundColor: '#0f172a',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		color: '#f8fafc',
		borderWidth: 1,
		borderColor: '#1f2937',
		minHeight: 48,
	},
	applyButton: {
		backgroundColor: '#2563eb',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 10,
		minHeight: 48,
		minWidth: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	applyButtonText: {
		color: '#ffffff',
		fontWeight: '700',
		fontSize: 12,
	},
	promoSuccess: {
		color: '#22c55e',
		fontSize: 12,
		marginTop: 8,
	},
	promoError: {
		color: '#f87171',
		fontSize: 12,
		marginTop: 6,
	},
	clearPromoButton: {
		marginTop: 8,
		alignSelf: 'flex-start',
	},
	clearPromoText: {
		color: '#94a3b8',
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
		marginBottom: 12,
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
	checkoutButton: {
		backgroundColor: '#22c55e',
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 48,
		elevation: 3,
	},
	checkoutButtonDisabled: {
		backgroundColor: '#334155',
		borderRadius: 12,
		paddingVertical: 14,
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 48,
	},
	checkoutButtonText: {
		color: '#ffffff',
		fontWeight: '700',
		fontSize: 15,
	},
});


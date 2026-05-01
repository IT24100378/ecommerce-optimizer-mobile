import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Animated,
	Image,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import { API_BASE_URL, getProductId, Product, useStorefrontStore } from '../storefront/store';

function formatPrice(value: number) {
	if (!Number.isFinite(value)) return '$0.00';
	return `$${value.toFixed(2)}`;
}

function StarRow({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
	return (
		<View style={styles.starRow}>
			{[1, 2, 3, 4, 5].map((star) => (
				<Pressable key={star} onPress={() => onChange?.(star)} disabled={readonly}>
					<Text style={star <= value ? styles.starActive : styles.starInactive}>★</Text>
				</Pressable>
			))}
		</View>
	);
}

export default function ProductDetailScreen() {
	const navigation = useNavigation();
	const route = useRoute();
	const { addToCart, user, cartItems } = useStorefrontStore();
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const routeParams = route.params as { product?: Product; productId?: string | number } | undefined;
	const [product, setProduct] = useState<Product | null>(routeParams?.product ?? null);
	const [productLoading, setProductLoading] = useState(!routeParams?.product && Boolean(routeParams?.productId));
	const [productError, setProductError] = useState('');
	const [reviews, setReviews] = useState<any[]>([]);
	const [loadingReviews, setLoadingReviews] = useState(true);
	const [canReviewData, setCanReviewData] = useState<any>(null);
	const [editing, setEditing] = useState(false);
	const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
	const [reviewError, setReviewError] = useState('');
	const [saving, setSaving] = useState(false);

	const headers = useMemo(() => (user?.token ? { Authorization: `Bearer ${user.token}` } : undefined), [user?.token]);

	useEffect(() => {
		Animated.timing(fadeAnim, {
			toValue: 1,
			duration: 240,
			useNativeDriver: true,
		}).start();
	}, [fadeAnim]);

	useEffect(() => {
		const directProduct = routeParams?.product ?? null;
		const deepLinkedProductId = String(routeParams?.productId ?? '').trim();

		if (directProduct) {
			setProduct(directProduct);
			setProductLoading(false);
			setProductError('');
			return;
		}

		if (!deepLinkedProductId) {
			setProduct(null);
			setProductLoading(false);
			setProductError('Product not found.');
			return;
		}

		let active = true;
		setProductLoading(true);
		setProductError('');
		setProduct(null);

		axios.get(`${API_BASE_URL}/api/products/${deepLinkedProductId}`)
			.then(({ data }) => {
				if (!active) return;
				setProduct(data ?? null);
				setProductError(data ? '' : 'Product not found.');
			})
			.catch(() => {
				if (!active) return;
				setProduct(null);
				setProductError('Product not found or unavailable.');
			})
			.finally(() => {
				if (active) setProductLoading(false);
			});

		return () => {
			active = false;
		};
	}, [routeParams?.product, routeParams?.productId]);

	const fetchReviews = useCallback(async () => {
		if (!product?.id) return;
		setLoadingReviews(true);
		try {
			const { data } = await axios.get(`${API_BASE_URL}/api/reviews`, {
				params: { productId: String(product.id) },
			});
			setReviews(Array.isArray(data) ? data : []);
		} finally {
			setLoadingReviews(false);
		}
	}, [product?.id]);

	const fetchCanReview = useCallback(async () => {
		if (!headers || !product?.id) {
			setCanReviewData(null);
			return;
		}
		try {
			const { data } = await axios.get(`${API_BASE_URL}/api/reviews/can-review`, {
				headers,
				params: { productId: String(product.id) },
			});
			setCanReviewData(data);
			if (data?.existingReview) {
				setReviewForm({
					rating: Number(data.existingReview.rating || 0),
					comment: String(data.existingReview.comment || ''),
				});
			}
		} catch {
			setCanReviewData(null);
		}
	}, [headers, product?.id]);

	useEffect(() => {
		fetchReviews();
		fetchCanReview();
	}, [fetchReviews, fetchCanReview]);

	if (productLoading) {
		return (
			<SafeAreaView style={styles.centered}>
				<ActivityIndicator size="large" color="#2563eb" />
				<Text style={styles.loadingText}>Loading product...</Text>
			</SafeAreaView>
		);
	}

	if (!product) {
		return (
			<SafeAreaView style={styles.centered}>
				<Text style={styles.errorText}>{productError || 'Product not available.'}</Text>
				<Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
					<Text style={styles.backButtonText}>Back</Text>
				</Pressable>
			</SafeAreaView>
		);
	}

	const submitReview = async () => {
		if (!headers) {
			Alert.alert('Reviews', 'Please sign in to write a review.');
			return;
		}
		if (reviewForm.rating < 1 || reviewForm.rating > 5) {
			setReviewError('Select a rating between 1 and 5.');
			return;
		}
		setSaving(true);
		setReviewError('');
		try {
			if (editing && canReviewData?.existingReview?.id) {
				await axios.put(`${API_BASE_URL}/api/reviews/${canReviewData.existingReview.id}`, {
					rating: reviewForm.rating,
					comment: reviewForm.comment,
				}, { headers });
			} else {
				await axios.post(`${API_BASE_URL}/api/reviews`, {
					productId: String(product.id),
					rating: reviewForm.rating,
					comment: reviewForm.comment,
				}, { headers });
			}
			setEditing(false);
			await Promise.all([fetchReviews(), fetchCanReview()]);
		} catch (error: any) {
			setReviewError(error?.response?.data?.error || 'Failed to submit review');
		} finally {
			setSaving(false);
		}
	};

	const deleteReview = async () => {
		if (!headers || !canReviewData?.existingReview?.id) return;
		try {
			await axios.delete(`${API_BASE_URL}/api/reviews/${canReviewData.existingReview.id}`, { headers });
			setEditing(false);
			setReviewForm({ rating: 0, comment: '' });
			await Promise.all([fetchReviews(), fetchCanReview()]);
		} catch (error: any) {
			Alert.alert('Reviews', error?.response?.data?.error || 'Failed to delete review');
		}
	};

	const stockValue = Number(product.availableStock ?? product.stockQuantity ?? 0);
	const effectivePrice = Number(product.effectivePrice ?? product.basePrice ?? 0);
	const basePrice = Number(product.basePrice ?? 0);
	const productCartQty = cartItems.find((item) => item.id === getProductId(product))?.qty ?? 0;
	const outOfStock = stockValue <= 0;

	const handleAddToCart = () => {
		if (outOfStock) return;
		if (productCartQty >= stockValue) {
			Alert.alert('Stock limit reached', `${product.name || 'This item'} has only ${stockValue} in stock.`);
			return;
		}
		addToCart(product);
	};

	return (
		<SafeAreaView style={styles.container}>
			<Animated.FlatList
				style={{ opacity: fadeAnim }}
				contentContainerStyle={styles.content}
				data={reviews}
				keyExtractor={(item) => String(item.id)}
				ListHeaderComponent={(
					<View>
						<View style={styles.header}>
							<Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
								<Text style={styles.backButtonText}>Back</Text>
							</Pressable>
							<Text style={styles.headerTitle}>Product Details</Text>
							<View style={styles.headerSpacer} />
						</View>

						<View style={styles.imageWrap}>
							{product.imageUrl ? (
								<Image source={{ uri: product.imageUrl }} style={styles.image} />
							) : (
								<View style={styles.imageFallback}>
									<Text style={styles.imageFallbackText}>No Image</Text>
								</View>
							)}
						</View>

						<Text style={styles.title}>{product.name}</Text>
						<Text style={styles.category}>{product.category || 'General'}</Text>
						<View style={styles.priceRow}>
							<Text style={styles.price}>{formatPrice(effectivePrice)}</Text>
							{effectivePrice < basePrice ? <Text style={styles.priceStrike}>{formatPrice(basePrice)}</Text> : null}
						</View>

						<Text style={styles.descriptionTitle}>About this product</Text>
						<Text style={product.description ? styles.description : styles.descriptionPlaceholder}>
							{product.description || 'No description provided for this product.'}
						</Text>

						<View style={styles.stockRow}>
							<Text style={styles.stockLabel}>Stock</Text>
							<Text style={styles.stockValue}>{stockValue}</Text>
						</View>

						<Pressable
							onPress={handleAddToCart}
							disabled={outOfStock}
							style={outOfStock ? styles.addButtonDisabled : styles.addButton}
						>
							<Text style={styles.addButtonText}>{outOfStock ? 'Out of Stock' : 'Add to Cart'}</Text>
						</Pressable>

						<View style={styles.reviewSection}>
							<Text style={styles.reviewTitle}>Customer Reviews</Text>
							{!user?.id ? <Text style={styles.reviewHint}>Sign in from Profile tab to write a review.</Text> : null}

							{user?.id && canReviewData?.existingReview && !editing ? (
								<View style={styles.userReviewCard}>
									<Text style={styles.userReviewLabel}>Your Review</Text>
									<StarRow value={Number(canReviewData.existingReview.rating || 0)} readonly />
									<Text style={styles.reviewText}>{canReviewData.existingReview.comment || '(No comment)'}</Text>
									<View style={styles.reviewActions}>
										<Pressable
											style={styles.smallBtn}
											onPress={() => {
												setEditing(true);
												setReviewForm({
													rating: Number(canReviewData.existingReview.rating || 0),
													comment: String(canReviewData.existingReview.comment || ''),
												});
											}}
										>
											<Text style={styles.smallBtnText}>Edit</Text>
										</Pressable>
										<Pressable style={styles.smallDangerBtn} onPress={deleteReview}>
											<Text style={styles.smallBtnText}>Delete</Text>
										</Pressable>
									</View>
								</View>
							) : null}

							{user?.id && (!canReviewData?.existingReview || editing || canReviewData?.canReview) ? (
								<View style={styles.formCard}>
									<Text style={styles.userReviewLabel}>{editing ? 'Edit Review' : 'Write Review'}</Text>
									<StarRow value={reviewForm.rating} onChange={(value) => setReviewForm((prev) => ({ ...prev, rating: value }))} />
									<TextInput
										value={reviewForm.comment}
										onChangeText={(value) => setReviewForm((prev) => ({ ...prev, comment: value }))}
										placeholder="Share your experience..."
										placeholderTextColor="#64748b"
										style={styles.commentInput}
										multiline
									/>
									{reviewError ? <Text style={styles.errorText}>{reviewError}</Text> : null}
									<Pressable onPress={submitReview} style={styles.smallBtn} disabled={saving}>
										<Text style={styles.smallBtnText}>{saving ? 'Saving...' : editing ? 'Update Review' : 'Submit Review'}</Text>
									</Pressable>
								</View>
							) : null}

							{loadingReviews ? <ActivityIndicator color="#2563eb" style={styles.reviewLoader} /> : null}
						</View>
					</View>
				)}
				renderItem={({ item }) => (
					<View style={styles.reviewCard}>
						<StarRow value={Number(item.rating || 0)} readonly />
						<Text style={styles.reviewAuthor}>{item.user?.name || 'Customer'}</Text>
						<Text style={styles.reviewText}>{item.comment || '(No comment)'}</Text>
						<Text style={styles.reviewDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
					</View>
				)}
				ListEmptyComponent={!loadingReviews ? <Text style={styles.emptyReview}>No reviews yet.</Text> : null}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#0b0f1a' },
	centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0f1a', padding: 24 },
	content: { padding: 16, paddingBottom: 140 },
	loadingText: { color: '#e2e8f0', marginTop: 12, fontSize: 13 },
	errorText: { color: '#f87171', fontSize: 12, marginTop: 8 },
	header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
	headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
	headerSpacer: { width: 52 },
	backButton: { backgroundColor: '#1f2937', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
	backButtonText: { color: '#e2e8f0', fontWeight: '600', fontSize: 12 },
	imageWrap: { height: 260, borderRadius: 18, overflow: 'hidden', backgroundColor: '#111827', marginBottom: 16 },
	image: { width: '100%', height: '100%' },
	imageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
	imageFallbackText: { color: '#64748b', fontSize: 12 },
	title: { color: '#f8fafc', fontSize: 22, fontWeight: '700' },
	category: { color: '#94a3b8', fontSize: 13, marginTop: 6 },
	priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
	price: { color: '#22d3ee', fontSize: 22, fontWeight: '700' },
	priceStrike: { color: '#64748b', fontSize: 14, textDecorationLine: 'line-through' },
	descriptionTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: '700', marginTop: 18 },
	description: { color: '#e2e8f0', fontSize: 14, marginTop: 8, lineHeight: 20 },
	descriptionPlaceholder: { color: '#64748b', fontSize: 14, marginTop: 8, lineHeight: 20 },
	stockRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1f2937' },
	stockLabel: { color: '#94a3b8', fontSize: 13 },
	stockValue: { color: '#f8fafc', fontSize: 13, fontWeight: '700' },
	addButton: { marginTop: 16, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
	addButtonDisabled: { marginTop: 16, backgroundColor: '#334155', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
	addButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
	reviewSection: { marginTop: 20 },
	reviewTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 18, marginBottom: 8 },
	reviewHint: { color: '#94a3b8', fontSize: 12, marginBottom: 8 },
	userReviewCard: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 10 },
	userReviewLabel: { color: '#f8fafc', fontWeight: '700', marginBottom: 8 },
	reviewActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
	formCard: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 10 },
	commentInput: { backgroundColor: '#1f2937', color: '#fff', borderRadius: 8, minHeight: 80, paddingHorizontal: 10, paddingTop: 8, textAlignVertical: 'top', marginTop: 8 },
	smallBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12, alignSelf: 'flex-start', marginTop: 8 },
	smallDangerBtn: { backgroundColor: '#7f1d1d', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12, alignSelf: 'flex-start' },
	smallBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
	starRow: { flexDirection: 'row', gap: 4 },
	starActive: { color: '#facc15', fontSize: 22 },
	starInactive: { color: '#475569', fontSize: 22 },
	reviewLoader: { marginTop: 8 },
	reviewCard: { backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 10 },
	reviewAuthor: { color: '#f8fafc', fontWeight: '600', marginTop: 6, fontSize: 13 },
	reviewText: { color: '#cbd5e1', fontSize: 13, marginTop: 6 },
	reviewDate: { color: '#64748b', fontSize: 11, marginTop: 6 },
	emptyReview: { color: '#94a3b8', fontSize: 12, marginTop: 10 },
});

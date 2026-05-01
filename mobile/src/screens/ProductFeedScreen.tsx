import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
	ActivityIndicator,
	Alert,
	Animated,
	Dimensions,
	FlatList,
	Image,
	Pressable,
	StatusBar,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
	getProductId,
	Promotion,
	Product,
	useStorefrontStore,
} from '../storefront/store';
import { FEATURE_FLAGS } from '../config/featureFlags';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DEFAULT_SLIDES = [
	{
		id: 'slide-phones',
		title: 'Latest Smartphones',
		subtitle: 'Explore the newest flagship phones with cutting-edge technology',
		imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80',
	},
	{
		id: 'slide-laptops',
		title: 'Premium Laptops',
		subtitle: 'Power meets portability with our best laptops',
		imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80',
	},
	{
		id: 'slide-accessories',
		title: 'Smart Accessories',
		subtitle: 'Complete your setup with premium accessories',
		imageUrl: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&q=80',
	},
];

const SORT_OPTIONS = [
	{ id: 'default', label: 'Default' },
	{ id: 'price_asc', label: 'Price Low-High' },
	{ id: 'price_desc', label: 'Price High-Low' },
	{ id: 'name_asc', label: 'Name A-Z' },
];

const FEATURED_CATEGORY_RAILS = [
	{ title: 'Mobile Phones', aliases: ['mobile phones'] },
	{ title: 'Laptops', aliases: ['laptops'] },
	{ title: 'TV', aliases: ['tv', 'tvs'] },
];

function formatPrice(value: number) {
	if (!Number.isFinite(value)) return '$0.00';
	return `$${value.toFixed(2)}`;
}

function normalizeCategory(value?: string) {
	return String(value || '').toLowerCase().trim();
}

function buildSlides(promotions: Promotion[]) {
	if (!promotions.length) return DEFAULT_SLIDES;
	const promoSlides = promotions.map((promo) => ({
		id: `promo-${promo.id ?? promo.promoCode ?? promo.campaignName}`,
		title: promo.campaignName ?? 'Exclusive Offer',
		subtitle: promo.promoCode
			? `Use code ${promo.promoCode} to save ${promo.discountPercentage ?? 0}%`
			: 'Limited-time savings on selected items',
		imageUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=600&q=80',
	}));
	return [...promoSlides, ...DEFAULT_SLIDES.slice(0, 2)];
}

function HeroSlider({ slides, scrollX }: { slides: typeof DEFAULT_SLIDES; scrollX: Animated.Value }) {
	return (
		<View>
			<Animated.FlatList
				data={slides}
				keyExtractor={(item) => item.id}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onScroll={Animated.event(
					[{ nativeEvent: { contentOffset: { x: scrollX } } }],
					{ useNativeDriver: false }
				)}
				renderItem={({ item }) => (
					<View style={styles.heroSlide}>
						<Image source={{ uri: item.imageUrl }} style={styles.heroImage} />
						<View style={styles.heroOverlay} />
						<View style={styles.heroContent}>
							<Text style={styles.heroTitle}>{item.title}</Text>
							<Text style={styles.heroSubtitle}>{item.subtitle}</Text>
							<Pressable android_ripple={{ color: '#ccc' }} style={styles.heroButton}>
								<Text style={styles.heroButtonText}>Shop Now</Text>
							</Pressable>
						</View>
					</View>
				)}
			/>
			<FlatList
				data={slides}
				keyExtractor={(item) => `${item.id}-dot`}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.heroDots}
				renderItem={({ index }) => {
					const inputRange = [
						(index - 1) * SCREEN_WIDTH,
						index * SCREEN_WIDTH,
						(index + 1) * SCREEN_WIDTH,
					];
					const dotScale = scrollX.interpolate({
						inputRange,
						outputRange: [1, 1.4, 1],
						extrapolate: 'clamp',
					});
					const dotOpacity = scrollX.interpolate({
						inputRange,
						outputRange: [0.4, 1, 0.4],
						extrapolate: 'clamp',
					});
					return (
						<Animated.View style={[styles.heroDot, { transform: [{ scale: dotScale }], opacity: dotOpacity }]} />
					);
				}}
			/>
		</View>
	);
}

function CategoryChips({
						   categories,
						   activeCategory,
						   onSelect,
					   }: {
	categories: string[];
	activeCategory: string;
	onSelect: (value: string) => void;
}) {
	return (
		<FlatList
			data={categories}
			keyExtractor={(item) => item}
			horizontal
			showsHorizontalScrollIndicator={false}
			contentContainerStyle={styles.categoryList}
			renderItem={({ item }) => {
				const isActive = item === activeCategory;
				return (
					<Pressable
						android_ripple={{ color: '#ccc' }}
						onPress={() => onSelect(item)}
						style={isActive ? styles.categoryChipActive : styles.categoryChip}
					>
						<Text style={isActive ? styles.categoryTextActive : styles.categoryText}>{item}</Text>
					</Pressable>
				);
			}}
		/>
	);
}

function SortOptions({ value, onChange }: { value: string; onChange: (value: string) => void }) {
	return (
		<FlatList
			data={SORT_OPTIONS}
			keyExtractor={(item) => item.id}
			horizontal
			showsHorizontalScrollIndicator={false}
			contentContainerStyle={styles.sortList}
			renderItem={({ item }) => {
				const isActive = item.id === value;
				return (
					<Pressable
						android_ripple={{ color: '#ccc' }}
						onPress={() => onChange(item.id)}
						style={isActive ? styles.sortChipActive : styles.sortChip}
					>
						<Text style={isActive ? styles.sortTextActive : styles.sortText}>{item.label}</Text>
					</Pressable>
				);
			}}
		/>
	);
}

function ProductCard({
						 product,
						 onAdd,
						 onOpen,
					 }: {
	product: Product;
	onAdd: (product: Product) => void;
	onOpen: (product: Product) => void;
}) {
	const availableStock = Number(product.availableStock ?? product.stockQuantity ?? 0);
	const outOfStock = availableStock <= 0;
	const basePrice = Number(product.basePrice ?? (product as any).price ?? 0);
	const effectivePrice = Number(product.effectivePrice ?? product.basePrice ?? (product as any).price ?? 0);
	const hasDiscount = effectivePrice < basePrice;

	return (
		<Pressable android_ripple={{ color: '#ccc' }} onPress={() => onOpen(product)} style={styles.card}>
			<View style={styles.cardImageWrap}>
				{product.imageUrl ? (
					<Image source={{ uri: product.imageUrl }} style={styles.cardImage} />
				) : (
					<View style={styles.cardImageFallback}>
						<Text style={styles.cardImageFallbackText}>No Image</Text>
					</View>
				)}
				<View style={styles.cardBadgeLeft}>
					<Text style={styles.cardBadgeText}>{product.category || 'General'}</Text>
				</View>
				<View style={outOfStock ? styles.cardBadgeRightOut : styles.cardBadgeRightIn}>
					<Text style={styles.cardBadgeText}>
						{outOfStock ? 'Out of Stock' : `In Stock (${availableStock})`}
					</Text>
				</View>
			</View>
			<View style={styles.cardBody}>
				<Text style={styles.cardTitle} numberOfLines={2}>{product.name}</Text>
				<View style={styles.cardPriceRow}>
					<View>
						<Text style={styles.cardPrice}>{formatPrice(effectivePrice)}</Text>
						{hasDiscount && (
							<Text style={styles.cardPriceStrike}>{formatPrice(basePrice)}</Text>
						)}
					</View>
					<Pressable
						android_ripple={{ color: '#ccc' }}
						onPress={() => onAdd(product)}
						disabled={outOfStock}
						style={outOfStock ? styles.addButtonDisabled : styles.addButton}
					>
						<Text style={styles.addButtonText}>{outOfStock ? 'Out of Stock' : 'Add'}</Text>
					</Pressable>
				</View>
			</View>
		</Pressable>
	);
}

function ProductRailCard({
							 product,
							 onAdd,
							 onOpen,
						 }: {
	product: Product;
	onAdd: (product: Product) => void;
	onOpen: (product: Product) => void;
}) {
	const availableStock = Number(product.availableStock ?? product.stockQuantity ?? 0);
	const outOfStock = availableStock <= 0;
	const effectivePrice = Number(product.effectivePrice ?? product.basePrice ?? (product as any).price ?? 0);

	return (
		<Pressable android_ripple={{ color: '#ccc' }} onPress={() => onOpen(product)} style={styles.railCard}>
			{product.imageUrl ? (
				<Image source={{ uri: product.imageUrl }} style={styles.railImage} />
			) : (
				<View style={styles.railImageFallback}>
					<Text style={styles.railImageFallbackText}>No Image</Text>
				</View>
			)}
			<View style={styles.railBody}>
				<Text style={styles.railTitle} numberOfLines={2}>{product.name}</Text>
				<Text style={styles.railPrice}>{formatPrice(effectivePrice)}</Text>
				<Pressable
					android_ripple={{ color: '#ccc' }}
					onPress={() => onAdd(product)}
					disabled={outOfStock}
					style={outOfStock ? styles.railAddButtonDisabled : styles.railAddButton}
				>
					<Text style={styles.railAddText}>{outOfStock ? 'Out of Stock' : 'Add'}</Text>
				</Pressable>
			</View>
		</Pressable>
	);
}

export default function ProductFeedScreen() {
	const navigation = useNavigation();
	const {
		products,
		categories,
		promotions,
		loading,
		error,
		searchTerm,
		activeCategory,
		sortBy,
		maxPrice,
		cartItems,
		fetchCatalog,
		setSearchTerm,
		setActiveCategory,
		setSortBy,
		setMaxPrice,
		addToCart,
	} = useStorefrontStore();

	const scrollX = useRef(new Animated.Value(0)).current;
	const cartBadgeScale = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		fetchCatalog();
	}, [fetchCatalog]);

	useEffect(() => {
		Animated.sequence([
			Animated.timing(cartBadgeScale, {
				toValue: 1.2,
				duration: 160,
				useNativeDriver: true,
			}),
			Animated.timing(cartBadgeScale, {
				toValue: 1,
				duration: 160,
				useNativeDriver: true,
			}),
		]).start();
	}, [cartItems.length, cartBadgeScale]);

	const slides = useMemo(() => buildSlides(promotions), [promotions]);

	const filteredProducts = useMemo(() => {
		const query = searchTerm.trim().toLowerCase();

		return products
			.filter((product) => activeCategory === 'All' || product.category === activeCategory)
			.filter((product) => {
				if (!query) return true;
				const name = product.name?.toLowerCase() || '';
				const description = product.description?.toLowerCase() || '';
				return name.includes(query) || description.includes(query);
			})
			.filter((product) => {
				// THE FIX: Ignore the filter if the input is empty
				if (!maxPrice.trim()) return true;

				const maxPriceValue = Number(maxPrice);
				if (isNaN(maxPriceValue)) return true;

				// Check both basePrice and price to be safe
				const itemPrice = Number(product.basePrice ?? (product as any).price ?? 0);
				return itemPrice <= maxPriceValue;
			})
			.sort((a, b) => {
				const priceA = Number(a.basePrice ?? (a as any).price ?? 0);
				const priceB = Number(b.basePrice ?? (b as any).price ?? 0);

				if (sortBy === 'price_asc') return priceA - priceB;
				if (sortBy === 'price_desc') return priceB - priceA;
				if (sortBy === 'name_asc') return String(a.name ?? '').localeCompare(String(b.name ?? ''));
				return 0;
			});
	}, [activeCategory, maxPrice, products, searchTerm, sortBy]);

	const exclusiveOfferProducts = useMemo(
		() => products.filter((product) => Boolean(product.isOnPromotion)),
		[products]
	);

	const featuredCategoryRails = useMemo(
		() => FEATURED_CATEGORY_RAILS
			.map((row) => ({
				title: row.title,
				products: filteredProducts.filter((product) => row.aliases.includes(normalizeCategory(product.category))),
			}))
			.filter((row) => row.products.length > 0),
		[filteredProducts]
	);

	const totalItems = useMemo(() => cartItems.reduce((sum, item) => sum + item.qty, 0), [cartItems]);

	const handleAddToCart = useCallback((product: Product) => {
		const availableStock = Number(product.availableStock ?? product.stockQuantity ?? 0);
		if (availableStock <= 0) return;
		const id = getProductId(product);
		const currentQty = cartItems.find((item) => item.id === id)?.qty ?? 0;
		if (currentQty >= availableStock) {
			Alert.alert('Stock limit reached', `${product.name || 'This item'} has only ${availableStock} in stock.`);
			return;
		}
		addToCart(product);
	}, [addToCart, cartItems]);

	const handleOpenDetail = useCallback((product: Product) => {
		navigation.navigate('ProductDetail' as never, {
			product,
			productId: String(product.id ?? product._id ?? ''),
		} as never);
	}, [navigation]);

	const renderProduct = useCallback(({ item }: { item: Product }) => (
		<ProductCard product={item} onAdd={handleAddToCart} onOpen={handleOpenDetail} />
	), [handleAddToCart, handleOpenDetail]);

	const renderRail = useCallback(({ item }: { item: Product }) => (
		<ProductRailCard product={item} onAdd={handleAddToCart} onOpen={handleOpenDetail} />
	), [handleAddToCart, handleOpenDetail]);

	if (loading) {
		return (
			<SafeAreaView style={styles.centered}>
				<StatusBar barStyle="light-content" />
				<ActivityIndicator size="large" color="#2563eb" />
				<Text style={styles.loadingText}>Loading products...</Text>
			</SafeAreaView>
		);
	}

	if (error) {
		return (
			<SafeAreaView style={styles.centered}>
				<StatusBar barStyle="light-content" />
				<Text style={styles.errorText}>{error}</Text>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="light-content" />
			<FlatList
				data={filteredProducts}
				keyExtractor={(item) => getProductId(item)}
				renderItem={renderProduct}
				numColumns={2}
				columnWrapperStyle={styles.productRow}
				contentContainerStyle={styles.listContent}
				ListHeaderComponent={(
					<View>
						<View style={styles.header}>
							<View>
								<Text style={styles.headerTitle}>Tech Store</Text>
								<Text style={styles.headerSubtitle}>Discover the latest deals</Text>
							</View>
							<Pressable
								android_ripple={{ color: '#ccc' }}
								onPress={() => navigation.navigate('Cart' as never)}
								style={styles.cartButton}
							>
								<Text style={styles.cartButtonText}>Cart</Text>
								{totalItems > 0 && (
									<Animated.View style={[styles.cartBadge, { transform: [{ scale: cartBadgeScale }] }]}>
										<Text style={styles.cartBadgeText}>{totalItems}</Text>
									</Animated.View>
								)}
							</Pressable>
						</View>

						<HeroSlider slides={slides} scrollX={scrollX} />

						<View style={styles.searchWrap}>
							<TextInput
								value={searchTerm}
								onChangeText={setSearchTerm}
								placeholder="Search products"
								placeholderTextColor="#9ca3af"
								style={styles.searchInput}
							/>
						</View>

						<CategoryChips
							categories={categories.length ? categories : ['All']}
							activeCategory={activeCategory}
							onSelect={setActiveCategory}
						/>

						<View style={styles.filterRow}>
							<View style={styles.filterColumn}>
								<Text style={styles.filterLabel}>Max Price</Text>
								<TextInput
									value={maxPrice}
									onChangeText={setMaxPrice}
									placeholder="No limit"
									placeholderTextColor="#9ca3af"
									keyboardType="numeric"
									style={styles.filterInput}
								/>
							</View>
						</View>

						<SortOptions value={sortBy} onChange={(value) => setSortBy(value as typeof sortBy)} />

						{FEATURE_FLAGS.enableMerchandisingRails && activeCategory === 'All' && exclusiveOfferProducts.length > 0 && (
							<View style={styles.merchSection}>
								<Text style={styles.merchTitle}>Exclusive Offers</Text>
								<FlatList
									data={exclusiveOfferProducts}
									keyExtractor={(item) => `offer-${getProductId(item)}`}
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={styles.railList}
									renderItem={renderRail}
								/>
							</View>
						)}

						{FEATURE_FLAGS.enableMerchandisingRails && activeCategory === 'All' && featuredCategoryRails.map((row) => (
							<View key={row.title} style={styles.merchSection}>
								<Text style={styles.merchTitle}>{row.title}</Text>
								<FlatList
									data={row.products}
									keyExtractor={(item) => `${row.title}-${getProductId(item)}`}
									horizontal
									showsHorizontalScrollIndicator={false}
									contentContainerStyle={styles.railList}
									renderItem={renderRail}
								/>
							</View>
						))}

						<Text style={styles.sectionTitle}>Products</Text>
					</View>
				)}
				ListEmptyComponent={(
					<View style={styles.emptyState}>
						<Text style={styles.emptyTitle}>No products found</Text>
						<Text style={styles.emptySubtitle}>Adjust your filters or search terms.</Text>
					</View>
				)}
			/>

		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#0b0f1a',
	},
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#0b0f1a',
	},
	loadingText: {
		marginTop: 12,
		color: '#e2e8f0',
		fontSize: 14,
	},
	errorText: {
		color: '#f87171',
		fontSize: 16,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
	},
	headerTitle: {
		color: '#f8fafc',
		fontSize: 22,
		fontWeight: '700',
	},
	headerSubtitle: {
		color: '#94a3b8',
		fontSize: 13,
		marginTop: 2,
	},
	cartButton: {
		backgroundColor: '#2563eb',
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		minHeight: 48,
		minWidth: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cartButtonText: {
		color: '#f8fafc',
		fontWeight: '700',
		fontSize: 14,
	},
	cartBadge: {
		position: 'absolute',
		top: -6,
		right: -6,
		backgroundColor: '#ef4444',
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cartBadgeText: {
		color: '#ffffff',
		fontSize: 11,
		fontWeight: '700',
	},
	listContent: {
		padding: 16,
		paddingBottom: 140,
	},
	heroSlide: {
		borderRadius: 16,
		overflow: 'hidden',
		backgroundColor: '#111827',
		marginBottom: 12,
		width: SCREEN_WIDTH - 32,
		height: 200,
		elevation: 4,
	},
	heroImage: {
		width: '100%',
		height: '100%',
	},
	heroOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0,0,0,0.4)',
	},
	heroContent: {
		position: 'absolute',
		left: 16,
		right: 16,
		bottom: 16,
	},
	heroTitle: {
		color: '#f8fafc',
		fontSize: 20,
		fontWeight: '700',
	},
	heroSubtitle: {
		color: '#e2e8f0',
		marginTop: 6,
		fontSize: 13,
	},
	heroButton: {
		marginTop: 12,
		backgroundColor: '#22c55e',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		minHeight: 48,
		minWidth: 48,
		alignItems: 'center',
	},
	heroButtonText: {
		color: '#ffffff',
		fontWeight: '700',
		fontSize: 14,
	},
	heroDots: {
		paddingBottom: 8,
	},
	heroDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#e2e8f0',
		marginRight: 6,
	},
	searchWrap: {
		marginTop: 12,
		marginBottom: 12,
	},
	searchInput: {
		backgroundColor: '#111827',
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 12,
		color: '#f8fafc',
		borderWidth: 1,
		borderColor: '#1f2937',
		minHeight: 48,
	},
	categoryList: {
		paddingBottom: 8,
	},
	categoryChip: {
		borderRadius: 999,
		borderWidth: 1,
		borderColor: '#1f2937',
		paddingHorizontal: 16,
		paddingVertical: 10,
		marginRight: 8,
		minHeight: 48,
		justifyContent: 'center',
		backgroundColor: '#111827',
	},
	categoryChipActive: {
		borderRadius: 999,
		paddingHorizontal: 16,
		paddingVertical: 10,
		marginRight: 8,
		minHeight: 48,
		justifyContent: 'center',
		backgroundColor: '#2563eb',
	},
	categoryText: {
		color: '#cbd5f5',
		fontSize: 13,
		fontWeight: '600',
	},
	categoryTextActive: {
		color: '#ffffff',
		fontSize: 13,
		fontWeight: '700',
	},
	filterRow: {
		flexDirection: 'row',
		marginTop: 8,
		marginBottom: 8,
	},
	filterColumn: {
		flex: 1,
	},
	filterLabel: {
		color: '#94a3b8',
		marginBottom: 6,
		fontSize: 12,
	},
	filterInput: {
		backgroundColor: '#111827',
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 10,
		color: '#f8fafc',
		borderWidth: 1,
		borderColor: '#1f2937',
		minHeight: 48,
	},
	sortList: {
		paddingVertical: 8,
	},
	sortChip: {
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#1f2937',
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginRight: 8,
		minHeight: 48,
		justifyContent: 'center',
		backgroundColor: '#111827',
	},
	sortChipActive: {
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginRight: 8,
		minHeight: 48,
		justifyContent: 'center',
		backgroundColor: '#0ea5e9',
	},
	sortText: {
		color: '#cbd5f5',
		fontSize: 12,
		fontWeight: '600',
	},
	sortTextActive: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '700',
	},
	sectionTitle: {
		color: '#f8fafc',
		fontSize: 18,
		fontWeight: '700',
		marginTop: 12,
		marginBottom: 8,
	},
	merchSection: {
		marginTop: 14,
	},
	merchTitle: {
		color: '#f8fafc',
		fontSize: 17,
		fontWeight: '700',
		marginBottom: 8,
	},
	railList: {
		paddingRight: 8,
	},
	railCard: {
		width: 176,
		backgroundColor: '#111827',
		borderRadius: 14,
		overflow: 'hidden',
		marginRight: 10,
		borderWidth: 1,
		borderColor: '#1f2937',
	},
	railImage: {
		width: '100%',
		height: 110,
	},
	railImageFallback: {
		width: '100%',
		height: 110,
		backgroundColor: '#0f172a',
		alignItems: 'center',
		justifyContent: 'center',
	},
	railImageFallbackText: {
		color: '#64748b',
		fontSize: 11,
	},
	railBody: {
		padding: 10,
	},
	railTitle: {
		color: '#f8fafc',
		fontSize: 13,
		fontWeight: '600',
		minHeight: 32,
	},
	railPrice: {
		color: '#22d3ee',
		fontSize: 14,
		fontWeight: '700',
		marginTop: 6,
	},
	railAddButton: {
		marginTop: 8,
		backgroundColor: '#22c55e',
		borderRadius: 10,
		paddingVertical: 8,
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 40,
	},
	railAddButtonDisabled: {
		marginTop: 8,
		backgroundColor: '#334155',
		borderRadius: 10,
		paddingVertical: 8,
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 40,
	},
	railAddText: {
		color: '#ffffff',
		fontWeight: '700',
		fontSize: 12,
	},
	productRow: {
		justifyContent: 'space-between',
	},
	card: {
		flex: 1,
		backgroundColor: '#111827',
		borderRadius: 16,
		marginBottom: 16,
		marginHorizontal: 4,
		overflow: 'hidden',
		elevation: 4,
	},
	cardImageWrap: {
		height: 120,
		backgroundColor: '#0f172a',
	},
	cardImage: {
		width: '100%',
		height: '100%',
	},
	cardImageFallback: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cardImageFallbackText: {
		color: '#64748b',
		fontSize: 12,
	},
	cardBadgeLeft: {
		position: 'absolute',
		left: 8,
		top: 8,
		backgroundColor: 'rgba(15, 23, 42, 0.9)',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
	},
	cardBadgeRightIn: {
		position: 'absolute',
		right: 8,
		top: 8,
		backgroundColor: 'rgba(34, 197, 94, 0.9)',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
	},
	cardBadgeRightOut: {
		position: 'absolute',
		right: 8,
		top: 8,
		backgroundColor: 'rgba(239, 68, 68, 0.9)',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
	},
	cardBadgeText: {
		color: '#ffffff',
		fontSize: 10,
		fontWeight: '700',
	},
	cardBody: {
		padding: 12,
	},
	cardTitle: {
		color: '#f8fafc',
		fontSize: 14,
		fontWeight: '600',
		minHeight: 36,
	},
	cardPriceRow: {
		marginTop: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	cardPrice: {
		color: '#22d3ee',
		fontSize: 16,
		fontWeight: '700',
	},
	cardPriceStrike: {
		color: '#64748b',
		fontSize: 12,
		textDecorationLine: 'line-through',
	},
	addButton: {
		backgroundColor: '#22c55e',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		minHeight: 48,
		minWidth: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	addButtonDisabled: {
		backgroundColor: '#334155',
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		minHeight: 48,
		minWidth: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	addButtonText: {
		color: '#ffffff',
		fontWeight: '700',
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
});

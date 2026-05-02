import axios from 'axios';
import { create } from 'zustand';

export const API_BASE_URL = 'http://10.0.2.2:5000';

export type Promotion = {
	id?: string;
	campaignName?: string;
	promoCode?: string;
	discountPercentage?: number;
};

export type Product = {
	id?: string | number;
	_id?: string;
	productCode?: number;
	sku?: string;
	name?: string;
	description?: string;
	basePrice?: number;
	effectivePrice?: number;
	availableStock?: number;
	stockQuantity?: number;
	category?: string;
	imageUrl?: string;
	isOnPromotion?: boolean;
};

export type UserProfile = {
	id?: string;
	name?: string;
	email?: string;
	role?: string;
	phone?: string;
	address?: string;
	token?: string;
};

export type PromoResult = {
	originalPrice: number;
	eligibleSubtotal: number;
	discountPercentage: number;
	discount: number;
	discountedPrice: number;
	promotion?: Promotion;
};

export type OrderItem = {
	id?: string;
	productId: string;
	quantity: number;
	price: number;
	product?: Product;
};

export type Order = {
	id?: string;
	status?: string;
	totalAmount?: number;
	discountedTotal?: number | null;
	orderDate?: string;
	items?: OrderItem[];
	user?: { id?: string; name?: string; email?: string };
};

export type CartItem = Product & {
	id: string;
	productId: string;
	qty: number;
};

export type StorefrontState = {
	products: Product[];
	categories: string[];
	promotions: Promotion[];
	loading: boolean;
	error: string;
	searchTerm: string;
	activeCategory: string;
	sortBy: 'default' | 'price_asc' | 'price_desc' | 'name_asc';
	maxPrice: string;
	cartItems: CartItem[];
	user: UserProfile | null;
	isAdmin: boolean;
	promoCode: string;
	promoResult: PromoResult | null;
	promoLoading: boolean;
	promoError: string;
	checkoutLoading: boolean;
	checkoutError: string;
	lastOrder: Order | null;
	orders: Order[];
	ordersLoading: boolean;
	ordersError: string;
	fetchCatalog: () => Promise<void>;
	createProduct: (productData: Partial<Product>) => Promise<boolean>;
	updateProduct: (id: string, productData: Partial<Product>) => Promise<boolean>;
	deleteProduct: (id: string) => Promise<boolean>;
	setUser: (user: UserProfile | null) => void;
	signOut: () => void;
	setSearchTerm: (value: string) => void;
	setActiveCategory: (value: string) => void;
	setSortBy: (value: StorefrontState['sortBy']) => void;
	setMaxPrice: (value: string) => void;
	applyPromo: (code: string) => Promise<void>;
	clearPromo: () => void;
	placeOrder: (customer: { name: string; email: string; address: string; phone?: string }) => Promise<Order | null>;
	fetchOrders: () => Promise<void>;
	addToCart: (product: Product) => void;
	updateQty: (id: string, qty: number) => void;
	removeFromCart: (id: string) => void;
	clearCart: () => void;
};

export function getProductId(product: Product): string {
	return String(product.id ?? product._id ?? product.sku ?? product.name ?? Math.random());
}

function getAvailableStock(product: Partial<Product>) {
	return Math.max(0, Number(product.availableStock ?? product.stockQuantity ?? 0));
}

function mapCartItemsForCheckout(items: CartItem[]) {
	return items.map((item) => ({
		productId: item.productId,
		quantity: item.qty,
		price: Number(item.effectivePrice ?? item.basePrice ?? (item as any).price ?? 0),
	}));
}

function authHeaders(token?: string) {
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export const useStorefrontStore = create<StorefrontState>((set, get) => ({
	products: [],
	categories: ['All'],
	promotions: [],
	loading: false,
	error: '',
	searchTerm: '',
	activeCategory: 'All',
	sortBy: 'default',
	maxPrice: '',
	cartItems: [],
	user: null,
	isAdmin: false,
	promoCode: '',
	promoResult: null,
	promoLoading: false,
	promoError: '',
	checkoutLoading: false,
	checkoutError: '',
	lastOrder: null,
	orders: [],
	ordersLoading: false,
	ordersError: '',

	fetchCatalog: async () => {
		set({ loading: true, error: '' });
		try {
			const [productsResponse, categoriesResponse, promotionsResponse] = await Promise.all([
				axios.get(`${API_BASE_URL}/api/products`),
				axios.get(`${API_BASE_URL}/api/categories`).catch(() => ({ data: [] })),
				axios.get(`${API_BASE_URL}/api/promotions/active`).catch(() => ({ data: [] })),
			]);

			const rawProducts = productsResponse.data;
			const productData = Array.isArray(rawProducts) ? rawProducts : (rawProducts?.products || rawProducts?.data || []);
			const categoryList = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];
			const promotionList = Array.isArray(promotionsResponse.data) ? promotionsResponse.data : [];

			set({
				products: productData,
				categories: ['All', ...new Set(categoryList)],
				promotions: promotionList,
				loading: false,
			});
		} catch (error: any) {
			set({ error: error?.response?.data?.error || 'Failed to load products.', loading: false });
		}
	},

	createProduct: async (productData) => {
		try {
			await axios.post(`${API_BASE_URL}/api/products`, productData, {
				headers: authHeaders(get().user?.token),
			});
			await get().fetchCatalog();
			return true;
		} catch {
			return false;
		}
	},

	updateProduct: async (id, productData) => {
		try {
			await axios.put(`${API_BASE_URL}/api/products/${id}`, productData, {
				headers: authHeaders(get().user?.token),
			});
			await get().fetchCatalog();
			return true;
		} catch {
			return false;
		}
	},

	deleteProduct: async (id) => {
		try {
			await axios.delete(`${API_BASE_URL}/api/products/${id}`, {
				headers: authHeaders(get().user?.token),
			});
			set((state) => ({
				products: state.products.filter((p) => getProductId(p) !== id),
			}));
			return true;
		} catch {
			return false;
		}
	},

	setUser: (user) => {
		if (user?.token) {
			axios.defaults.headers.common.Authorization = `Bearer ${user.token}`;
		} else {
			delete axios.defaults.headers.common.Authorization;
		}
		set({
			user,
			isAdmin: Boolean(user?.role && String(user.role).toUpperCase() === 'ADMIN'),
		});
	},

	signOut: () => {
		delete axios.defaults.headers.common.Authorization;
		set({ user: null, isAdmin: false, orders: [], ordersError: '' });
	},

	setSearchTerm: (value) => set({ searchTerm: value }),
	setActiveCategory: (value) => set({ activeCategory: value }),
	setSortBy: (value) => set({ sortBy: value }),
	setMaxPrice: (value) => set({ maxPrice: value }),

	applyPromo: async (code) => {
		const trimmed = code.trim();
		const items = mapCartItemsForCheckout(get().cartItems);
		const originalPrice = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
		if (!trimmed) {
			set({ promoCode: '', promoResult: null, promoError: 'Promo code is required.' });
			return;
		}

		set({ promoLoading: true, promoError: '' });
		try {
			const { data } = await axios.post(`${API_BASE_URL}/api/promotions/apply`, {
				promoCode: trimmed,
				originalPrice,
				items,
			});
			set({ promoCode: trimmed, promoResult: data, promoLoading: false });
		} catch (error: any) {
			set({
				promoCode: trimmed,
				promoResult: null,
				promoLoading: false,
				promoError: error?.response?.data?.error || 'Unable to apply promo code.',
			});
		}
	},

	clearPromo: () => set({ promoCode: '', promoResult: null, promoError: '' }),

	placeOrder: async (customer) => {
		const state = get();
		const items = mapCartItemsForCheckout(state.cartItems);
		if (!items.length) {
			set({ checkoutError: 'Your cart is empty.' });
			return null;
		}

		set({ checkoutLoading: true, checkoutError: '' });
		try {
			const endpoint = state.user?.token ? '/api/orders' : '/api/orders/guest';
			const headers = state.user?.token ? authHeaders(state.user.token) : undefined;
			const { data } = await axios.post(
				`${API_BASE_URL}${endpoint}`,
				{
					items,
					discountedTotal: state.promoResult?.discountedPrice ?? null,
					status: 'PENDING',
					customer,
				},
				headers ? { headers } : undefined
			);

			set({
				lastOrder: data,
				checkoutLoading: false,
				cartItems: [],
				promoCode: '',
				promoResult: null,
				promoError: '',
			});
			return data;
		} catch (error: any) {
			set({ checkoutLoading: false, checkoutError: error?.response?.data?.error || 'Checkout failed.' });
			return null;
		}
	},

	fetchOrders: async () => {
		const token = get().user?.token;
		if (!token) {
			set({ orders: [], ordersError: 'Sign in to view your orders.', ordersLoading: false });
			return;
		}
		set({ ordersLoading: true, ordersError: '' });
		try {
			const { data } = await axios.get(`${API_BASE_URL}/api/orders`, {
				headers: authHeaders(token),
			});
			set({ orders: Array.isArray(data) ? data : [], ordersLoading: false });
		} catch (error: any) {
			set({ ordersLoading: false, ordersError: error?.response?.data?.error || 'Failed to load orders.' });
		}
	},

	addToCart: (product) => {
		set((state) => {
			const id = getProductId(product);
			const productId = String(product.id ?? product._id ?? id);
			const maxStock = getAvailableStock(product);
			if (maxStock <= 0) {
				return state;
			}
			const existing = state.cartItems.find((item) => item.id === id);
			if (existing) {
				if (existing.qty >= maxStock) {
					return state;
				}
				return {
					cartItems: state.cartItems.map((item) => (
						item.id === id ? { ...item, qty: Math.min(item.qty + 1, maxStock) } : item
					)),
				};
			}
			return { cartItems: [...state.cartItems, { ...product, id, productId, qty: 1 }] };
		});
	},

	updateQty: (id, qty) => {
		set((state) => {
			const existing = state.cartItems.find((item) => item.id === id);
			if (!existing) return state;
			const maxStock = getAvailableStock(existing);
			if (qty <= 0 || maxStock <= 0) {
				return { cartItems: state.cartItems.filter((item) => item.id !== id) };
			}
			const cappedQty = Math.min(qty, maxStock);
			return {
				cartItems: state.cartItems.map((item) => (item.id === id ? { ...item, qty: cappedQty } : item)),
			};
		});
	},

	removeFromCart: (id) => {
		set((state) => ({ cartItems: state.cartItems.filter((item) => item.id !== id) }));
	},

	clearCart: () => set({ cartItems: [] }),
}));

import React, { createContext, useContext, useEffect, useState } from "react";

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  selected_options?: Record<string, string>; // option_name -> option_value mapping (e.g., "crystal_type" -> "rose_quartz")
  descriptive_title?: string;
  // Product data will be fetched from server when displaying cart
  product?: {
    id: string;
    title: string;
    slug: string;
    image?: string;
    base_price: number;
    currency: string;
    options?: Array<{
      id: string;
      name: string;
      display_name: string;
      values: Array<{
        id: string;
        name: string;
        price_adjustment: number;
        is_default: boolean;
        is_sold_out: boolean;
      }>;
    }>;
  };
}

interface Cart {
  id: string;
  currency: string;
  items: CartItem[];
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  addToCart: (
    productId: string,
    product: any,
    quantity?: number,
    selectedOptions?: Record<string, string>
  ) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  syncToServer: () => Promise<void>;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  fetchCartProductData: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cart from localStorage
  const loadCartFromStorage = () => {
    try {
      const storedCart = localStorage.getItem("cart");
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        setCart(parsedCart);
      } else {
        // Initialize empty cart
        const newCart: Cart = {
          id: Math.random().toString(36).substr(2, 9),
          currency: "USD",
          items: [],
        };
        setCart(newCart);
        localStorage.setItem("cart", JSON.stringify(newCart));
      }
    } catch (err) {
      console.error("Error loading cart from localStorage:", err);
      // Initialize empty cart on error
      const newCart: Cart = {
        id: Math.random().toString(36).substr(2, 9),
        currency: "USD",
        items: [],
      };
      setCart(newCart);
      localStorage.setItem("cart", JSON.stringify(newCart));
    }
  };

  // Save cart to localStorage
  const saveCartToStorage = (cartData: Cart) => {
    try {
      localStorage.setItem("cart", JSON.stringify(cartData));
    } catch (err) {
      console.error("Error saving cart to localStorage:", err);
    }
  };

  // Add item to cart (client-side only, stores only IDs)
  const addToCart = (
    productId: string,
    product: any,
    quantity: number = 1,
    selectedOptions?: Record<string, string>
  ) => {
    if (!cart) return;

    const itemKey = `${productId}-${JSON.stringify(selectedOptions || {})}`;

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        `${item.product_id}-${JSON.stringify(item.selected_options || {})}` ===
        itemKey
    );

    let updatedItems;
    if (existingItemIndex >= 0) {
      // Update existing item
      updatedItems = [...cart.items];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + quantity,
      };
    } else {
      // Add new item with only IDs (product data will be fetched from server)
      const newItem: CartItem = {
        id: Math.random().toString(36).substr(2, 9),
        product_id: productId,
        quantity,
        selected_options: selectedOptions,
        // Product data will be fetched from server when displaying cart
      };
      updatedItems = [...cart.items, newItem];
    }

    const updatedCart = {
      ...cart,
      items: updatedItems,
    };

    setCart(updatedCart);
    saveCartToStorage(updatedCart);
  };

  // Update item quantity (client-side only)
  const updateQuantity = (itemId: string, quantity: number) => {
    if (!cart) return;

    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    const updatedItems = cart.items.map((item) =>
      item.id === itemId ? { ...item, quantity } : item
    );

    const updatedCart = {
      ...cart,
      items: updatedItems,
    };

    setCart(updatedCart);
    saveCartToStorage(updatedCart);
  };

  // Remove item from cart (client-side only)
  const removeItem = (itemId: string) => {
    if (!cart) return;

    const updatedItems = cart.items.filter((item) => item.id !== itemId);

    const updatedCart = {
      ...cart,
      items: updatedItems,
    };

    setCart(updatedCart);
    saveCartToStorage(updatedCart);
  };

  // Clear entire cart (client-side only)
  const clearCart = () => {
    const emptyCart: Cart = {
      id: Math.random().toString(36).substr(2, 9),
      currency: "USD",
      items: [],
    };

    setCart(emptyCart);
    saveCartToStorage(emptyCart);
  };

  // Sync cart to server (for checkout)
  const syncToServer = async () => {
    if (!cart || cart.items.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      // Send all cart items to server
      const response = await fetch("/api/cart/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          items: cart.items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            selected_options: item.selected_options,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync cart to server");
      }

      console.log("Cart synced to server successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync cart");
      console.error("Sync cart error:", err);
      throw err; // Re-throw so caller can handle
    } finally {
      setLoading(false);
    }
  };

  // Calculate total items
  const getTotalItems = () => {
    if (!cart?.items) return 0;
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  };

  // Calculate total price (requires product data to be loaded)
  const getTotalPrice = () => {
    if (!cart?.items) return 0;
    return cart.items.reduce((total, item) => {
      if (!item.product) return total; // Skip items without product data
      const basePriceValue = item.product.base_price;
      const basePrice =
        typeof basePriceValue === "number"
          ? basePriceValue
          : parseFloat(String(basePriceValue || "0"));
      let finalPrice = basePrice;

      // Add option price adjustments
      if (item.selected_options && item.product.options) {
        item.product.options.forEach((option: any) => {
          const selectedValueName = item.selected_options![option.name];
          if (selectedValueName) {
            const selectedValue = option.values?.find(
              (v: any) => v.name === selectedValueName
            );
            if (selectedValue) {
              const priceAdjustment = selectedValue.price_adjustment;
              finalPrice += parseFloat(String(priceAdjustment || "0"));
            }
          }
        });
      }

      return total + finalPrice * item.quantity;
    }, 0);
  };

  // Fetch product data for cart items
  const fetchCartProductData = async () => {
    if (!cart?.items || cart.items.length === 0) return;

    // Check if we already have product data for all items
    const needsProductData = cart.items.some((item) => !item.product);
    if (!needsProductData) return;

    try {
      setLoading(true);

      // Get unique product IDs
      const productIds = [
        ...new Set(cart.items.map((item) => item.product_id)),
      ];

      // Fetch product data for all products
      const productPromises = productIds.map(async (productId) => {
        const response = await fetch(`/api/products/${productId}`);
        if (response.ok) {
          const data = await response.json();
          return data.data;
        }
        return null;
      });

      const products = await Promise.all(productPromises);
      const productMap = new Map();
      products.forEach((product) => {
        if (product) {
          productMap.set(product.id, product);
        }
      });

      // Update cart items with product data
      const updatedItems = cart.items.map((item) => ({
        ...item,
        product: productMap.get(item.product_id),
      }));

      const updatedCart = {
        ...cart,
        items: updatedItems,
      };

      setCart(updatedCart);
      saveCartToStorage(updatedCart);
    } catch (error) {
      console.error("Error fetching cart product data:", error);
      setError("Failed to load product data");
    } finally {
      setLoading(false);
    }
  };

  // Load cart from localStorage on mount
  useEffect(() => {
    loadCartFromStorage();
  }, []);

  const value: CartContextType = {
    cart,
    loading,
    error,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    syncToServer,
    getTotalItems,
    getTotalPrice,
    fetchCartProductData,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

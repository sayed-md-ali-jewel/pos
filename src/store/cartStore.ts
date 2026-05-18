import { create } from 'zustand';
import { CartItem } from '@/types';

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item) => {
    set((state) => {
      const existingItem = state.items.find((i) => i.productId === item.productId);
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId
              ? {
                  ...i,
                  quantity: i.quantity + item.quantity,
                  subtotal: i.price * (i.quantity + item.quantity),
                }
              : i
          ),
        };
      }
      return {
        items: [...state.items, item],
      };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId ? { ...i, quantity, subtotal: i.price * quantity } : i
      ),
    }));
  },

  clearCart: () => {
    set({ items: [] });
  },

  getSubtotal: () => {
    return get().items.reduce((total, item) => total + item.subtotal, 0);
  },

  getTotal: () => {
    return get().getSubtotal();
  },
}));

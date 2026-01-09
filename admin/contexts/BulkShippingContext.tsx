"use client";

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Order } from "@/lib/validators/order";
import type { BulkShippingData } from "@/components/admin/BulkShippingDrawer";

type BulkShippingContextType = {
  isOpen: boolean;
  selectedOrders: Order[];
  openBulkShipping: (orders: Order[]) => void;
  closeBulkShipping: () => void;
  updateSelectedOrders: (orders: Order[]) => void;
  onSubmit: ((data: BulkShippingData) => void) | null;
  setOnSubmit: (handler: (data: BulkShippingData) => void) => void;
};

const BulkShippingContext = createContext<BulkShippingContextType | undefined>(undefined);

export function BulkShippingProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);
  const [onSubmit, setOnSubmitHandler] = useState<((data: BulkShippingData) => void) | null>(null);

  const openBulkShipping = useCallback((orders: Order[]) => {
    setSelectedOrders(orders);
    setIsOpen(true);
  }, []);

  const closeBulkShipping = useCallback(() => {
    setIsOpen(false);
  }, []);

  const updateSelectedOrders = useCallback((orders: Order[]) => {
    setSelectedOrders(orders);
  }, []);

  const setOnSubmit = useCallback((handler: (data: BulkShippingData) => void) => {
    setOnSubmitHandler(() => handler);
  }, []);

  return (
    <BulkShippingContext.Provider value={{
      isOpen,
      selectedOrders,
      openBulkShipping,
      closeBulkShipping,
      updateSelectedOrders,
      onSubmit,
      setOnSubmit,
    }}>
      {children}
    </BulkShippingContext.Provider>
  );
}

export function useBulkShipping(): BulkShippingContextType {
  const context = useContext(BulkShippingContext);
  if (context === undefined) {
    throw new Error("useBulkShipping must be used within a BulkShippingProvider");
  }
  return context;
}

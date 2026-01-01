import React, { createContext, useContext, useCallback, useState } from "react";

type RefreshContextType = {
  refreshTransactions: () => void;
  refreshAccounts: () => void;
  refreshCategories: () => void;
  refreshStats: () => void;
  refreshAll: () => void;
  registerTransactionsRefresh: (refreshFn: () => void) => () => void;
  registerAccountsRefresh: (refreshFn: () => void) => () => void;
  registerCategoriesRefresh: (refreshFn: () => void) => () => void;
  registerStatsRefresh: (refreshFn: () => void) => () => void;
};

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [transactionsRefreshFn, setTransactionsRefreshFn] = useState<(() => void) | null>(null);
  const [accountsRefreshFn, setAccountsRefreshFn] = useState<(() => void) | null>(null);
  const [categoriesRefreshFn, setCategoriesRefreshFn] = useState<(() => void) | null>(null);
  const [statsRefreshFn, setStatsRefreshFn] = useState<(() => void) | null>(null);

  const registerTransactionsRefresh = useCallback((refreshFn: () => void) => {
    setTransactionsRefreshFn(() => refreshFn);
    // Return cleanup function
    return () => setTransactionsRefreshFn(null);
  }, []);

  const registerAccountsRefresh = useCallback((refreshFn: () => void) => {
    setAccountsRefreshFn(() => refreshFn);
    // Return cleanup function
    return () => setAccountsRefreshFn(null);
  }, []);

  const registerCategoriesRefresh = useCallback((refreshFn: () => void) => {
    setCategoriesRefreshFn(() => refreshFn);
    // Return cleanup function
    return () => setCategoriesRefreshFn(null);
  }, []);

  const registerStatsRefresh = useCallback((refreshFn: () => void) => {
    setStatsRefreshFn(() => refreshFn);
    // Return cleanup function
    return () => setStatsRefreshFn(null);
  }, []);

  const refreshTransactions = useCallback(() => {
    if (transactionsRefreshFn) {
      transactionsRefreshFn();
    }
  }, [transactionsRefreshFn]);

  const refreshAccounts = useCallback(() => {
    if (accountsRefreshFn) {
      accountsRefreshFn();
    }
  }, [accountsRefreshFn]);

  const refreshCategories = useCallback(() => {
    if (categoriesRefreshFn) {
      categoriesRefreshFn();
    }
  }, [categoriesRefreshFn]);

  const refreshStats = useCallback(() => {
    if (statsRefreshFn) {
      statsRefreshFn();
    }
  }, [statsRefreshFn]);

  const refreshAll = useCallback(() => {
    refreshTransactions();
    refreshAccounts();
    refreshCategories();
    refreshStats();
  }, [refreshTransactions, refreshAccounts, refreshCategories, refreshStats]);

  return (
    <RefreshContext.Provider
      value={{
        refreshTransactions,
        refreshAccounts,
        refreshCategories,
        refreshStats,
        refreshAll,
        registerTransactionsRefresh,
        registerAccountsRefresh,
        registerCategoriesRefresh,
        registerStatsRefresh,
      }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const context = useContext(RefreshContext);
  // Return a no-op implementation if context is not available
  if (context === undefined) {
    return {
      refreshTransactions: () => {},
      refreshAccounts: () => {},
      refreshCategories: () => {},
      refreshStats: () => {},
      refreshAll: () => {},
      registerTransactionsRefresh: () => () => {},
      registerAccountsRefresh: () => () => {},
      registerCategoriesRefresh: () => () => {},
      registerStatsRefresh: () => () => {},
    };
  }
  return context;
}


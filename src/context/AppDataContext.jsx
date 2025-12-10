import React, { createContext, useContext } from "react";
import axiosInstance from '@/services/AxiosInstance.js';
import { useQuery } from '@tanstack/react-query';

const AppDataContext = createContext();

export const AppDataProvider = ({ session, children }) => {
  const kdUser = session?.kd_user;

  const merchantQuery = useQuery({
    queryKey: ['merchant', kdUser],
    queryFn: async () => {
      const res = await axiosInstance().post('/merchant', { kdUser });
      return res.data?.data ?? null;
    },
    enabled: Boolean(kdUser),
  });

  const outletsQuery = useQuery({
    queryKey: ['outlets', kdUser],
    queryFn: async () => {
      const res = await axiosInstance().post('/outlets', { kdUser });
      const data = res?.data?.data;
      // Normalize to always be an array
      return Array.isArray(data) ? data : (data ? [data] : []);
    },
    enabled: Boolean(kdUser),
  });

  const loading = merchantQuery.isLoading || outletsQuery.isLoading;

  return (
    <AppDataContext.Provider
      value={{
        merchant: merchantQuery.data,
        outlets: outletsQuery.data ?? [],
        loading,
        refetchMerchant: merchantQuery.refetch,
        refetchOutlets: outletsQuery.refetch,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => useContext(AppDataContext);
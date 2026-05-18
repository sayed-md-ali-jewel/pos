import axios, { AxiosInstance } from 'axios';
import { useAuth } from '@/hooks/useAuth';

const apiClient = (token?: string): AxiosInstance => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const instance = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (token) {
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  return instance;
};

export default apiClient;

// src/api/axiosInstance.js
import { authStore } from "@/store/authStore";
import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
    process.env.EXPO_PUBLIC_API_ENDPOINT || "http://localhost:8000/api/v1",
  timeout: 10000,
});

axiosInstance.interceptors.request.use(async (config) => {
  const token = authStore.getState().token;
  console.log("Token from store:", token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default axiosInstance;

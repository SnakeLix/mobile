// src/api/axiosInstance.js
import { authStore } from "@/store/authStore";
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://4533-103-130-211-150.ngrok-free.app/api/v1",
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

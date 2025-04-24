import axios from "@/api/axiosInstance";
import {
  LoginRequest,
  Token,
  User,
  UserCreate,
  UserUpdate,
} from "@/types/user";

export const login = async (request: LoginRequest): Promise<Token> => {
  try {
    const response = await axios.post("/token", request);
    return response.data;
  } catch (error) {
    console.error("Login error:", error);
    throw error; // Rethrow the error to handle it in the calling function
  }
};

export const registerUser = async (userData: UserCreate): Promise<User> => {
  try {
    const response = await axios.post("/users", userData);
    return response.data;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
};

export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await axios.get("/users/me");
    return response.data;
  } catch (error) {
    console.error("Get current user error:", error);
    throw error;
  }
};

export const updateCurrentUser = async (
  userData: UserUpdate
): Promise<User> => {
  try {
    const response = await axios.put("/users/me", userData);
    return response.data;
  } catch (error) {
    console.error("Update user error:", error);
    throw error;
  }
};

export const getUsers = async (skip = 0, limit = 100): Promise<User[]> => {
  try {
    const response = await axios.get(`/users?skip=${skip}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error("Get users error:", error);
    throw error;
  }
};

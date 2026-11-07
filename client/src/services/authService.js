
import api from "./api";

export const registerUser = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post("/auth/login", credentials);

  const { token, user } = response.data.data;

  localStorage.setItem("reconcilex_token", token);
  localStorage.setItem("token", token);
  localStorage.setItem("reconcilex_user", JSON.stringify(user));

  return user;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data.data.user;
};

export const logoutUser = () => {
  localStorage.removeItem("reconcilex_token");
  localStorage.removeItem("token");
  localStorage.removeItem("reconcilex_user");
};

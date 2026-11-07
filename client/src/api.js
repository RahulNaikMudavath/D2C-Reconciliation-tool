
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the saved authentication token to API requests.
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("reconcilex_token") ||
      localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Automatically handle unauthorized/expired token responses.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const message = error.response?.data?.message;
      if (
        message === "Invalid or expired token." ||
        message === "Authentication required. Please log in." ||
        message === "Invalid authentication token."
      ) {
        localStorage.removeItem("reconcilex_token");
        localStorage.removeItem("token");
        localStorage.removeItem("reconcilex_user");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

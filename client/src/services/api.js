
import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:5000/api"),
});

// Attach the authentication token to API requests.
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("reconcilex_token") ||
    localStorage.getItem("token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Let the browser set the multipart boundary for FormData.
  if (config.data instanceof FormData) {
    if (config.headers?.delete) {
      config.headers.delete("Content-Type");
      config.headers.delete("content-type");
    } else if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  }

  return config;
});

// Automatically handle unauthorized/expired token responses.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || "";
      // Do not redirect if it is the login attempt itself failing due to invalid credentials
      if (!url.includes("/auth/login")) {
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

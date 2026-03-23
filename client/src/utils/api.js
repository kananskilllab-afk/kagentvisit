import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api'),
    withCredentials: true, // Crucial for httpOnly cookies
});

// Response interceptor for handling global errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Redirect to login or clear state if token expired
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

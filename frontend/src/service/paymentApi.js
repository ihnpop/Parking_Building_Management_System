import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:3636/api",
});

const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const createCheckoutPayment = (sessionId, amount) =>
    API.post("/payments/checkout", { sessionId, amount }, { headers: getAuthHeaders() });

export const createPackagePayment = (vehiclePackageId, amount, isRenewal) =>
    API.post("/payments/package", { vehiclePackageId, amount, isRenewal }, { headers: getAuthHeaders() });

export const getPaymentByOrderCode = (orderCode) =>
    API.get(`/payments/${orderCode}`);
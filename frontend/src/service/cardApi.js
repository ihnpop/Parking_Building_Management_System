import axios from "axios";
import supabase from "../config/supabaseClient";

const API = axios.create({
    // baseURL: "http://localhost:3636/api"     //sửa chỗ này
    baseURL: import.meta.env.VITE_API_URL
});

// Tự động lấy token Supabase mới nhất trước mỗi request
API.interceptors.request.use(async (config) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
        } else {
            const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
    } catch (err) {
        console.warn('[cardApi] Could not get session token:', err.message);
    }
    return config;
});


export const getCards = async () => {
    const response = await API.get("/cards/card")
    return response.data.data || response.data
}

export const getMonthCards = async () => {
    const response = await API.get("/cards/month-card")
    return response.data.data || response.data
}

export const getLostCards = async () => {
    const response = await API.get("/cards/lost-card")
    return response.data.data || response.data
}

export const getMonthCardLogs = async () => {
    const response = await API.get("/cards/month-card-logs")
    return response.data.data || response.data
}

export const createCard = async (payload) => {
    const response = await API.post("/cards/card", payload)
    return response.data.data || response.data
}

export const deleteCard = async (cardId, deletedBy) => {
    const response = await API.delete(`/cards/card/${cardId}`, {
        data: { deleted_by: deletedBy }
    })
    return response.data
}

export const createLostCard = async (payload) => {
    const response = await API.post("/cards/lost-card", payload);
    return response.data.data || response.data;
};

export const checkLostCardPlate = async (payload) => {
    const response = await API.post("/cards/lost-card/check-plate", payload);
    return response.data.data || response.data;
};

export const updateLostCard = async (reportId, payload) => {
    const response = await API.put(`/cards/lost-card/${reportId}`, payload);
    return response.data.data || response.data;
};

export const acceptLostCard = async (reportId) => {
    const response = await API.put(`/cards/lost-card/${reportId}/accept`);
    return response.data.data || response.data;
};

export const cancelLostCard = async (reportId, payload = {}) => {
    const response = await API.put(`/cards/lost-card/${reportId}/cancel`, payload);
    return response.data.data || response.data;
};

export const resolveLostCard = async (reportId, payload = {}) => {
    const response = await API.put(`/cards/lost-card/${reportId}/resolve`, payload);
    return response.data.data || response.data;
};

export const reissueCard = async (payload) => {
    const response = await API.post("/cards/lost-card/reissue", payload);
    return response.data.data || response.data;
};

export const confirmReissueCash = async (orderCode) => {
    const response = await API.post(`/cards/lost-card/confirm-reissue-cash/${orderCode}`);
    return response.data.data || response.data;
};

export const initiateLostTurnCardPayment = async (payload) => {
    const response = await API.post("/cards/lost-card/lost-turn-card-payment", payload);
    return response.data.data || response.data;
};

export const confirmLostTurnCardCash = async (orderCode) => {
    const response = await API.post(`/cards/lost-card/confirm-lost-turn-card-cash/${orderCode}`);
    return response.data.data || response.data;
};

export const getLostCardHistory = async () => {
    const response = await API.get("/cards/lost-card/history");
    return response.data.data || response.data;
};

export const updateCard = async (id, payload) => {
    const response = await API.put(
        `/cards/${id}`,
        payload
    );

    return response.data.data || response.data;
};

const getAuthHeaders = () => ({});

export const inviteUser = async (payload) => {
    // payload: { email, username, full_name, phone, role_id, building_id }
    const response = await API.post(`/users/invite`, payload);
    return response.data.data || response.data;
};


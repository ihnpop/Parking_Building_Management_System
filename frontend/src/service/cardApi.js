import axios from "axios"

const API = axios.create({
    // baseURL: "http://localhost:3636/api"     //sửa chỗ này
    baseURL: import.meta.env.VITE_API_URL
})

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

<<<<<<< HEAD
export const deleteCard = async (cardId) => {
    const response = await API.delete(`/cards/card/${cardId}`)
    return response.data
=======
// Gửi yêu cầu tạo báo mất thẻ mới đến API Backend
export const createLostCard = async (payload) => {
    const response = await API.post("/cards/lost-card", payload)
    return response.data.data || response.data
<<<<<<< HEAD
>>>>>>> Bao
}
=======
}

export const updateCard = async (id, payload) => {
    const response = await API.put(
        `/cards/${id}`,
        payload
    );

    return response.data.data || response.data;
};

const getAuthHeaders = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const inviteUser = async (payload) => {
    // payload: { email, username, full_name, phone, role_id, building_id }
    const response = await API.post(`/users/invite`, payload, {
        headers: getAuthHeaders()
    });
    return response.data.data || response.data;
};
>>>>>>> RegistrationFunction

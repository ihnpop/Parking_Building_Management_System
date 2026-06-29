import axios from "axios"

const API = axios.create({
    baseURL: "http://localhost:3636/api"
})

export const getCards = async () => {
    const response = await API.get("/cards/card")
    return response.data.data || response.data
}
export const getLostCards = async () => {
    const response = await API.get("/cards/lost-card")
    return response.data.data || response.data
}

export const createCard = async (payload) => {
    const response = await API.post("/cards/card", payload)
    return response.data.data || response.data
}

export const deleteCard = async (id, deletedBy) => {
    const response = await API.delete(`/cards/${id}`, {
        data: { deleted_by: deletedBy }
    })
    return response.data.data || response.data
}

// Gửi yêu cầu tạo báo mất thẻ mới đến API Backend
export const createLostCard = async (payload) => {
    const response = await API.post("/cards/lost-card", payload)
    return response.data.data || response.data
}

export const updateCard = async (id, payload) => {
    const response = await API.put(
        `/cards/${id}`,
        payload
    );

    return response.data.data || response.data;
};
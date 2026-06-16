import axios from "axios"

const API = axios.create({
    baseURL: "http://localhost:3636/api"
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

// Gửi yêu cầu tạo báo mất thẻ mới đến API Backend
export const createLostCard = async (payload) => {
    const response = await API.post("/cards/lost-card", payload)
    return response.data.data || response.data
}
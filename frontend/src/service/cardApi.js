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
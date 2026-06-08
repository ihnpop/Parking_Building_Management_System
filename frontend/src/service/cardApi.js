import axios from "axios"

const API = axios.create({
    baseURL: "http://localhost:3636/api"
})

export const getCards = async () => {
    const response = await API.get("/cards")
    return response.data.data || response.data
}

export const getMonthCards = async () => {
    const response = await API.get("/cards/month")
    return response.data.data || response.data
}

export const getLostCards = async () => {
    const response = await API.get("/cards/lost")
    return response.data.data || response.data
}

export const getMonthCardLogs = async () => {
    const response = await API.get("/cards/month-logs")
    return response.data.data || response.data
}
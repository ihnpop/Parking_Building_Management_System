import * as cardService from "../service/cardService.js";

export const getCards = async (req, res) => {
  try {
    const cards = await cardService.getCards();
    res.status(200).json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMonthCards = async (req, res) => {
  try {
    const monthCards = await cardService.getMonthCards();
    res.status(200).json(monthCards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getLostCards = async (req, res) => {
  try {
    const lostCards = await cardService.getLostCards();
    res.status(200).json(lostCards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMonthCardLogs = async (req, res) => {
  try {
    const logs = await cardService.getMonthCardLogs();
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

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

export const getMonthCardLogs = async (req, res) => {
  try {
    const logs = await cardService.getMonthCardLogs();
    res.status(200).json(logs);
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


export const getLostLogs = async (req, res) => {
  try {
    // Gọi đến hàm xử lý dữ liệu ở tầng Service mà bạn vừa viết ở phần 2.1
    const logs = await cardService.getLostCardLogs();

    // Trả về dữ liệu dạng JSON với mã trạng thái thành công 200 cho Frontend
    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error("Lỗi tại cardController - getLostLogs:", error);
    // Trả về lỗi 500 nếu hệ thống gặp sự cố bất ngờ
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy danh sách nhật ký mất thẻ."
    });
  }
};
// Delete a card by id
export const deleteCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleted_by } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Thiếu card_id.' });
    
    await cardService.deleteCard(id, deleted_by);
    res.status(200).json({
      success: true,
      message: "Card deleted successfully"
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// Create a new card
export const createCard = async (req, res) => {
  try {
    const { type, startDate, plate, fullName, phone, email, durationMonths } = req.body;
    const newCard = await cardService.createCard({ type, startDate, plate, fullName, phone, email, durationMonths });
    res.status(201).json(newCard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

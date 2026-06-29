import * as cardService from "../service/cardService.js";

export const getCards = async (req, res) => {
  try {
    const cards = await cardService.getCards();
    res.status(200).json(cards);
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
      message: "Xóa card thành công"
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

    // Kiểm tra định dạng biển số xe nếu có nhập
    if (plate && plate.trim() !== '') {
      const rawPlate = plate.replace(/[\s.\-]/g, '').toUpperCase();
      const plateRegex = /^\d{2}[A-Z]\d{4,5}$/;
      if (!plateRegex.test(rawPlate)) {
        return res.status(400).json({
          error: 'Biển số xe không đúng định dạng. Vui lòng nhập theo định dạng xx[A-Z]xxxx hoặc xx[A-Z]xxxxx (Ví dụ: 30K12345 hoặc 59X312345).'
        });
      }
    }

    const newCard = await cardService.createCard({
      type,
      startDate,
      plate,
      fullName,
      phone,
      email,
      durationMonths
    });
    res.status(201).json(newCard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Ghi nhận yêu cầu báo mất thẻ từ phía Client
export const createLostCard = async (req, res) => {
  try {
    // Gọi Service xử lý nghiệp vụ kiểm tra và thêm báo mất thẻ
    const result = await cardService.createLostCard(req.body);

    // Trả về kết quả thành công HTTP 201 cho Client
    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    // Trả về thông báo lỗi HTTP 500 khi xử lý thất bại hoặc không tìm thấy thẻ/xe
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateCard = async (
  req,
  res
) => {
  try {

    const { id } = req.params;

    const result =
      await cardService.updateCard(
        id,
        req.body
      );

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
};
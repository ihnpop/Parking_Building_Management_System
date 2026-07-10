import * as cardService from "../service/cardService.js";

export const getCards = async (req, res) => {
  try {
    const cards = await cardService.getCards();
    res.status(200).json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const { type, startDate, plate, fullName, phone, email, durationMonths, replacesLostReportId } = req.body;

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

    // Lấy địa chỉ IP của client (dùng cho VNPay khi cấp lại thẻ tháng)
    let ipAddr = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    if (ipAddr === '::1' || ipAddr.includes('::ffff:')) {
      ipAddr = '127.0.0.1';
    }

    const result = await cardService.createCard({
      type,
      startDate,
      plate,
      fullName,
      phone,
      email,
      durationMonths,
      replacesLostReportId,
      ipAddr
    });

    // Trả về thẻ mới kèm link thanh toán VNPay (nếu có — trường hợp cấp lại thẻ)
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
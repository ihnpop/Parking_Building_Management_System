import * as lostCardService from "../service/lostCardService.js";

export const getLostCards = async (req, res) => {
  try {
    const lostCards = await lostCardService.getLostCards();
    res.status(200).json(lostCards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getLostLogs = async (req, res) => {
  try {
    const logs = await lostCardService.getLostCardLogs();

    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error("Lỗi tại lostCardController - getLostLogs:", error);
    return res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy danh sách nhật ký mất thẻ."
    });
  }
};

export const createLostCard = async (req, res) => {
  try {
    const performedBy = req.user?.id;

    if (!performedBy) {
      return res.status(401).json({
        success: false,
        message: "Không xác định được người thực hiện. Vui lòng đăng nhập lại."
      });
    }

    const result = await lostCardService.createLostCard({
      ...req.body,
      performedBy
    });

    return res.status(201).json({
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

export const acceptLostCard = async (req, res) => {
  try {
    const performedBy = req.user?.id;
    if (!performedBy) {
      return res.status(401).json({ success: false, message: "Không xác định được người thực hiện. Vui lòng đăng nhập lại." });
    }

    const { reportId } = req.params;
    const result = await lostCardService.acceptLostCardReport({ reportId, performedBy });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * PUT /lost-card/:reportId/cancel
 * Hủy report mất thẻ do nhân viên tạo nhầm (chỉ khi report còn 'Đang chờ').
 */
export const cancelLostCard = async (req, res) => {
  try {
    const performedBy = req.user?.id;
    if (!performedBy) {
      return res.status(401).json({ success: false, message: "Không xác định được người thực hiện. Vui lòng đăng nhập lại." });
    }

    const { reportId } = req.params;
    const { note } = req.body;

    const result = await lostCardService.cancelLostCardReport({ reportId, performedBy, note });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * PUT /lost-card/:reportId/resolve
 * Hủy thẻ vĩnh viễn (chuyển report sang 'Đã hủy thẻ').
 */
export const resolveLostCard = async (req, res) => {
  try {
    const performedBy = req.user?.id;
    if (!performedBy) {
      return res.status(401).json({ success: false, message: "Không xác định được người thực hiện. Vui lòng đăng nhập lại." });
    }

    const { reportId } = req.params;
    const { note } = req.body;

    const result = await lostCardService.resolveLostCardReport({ reportId, performedBy, note });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllHistory = async (req, res) => {
  try {
    const history = await lostCardService.getAllHistory();
    return res.status(200).json({ success: true, data: history });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * POST /lost-card/reissue
 * Cấp lại thẻ RFID cho thẻ tháng bị mất (update-in-place).
 * Body: { cardId, newCode, reportId, paymentMethod }
 */
export const reissueCard = async (req, res) => {
  try {
    const performedBy = req.user?.id;
    if (!performedBy) {
      return res.status(401).json({
        success: false,
        message: "Không xác định được người thực hiện. Vui lòng đăng nhập lại."
      });
    }

    const { cardId, newCode, reportId, paymentMethod } = req.body;

    let ipAddr = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    if (ipAddr === '::1' || ipAddr.includes('::ffff:')) {
      ipAddr = '127.0.0.1';
    }

    const result = await lostCardService.reissueCard({
      cardId,
      newCode,
      reportId,
      performedBy,
      ipAddr,
      paymentMethod
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * POST /lost-card/confirm-reissue-cash/:orderCode
 * Xác nhận thu tiền mặt cho phí cấp lại thẻ tháng.
 */
export const confirmReissueCash = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const result = await lostCardService.confirmReissueCash(orderCode);
    return res.status(200).json({ success: true, message: "Xác nhận thu tiền mặt thành công!", data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * POST /lost-card/lost-turn-card-payment
 * Khởi tạo giao dịch thanh toán mất thẻ lượt (Phí gửi xe + Phí mất thẻ 50k)
 */
export const initiateLostTurnCardPayment = async (req, res) => {
  try {
    const performedBy = req.user?.id;
    if (!performedBy) {
      return res.status(401).json({
        success: false,
        message: "Không xác định được người thực hiện. Vui lòng đăng nhập lại."
      });
    }

    const { reportId, paymentMethod } = req.body;

    let ipAddr = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    if (ipAddr === '::1' || ipAddr.includes('::ffff:')) {
      ipAddr = '127.0.0.1';
    }

    const result = await lostCardService.initiateLostTurnCardPayment({
      reportId,
      paymentMethod,
      ipAddr,
      performedBy
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * POST /lost-card/confirm-lost-turn-card-cash/:orderCode
 * Xác nhận thu tiền mặt cho phí mất thẻ lượt.
 */
export const confirmLostTurnCardCash = async (req, res) => {
  try {
    const { orderCode } = req.params;
    const result = await lostCardService.confirmLostTurnCardCash(orderCode);
    return res.status(200).json({ success: true, message: "Xác nhận thu tiền mặt thành công!", data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * POST /lost-card/check-plate
 * Kiểm tra thực tế thông tin biển số và thẻ hoạt động trong DB
 */
export const checkLostCardPlate = async (req, res) => {
  try {
    const { plate_number, card_category } = req.body;
    const result = await lostCardService.checkLostCardPlate({ plate_number, card_category });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * PUT /lost-card/:reportId
 * Cập nhật lý do và ảnh của báo cáo mất thẻ
 */
export const updateLostCard = async (req, res) => {
  try {
    const { reportId } = req.params;
    const result = await lostCardService.updateLostCardReport(reportId, req.body);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
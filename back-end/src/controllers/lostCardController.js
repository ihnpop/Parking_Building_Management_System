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

export const resolveLostCard = async (req, res) => {
  try {
    const performedBy = req.user?.id;
    if (!performedBy) {
      return res.status(401).json({ success: false, message: "Không xác định được người thực hiện. Vui lòng đăng nhập lại." });
    }

    const { reportId } = req.params;
    const { resolution, note } = req.body;

    const result = await lostCardService.resolveLostCardReport({ reportId, performedBy, resolution, note });

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

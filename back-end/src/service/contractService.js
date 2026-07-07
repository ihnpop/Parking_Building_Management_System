import supabase from "../config/supabaseClient.js";
import * as contractRepository from "../repositories/contractRepository.js";
import axios from "axios";
import crypto from "crypto";

/**
 * Lấy chi tiết thông tin đăng ký để phục vụ tạo hợp đồng
 */
const getRegistrationDetails = async (registrationId) => {
  const { data, error } = await supabase
    .from('card_registrations')
    .select(`
      registration_id,
      status,
      created_at,
      card_id,
      vehicle_id,
      vehicle (
        plate_number,
        vehicle_type (
          name
        ),
        customer (
          customer_id,
          full_name,
          phone,
          email
        )
      ),
      card (
        code,
        type,
        expired_date
      )
    `)
    .eq('registration_id', registrationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Không tìm thấy thông tin đăng ký thẻ.");
  return data;
};

/**
 * Gửi email hợp đồng qua Resend API
 */
const sendEmailViaResend = async (toEmail, customerName, contractNo, signLink) => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.MAIL_FROM || "onboarding@resend.dev";

  if (!apiKey) {
    throw new Error("Chưa cấu hình RESEND_API_KEY trong file .env");
  }

  const subject = `[PBMS] Yêu cầu ký hợp đồng đăng ký vé tháng gửi xe - Số ${contractNo}`;
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fffaf7;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #ff8c00;">
        <h2 style="color: #ff8c00; margin: 0; font-size: 24px;">HỆ THỐNG QUẢN LÝ BÃI XE PBMS</h2>
        <p style="color: #718096; margin: 5px 0 0 0; font-size: 14px;">Số 1 Đại Cồ Việt, Bách Khoa, Hai Bà Trưng, Hà Nội</p>
      </div>
      
      <div style="padding: 24px 0; color: #2d3748; line-height: 1.6;">
        <p style="font-size: 16px; font-weight: bold;">Kính chào Quý khách ${customerName},</p>
        
        <p>Yêu cầu đăng ký vé tháng gửi xe của quý khách đã được duyệt thành công trên hệ thống PBMS.</p>
        <p>Để hoàn tất thủ tục và kích hoạt thẻ tháng, quý khách vui lòng xem qua điều khoản và xác nhận ký hợp đồng điện tử bằng cách click vào nút bên dưới:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${signLink}" target="_blank" style="background-color: #ff8c00; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(255, 140, 0, 0.2);">
            Xem và Ký Hợp Đồng
          </a>
        </div>

        <p style="font-size: 13px; color: #718096; text-align: center; margin-top: -10px;">
          (Link ký hợp đồng này có giá trị hiệu lực trong vòng 7 ngày)
        </p>
        
        <div style="background-color: #ffffff; border: 1px dashed #cbd5e0; padding: 15px; border-radius: 8px; margin-top: 20px;">
          <h4 style="margin: 0 0 10px 0; color: #2d3748;">Thông tin tóm tắt:</h4>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #718096; width: 40%;">Mã hợp đồng:</td>
              <td style="padding: 4px 0; font-weight: bold;">${contractNo}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #718096;">Họ và tên:</td>
              <td style="padding: 4px 0; font-weight: bold;">${customerName}</td>
            </tr>
          </table>
        </div>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #a0aec0; font-size: 12px;">
        <p style="margin: 0;">Đây là email tự động từ hệ thống. Quý khách vui lòng không phản hồi email này.</p>
        <p style="margin: 5px 0 0 0;">© 2026 Ban quản lý bãi xe PBMS. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    const response = await axios.post(
      "https://api.resend.com/emails",
      {
        from: `BQL Bãi Xe PBMS <${fromEmail}>`,
        to: [toEmail],
        subject: subject,
        html: htmlContent
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Resend API Email sending error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Không thể gửi mail qua cổng Resend.");
  }
};

/**
 * Tạo & Gửi Email ký hợp đồng cho khách hàng
 */
export const sendContract = async (registrationId) => {
  // 1. Lấy chi tiết thông tin đăng ký
  const reg = await getRegistrationDetails(registrationId);
  const customer = reg.vehicle?.customer;

  if (!customer || !customer.email) {
    throw new Error("Khách hàng chưa đăng ký địa chỉ email hoặc thông tin không hợp lệ.");
  }

  // 2. Tạo mã số hợp đồng: HD-[Mã Thẻ]/PBMS
  const cardCode = reg.card?.code || "RFID";
  const contractNo = `HD-${cardCode}/PBMS`;

  // 3. Kiểm tra xem đã có bản ghi hợp đồng nào chưa
  let contract = await contractRepository.findByRegistrationId(registrationId);
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 ngày hiệu lực

  if (contract) {
    // Nếu hợp đồng đã ký rồi thì không cho gửi lại
    if (contract.status === "Đã ký") {
      throw new Error("Hợp đồng này đã được ký trước đó và đang có hiệu lực.");
    }
    // Cập nhật token mới và gia hạn link
    contract = await contractRepository.updateContract(contract.contract_id, {
      sign_token: token,
      token_expires_at: expiresAt,
      sent_at: new Date().toISOString(),
      status: "Chờ ký"
    });
  } else {
    // Tạo bản ghi hợp đồng mới
    contract = await contractRepository.createContract({
      registrationId,
      contractNo,
      status: "Chờ ký",
      signToken: token,
      tokenExpiresAt: expiresAt,
      sentAt: new Date().toISOString()
    });
  }

  // 4. Tạo đường link ký hợp đồng
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const signLink = `${frontendUrl}/sign-contract/${token}`;

  // 5. Gửi email qua Resend
  await sendEmailViaResend(customer.email, customer.full_name, contractNo, signLink);

  return {
    success: true,
    message: "Gửi email yêu cầu ký hợp đồng thành công.",
    contractId: contract.contract_id,
    contractNo: contract.contract_no,
    status: contract.status
  };
};

/**
 * Lấy chi tiết hợp đồng qua token (Public endpoint)
 */
export const getContractByToken = async (token) => {
  const contract = await contractRepository.findByToken(token);
  if (!contract) {
    throw new Error("Mã xác thực hợp đồng không tồn tại.");
  }

  // Lấy chi tiết thẻ từ monthCardService
  const cardId = contract.card_registrations?.card_id;
  if (!cardId) {
    throw new Error("Không tìm thấy thông tin thẻ liên kết với hợp đồng.");
  }

  // Import động để tránh vòng lặp phụ thuộc (circular dependency)
  const monthCardService = await import("./monthCardService.js");
  const cardDetails = await monthCardService.getCardDetailsForContract(cardId);

  return {
    contract_id: contract.contract_id,
    contract_no: contract.contract_no,
    status: contract.status,
    token_expires_at: contract.token_expires_at,
    signed_at: contract.signed_at,
    cardDetails
  };
};

/**
 * Đồng ý ký hợp đồng
 */
export const signContract = async (token, ipAddress) => {
  const contract = await contractRepository.findByToken(token);
  if (!contract) {
    throw new Error("Không tìm thấy hợp đồng hợp lệ.");
  }

  if (contract.status === "Đã ký") {
    throw new Error("Hợp đồng này đã được ký trước đó.");
  }

  // Kiểm tra thời hạn link ký
  const now = new Date();
  const expiresAt = new Date(contract.token_expires_at);
  if (now > expiresAt) {
    await contractRepository.updateContract(contract.contract_id, { status: "Hết hạn" });
    throw new Error("Liên kết ký hợp đồng này đã hết hạn hiệu lực (quá 7 ngày).");
  }

  // Cập nhật trạng thái hợp đồng thành Đã ký
  const updatedContract = await contractRepository.updateContract(contract.contract_id, {
    status: "Đã ký",
    signed_at: now.toISOString(),
    signed_ip: ipAddress || null
  });

  return {
    success: true,
    message: "Ký hợp đồng thành công!",
    contractNo: updatedContract.contract_no,
    signedAt: updatedContract.signed_at
  };
};

/**
 * Lấy trạng thái hợp đồng theo registrationId
 */
export const getContractStatus = async (registrationId) => {
  const contract = await contractRepository.findByRegistrationId(registrationId);
  if (!contract) {
    return { status: "Chưa gửi" };
  }
  return {
    status: contract.status,
    contractNo: contract.contract_no,
    sentAt: contract.sent_at,
    signedAt: contract.signed_at
  };
};

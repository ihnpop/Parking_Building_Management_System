import React, { forwardRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import "./ContractDocument.css";

/**
 * Component hiển thị tờ Hợp đồng đăng ký thẻ tháng dạng giấy A4
 * Dùng chung cho cả Admin Modal (ContractModal) và Trang Ký Public (ContractSignPage)
 */
const ContractDocument = forwardRef(({ data = {}, signedSuccess = false }, ref) => {
  const {
    contractNo = 'HD-RFID/PBMS',
    customerName = '---',
    phone = '---',
    email = '---',
    cccdNumber = '---',
    cardCode = '---',
    plateNumber = '---',
    vehicleType = '---',
    startDate = '---',
    endDate = '---',
    priceDisplay = '---',
    paymentStatus = 'Đã thanh toán',
    signedIp = '---',
    signedAt = null
  } = data;

  return (
    <div className="contract-paper" ref={ref}>
      {/* Quốc hiệu */}
      <div className="contract-national-title">
        <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
        <p>Độc lập - Tự do - Hạnh phúc</p>
        <div className="line-separator"></div>
      </div>

      {/* Tên hợp đồng */}
      <div className="contract-title">
        <h2>HỢP ĐỒNG ĐĂNG KÝ thẻ THÁNG GỬI XE</h2>
        <p>Số: {contractNo}</p>
      </div>

      {/* Lời mở đầu */}
      <div className="contract-intro">
        Căn cứ các nội quy, quy định vận hành của hệ thống bãi xe và nhu cầu đăng ký gửi phương tiện của khách hàng, hôm nay hai bên thống nhất ký kết hợp đồng gửi xe tháng với các điều khoản dưới đây:
      </div>

      {/* Thông tin Bên A */}
      <div className="contract-section-title">Bên A: Ban quản lý tòa nhà &amp; bãi xe PBMS (Bên cho thuê)</div>
      <div className="contract-party-info">
        <p><strong>- Người đại diện:</strong> Ban Quản lý Bãi xe PBMS</p>
        <p><strong>- Địa chỉ:</strong> Số 1 Đại Cồ Việt, Bách Khoa, Hai Bà Trưng, Hà Nội</p>
        <p><strong>- Số điện thoại liên hệ:</strong> 1900 1234</p>
      </div>

      {/* Thông tin Bên B */}
      <div className="contract-section-title">Bên B: Khách hàng đăng ký thẻ tháng (Bên gửi xe)</div>
      <div className="contract-party-info">
        <p><strong>- Họ và tên khách hàng:</strong> {customerName}</p>
        <p><strong>- Số điện thoại:</strong> {phone}</p>
        <p><strong>- Địa chỉ email:</strong> {email}</p>
        <p><strong>- Số CCCD/Định danh:</strong> {cccdNumber}</p>
      </div>

      {/* Bảng chi tiết dịch vụ */}
      <div className="contract-section-title">Thông tin thẻ tháng và phương tiện đăng ký:</div>
      <table className="contract-table">
        <thead>
          <tr>
            <th>Danh mục thông tin</th>
            <th>Nội dung chi tiết</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Số thẻ RFID (Mã thẻ tháng)</td>
            <td>{cardCode}</td>
          </tr>
          <tr>
            <td>Biển số xe đăng ký</td>
            <td>{plateNumber}</td>
          </tr>
          <tr>
            <td>Loại phương tiện</td>
            <td>{vehicleType}</td>
          </tr>
          <tr>
            <td>Ngày bắt đầu hiệu lực</td>
            <td>{startDate}</td>
          </tr>
          <tr>
            <td>Ngày hết hạn hiệu lực</td>
            <td>{endDate}</td>
          </tr>
          <tr>
            <td>Đơn giá cước dịch vụ</td>
            <td>{priceDisplay}</td>
          </tr>
          <tr>
            <td>Trạng thái thanh toán</td>
            <td>{paymentStatus}</td>
          </tr>
        </tbody>
      </table>

      {/* Điều khoản sử dụng */}
      <div className="contract-section-title">Điều khoản và trách nhiệm:</div>
      <div className="contract-terms">
        <p>1. Bên B có trách nhiệm tự bảo quản thẻ gửi xe RFID được cấp, không cho người khác mượn thẻ. Mất thẻ phải thông báo ngay cho Bên A để khóa thẻ kịp thời. Phí làm lại thẻ là 50.000 VNĐ.</p>
        <p>2. Bên B phải đỗ xe đúng vị trí phân làn quy định của từng loại xe, tuân thủ hướng dẫn điều phối của nhân viên bãi xe và tuân thủ các quy tắc an toàn phòng cháy chữa cháy.</p>
        <p>3. Bên A chịu trách nhiệm vận hành hệ thống kiểm soát xe vào/ra bằng thẻ và camera giám sát, không chịu trách nhiệm bảo quản tài sản riêng tư cá nhân để bên trong xe.</p>
        <p>4. Hợp đồng có giá trị hiệu lực trong khoảng thời gian hiệu lực ghi nhận phía trên. Bên B cần hoàn thành gia hạn tối thiểu 3 ngày trước khi hết hạn gửi xe để duy trì thẻ hoạt động.</p>
      </div>

      {/* Chữ ký hai bên */}
      <div className="contract-signatures">
        <div className="contract-sign-block">
          <p>ĐẠI DIỆN BÊN A</p>
          <p>(Ký và đóng dấu)</p>
          <div className="contract-stamp-wrapper">
            <img
              src="/assets/stamp.jpg"
              alt="Con dấu BQL Bãi Xe PBMS"
              className="contract-stamp-img"
            />
          </div>
          <p className="signed-name">BQL Bãi Xe PBMS</p>
        </div>
        <div className="contract-sign-block">
          <p>ĐẠI DIỆN BÊN B</p>
          <p>(Đồng ý ký điện tử)</p>
          <div className="contract-stamp-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '130px' }}>
            {signedSuccess ? (
              <div style={{ textAlign: 'center', color: '#10b981' }}>
                <CheckCircle2 size={36} />
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', fontWeight: 600 }}>ĐÃ KÝ ĐIỆN TỬ</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: '#718096' }}>
                  IP: {signedIp}
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: '#718096' }}>
                  {signedAt ? new Date(signedAt).toLocaleString('vi-VN') : ''}
                </p>
              </div>
            ) : (
              <div style={{ fontStyle: 'italic', fontSize: '13px', color: '#a0aec0' }}>
                Chưa ký
              </div>
            )}
          </div>
          <p className="signed-name">{customerName}</p>
        </div>
      </div>
    </div>
  );
});

ContractDocument.displayName = 'ContractDocument';
export default ContractDocument;

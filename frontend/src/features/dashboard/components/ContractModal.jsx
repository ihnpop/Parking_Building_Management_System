import { useState } from 'react';
import axios from 'axios';
import { XCircle, Download, Loader2, X } from 'lucide-react';
import { useNotification } from '../../../context/NotificationContext';

export default function ContractModal({ isOpen, onClose, cardData }) {
  const { showToast } = useNotification();
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !cardData) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      
      const token = localStorage.getItem("token") || localStorage.getItem("accessToken") || localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Gọi API tải PDF với responseType là blob
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/month-card/${cardData.card_id}/contract`,
        {
          responseType: 'blob',
          headers
        }
      );

      // Tạo đường dẫn tạm thời trong bộ nhớ RAM trình duyệt
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);

      // Tạo ngầm thẻ liên kết ẩn để tải xuống
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Hop_Dong_Ve_Thang_${cardData.cardNo}.pdf`;
      document.body.appendChild(link);
      
      // Kích hoạt sự kiện tải xuống
      link.click();

      // Giải phóng bộ nhớ và dọn dẹp phần tử ẩn khỏi DOM
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      showToast("Tải hợp đồng thành công!", "success");
    } catch (error) {
      console.error("Lỗi khi tải tệp hợp đồng:", error);
      showToast("Không thể tải tệp hợp đồng. Vui lòng thử lại sau!", "error");
    } finally {
      setDownloading(false);
    }
  };

  // Ước tính đơn giá gói cước gửi xe dựa vào loại xe (đơn giá mẫu để hiển thị)
  const priceDisplay = cardData.type === 'Ô tô' ? '850.000 VNĐ' : '300.000 VNĐ';

  return (
    <div className="contract-overlay" onClick={onClose}>
      <div className="contract-container" onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div className="contract-header">
          <h3>Hợp đồng đăng ký thẻ tháng</h3>
          <button className="contract-close-top" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Nội dung Hợp đồng dạng A4 Read-only */}
        <div className="contract-body">
          <div className="contract-paper">
            {/* Quốc hiệu */}
            <div className="contract-national-title">
              <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p>Độc lập - Tự do - Hạnh phúc</p>
              <div className="line-separator"></div>
            </div>

            {/* Tên hợp đồng */}
            <div className="contract-title">
              <h2>HỢP ĐỒNG ĐĂNG KÝ VÉ THÁNG GỬI XE</h2>
              <p>Số: HD-{cardData.cardNo}/PBMS</p>
            </div>

            {/* Lời mở đầu */}
            <div className="contract-intro">
              Căn cứ các nội quy, quy định vận hành của hệ thống bãi xe và nhu cầu đăng ký gửi phương tiện của khách hàng, hôm nay hai bên thống nhất ký kết hợp đồng gửi xe tháng với các điều khoản dưới đây:
            </div>

            {/* Thông tin Bên A */}
            <div className="contract-section-title">Bên A: Ban quản lý tòa nhà & bãi xe PBMS (Bên cho thuê)</div>
            <div className="contract-party-info">
              <p><strong>- Người đại diện:</strong> Ban Quản lý Bãi xe PBMS</p>
              <p><strong>- Địa chỉ:</strong> Số 1 Đại Cồ Việt, Bách Khoa, Hai Bà Trưng, Hà Nội</p>
              <p><strong>- Số điện thoại liên hệ:</strong> 1900 1234</p>
            </div>

            {/* Thông tin Bên B */}
            <div className="contract-section-title">Bên B: Khách hàng đăng ký thẻ tháng (Bên gửi xe)</div>
            <div className="contract-party-info">
              <p><strong>- Họ và tên khách hàng:</strong> {cardData.customer || '---'}</p>
              <p><strong>- Số điện thoại:</strong> {cardData.phone || '---'}</p>
              <p><strong>- Địa chỉ email:</strong> {cardData.email || '---'}</p>
              <p><strong>- Số CCCD/Định danh:</strong> {cardData.cccd_number || '---'}</p>
            </div>

            {/* Bảng chi tiết dịch vụ */}
            <div className="contract-section-title">Thông tin vé tháng và phương tiện đăng ký:</div>
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
                  <td>{cardData.cardNo}</td>
                </tr>
                <tr>
                  <td>Biển số xe đăng ký</td>
                  <td>{cardData.plate || '---'}</td>
                </tr>
                <tr>
                  <td>Loại phương tiện</td>
                  <td>{cardData.type || '---'}</td>
                </tr>
                <tr>
                  <td>Ngày bắt đầu hiệu lực</td>
                  <td>{cardData.startDate || '---'}</td>
                </tr>
                <tr>
                  <td>Ngày hết hạn hiệu lực</td>
                  <td>{cardData.endDate || '---'}</td>
                </tr>
                <tr>
                  <td>Đơn giá cước dịch vụ</td>
                  <td>{priceDisplay}</td>
                </tr>
                <tr>
                  <td>Trạng thái thanh toán</td>
                  <td>Đã thanh toán</td>
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
                <p>(Ký và ghi rõ họ tên)</p>
                <p className="signed-name">BQL Bãi Xe PBMS</p>
              </div>
              <div className="contract-sign-block">
                <p>ĐẠI DIỆN BÊN B</p>
                <p>(Ký và ghi rõ họ tên)</p>
                <p className="signed-name">{cardData.customer || '---'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal với các nút hành động */}
        <div className="contract-footer">
          <button 
            type="button" 
            className="contract-btn contract-btn-close" 
            onClick={onClose}
            disabled={downloading}
          >
            <XCircle size={18} />
            Đóng
          </button>
          <button 
            type="button" 
            className="contract-btn contract-btn-download" 
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Đang tải...
              </>
            ) : (
              <>
                <Download size={18} />
                Tải hợp đồng (.pdf)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getContractByToken, signContract } from '../../../service/contractApi';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function ContractSignPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState(null);
  const [contractData, setContractData] = useState(null);
  const [signedSuccess, setSignedSuccess] = useState(false);

  useEffect(() => {
    const fetchContract = async () => {
      try {
        setLoading(true);
        const data = await getContractByToken(token);
        setContractData(data);
        if (data.status === 'Đã ký') {
          setSignedSuccess(true);
        }
      } catch (err) {
        console.error('Error fetching contract:', err);
        setError(err.response?.data?.error || err.message || 'Không thể tải thông tin hợp đồng. Vui lòng kiểm tra lại đường dẫn.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchContract();
    }
  }, [token]);

  const handleSign = async () => {
    try {
      setSigning(true);
      setError(null);
      await signContract(token);
      setSignedSuccess(true);
      setContractData(prev => ({ ...prev, status: 'Đã ký' }));
    } catch (err) {
      console.error('Error signing contract:', err);
      setError(err.response?.data?.error || err.message || 'Có lỗi xảy ra khi ký hợp đồng.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="sign-page-loading">
        <Loader2 className="animate-spin text-blue-600" size={48} style={{ color: 'var(--primary, #2563eb)' }} />
        <p style={{ marginTop: '16px', fontSize: '18px', fontWeight: 600, color: '#4a5568' }}>Đang tải hợp đồng...</p>
      </div>
    );
  }

  if (error && !contractData) {
    return (
      <div className="sign-page-error-container">
        <div className="sign-page-error-card">
          <AlertCircle size={48} style={{ color: '#ef4444' }} />
          <h2 style={{ margin: '16px 0 8px', fontSize: '20px', color: '#1a202c' }}>Lỗi Tải Hợp Đồng</h2>
          <p style={{ color: '#718096', lineHeight: 1.6, marginBottom: '24px' }}>{error}</p>
          <a href="/login" className="sign-btn-secondary" style={{ textDecoration: 'none' }}>
            Về Trang Chủ PBMS
          </a>
        </div>
      </div>
    );
  }

  const { cardDetails } = contractData || {};
  const priceDisplay = cardDetails?.package?.price
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cardDetails.package.price)
    : '---';

  return (
    <div className="sign-page-layout">
      {/* Top Banner */}
      <div className="sign-page-header">
        <div className="sign-header-content">
          <div className="sign-brand-title">
            <span style={{ color: 'var(--primary, #2563eb)', fontWeight: 'bold' }}>PBMS</span> CONTRACT PORTAL
          </div>
          <div className="sign-security-badge">
            <ShieldCheck size={16} />
            Hệ thống ký hợp đồng điện tử bảo mật
          </div>
        </div>
      </div>

      <div className="sign-page-main">
        {/* Success message or signing panel */}
        {signedSuccess ? (
          <div className="sign-success-panel">
            <div className="success-icon-wrapper">
              <CheckCircle2 size={40} style={{ color: '#10b981' }} />
            </div>
            <div className="success-text-wrapper">
              <h3>Hợp đồng đã ký thành công</h3>
              <p>Cảm ơn quý khách đã hoàn thành ký hợp đồng điện tử đăng ký vé xe tháng.</p>
              <p style={{ fontSize: '13px', color: '#718096', marginTop: '4px' }}>
                Mã hợp đồng: <strong>{contractData?.contract_no}</strong>
              </p>
            </div>
          </div>
        ) : (
          <div className="sign-action-panel">
            <div className="action-text-wrapper">
              <h3>Xác nhận ký hợp đồng điện tử</h3>
              <p>Quý khách vui lòng kiểm tra kỹ thông tin bên dưới. Nhấp nút <strong>"Tôi đồng ý ký hợp đồng"</strong> để hoàn tất.</p>
            </div>
            <button
              onClick={handleSign}
              disabled={signing}
              className="sign-btn-primary"
            >
              {signing ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Đang ghi nhận chữ ký...
                </>
              ) : (
                'Tôi đồng ý ký hợp đồng'
              )}
            </button>
          </div>
        )}

        {/* Contract visual document (A4 Paper) */}
        <div className="contract-paper-wrapper">
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
              <p>Số: {contractData?.contract_no}</p>
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
              <p><strong>- Họ và tên khách hàng:</strong> {cardDetails?.customer?.full_name || '---'}</p>
              <p><strong>- Số điện thoại:</strong> {cardDetails?.customer?.phone || '---'}</p>
              <p><strong>- Địa chỉ email:</strong> {cardDetails?.customer?.email || '---'}</p>
              <p><strong>- Số CCCD/Định danh:</strong> {cardDetails?.customer?.cccd_number || '---'}</p>
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
                  <td>{cardDetails?.card_code || '---'}</td>
                </tr>
                <tr>
                  <td>Biển số xe đăng ký</td>
                  <td>{cardDetails?.vehicle?.plate_number || '---'}</td>
                </tr>
                <tr>
                  <td>Loại phương tiện</td>
                  <td>{cardDetails?.vehicle?.type_name || '---'}</td>
                </tr>
                <tr>
                  <td>Ngày bắt đầu hiệu lực</td>
                  <td>{cardDetails?.package?.start_date ? new Date(cardDetails.package.start_date).toLocaleDateString('vi-VN') : '---'}</td>
                </tr>
                <tr>
                  <td>Ngày hết hạn hiệu lực</td>
                  <td>{cardDetails?.package?.end_date ? new Date(cardDetails.package.end_date).toLocaleDateString('vi-VN') : '---'}</td>
                </tr>
                <tr>
                  <td>Đơn giá cước dịch vụ</td>
                  <td>{priceDisplay}</td>
                </tr>
                <tr>
                  <td>Trạng thái thanh toán</td>
                  <td>{cardDetails?.payment?.status || 'Đã thanh toán'}</td>
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
                        IP: {contractData?.signed_ip || '---'}
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '9px', color: '#718096' }}>
                        {contractData?.signed_at ? new Date(contractData.signed_at).toLocaleString('vi-VN') : ''}
                      </p>
                    </div>
                  ) : (
                    <div style={{ fontStyle: 'italic', fontSize: '13px', color: '#a0aec0' }}>
                      Chưa ký
                    </div>
                  )}
                </div>
                <p className="signed-name">{cardDetails?.customer?.full_name || '---'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Toast Error if sign fails */}
      {error && signedSuccess && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#fee2e2', border: '1px solid #fecaca', padding: '16px 24px', borderRadius: '8px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

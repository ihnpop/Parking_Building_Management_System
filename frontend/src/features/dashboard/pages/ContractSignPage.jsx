import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getContractByToken, signContract } from '../../../service/contractApi';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import ContractDocument from '../components/ContractDocument';

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
  const rawReg = Array.isArray(cardDetails?.raw?.card_registrations)
    ? cardDetails.raw.card_registrations[0]
    : cardDetails?.raw?.card_registrations;
  const rawVehicle = rawReg?.vehicle;
  const rawCustomer = rawVehicle?.customer;

  const rawPrice = cardDetails?.package?.price || rawVehicle?.vehicle_package?.[0]?.package?.price;
  const priceDisplay = rawPrice
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(rawPrice)
    : '---';

  const docData = {
    contractNo: contractData?.contract_no || '---',
    customerName: cardDetails?.customer?.full_name || rawCustomer?.full_name || '---',
    phone: cardDetails?.customer?.phone || rawCustomer?.phone || '---',
    email: cardDetails?.customer?.email || rawCustomer?.email || '---',
    cccdNumber: cardDetails?.customer?.cccd_number || '---',
    cardCode: cardDetails?.card_code || cardDetails?.code || cardDetails?.raw?.code || '---',
    plateNumber: cardDetails?.vehicle?.plate_number || rawVehicle?.plate_number || '---',
    vehicleType: cardDetails?.vehicle?.type_name || cardDetails?.type || rawVehicle?.vehicle_type?.name || '---',
    startDate: cardDetails?.package?.start_date
      ? new Date(cardDetails.package.start_date).toLocaleDateString('vi-VN')
      : '---',
    endDate: cardDetails?.package?.end_date
      ? new Date(cardDetails.package.end_date).toLocaleDateString('vi-VN')
      : '---',
    priceDisplay,
    paymentStatus: cardDetails?.payment?.status || 'Đã thanh toán',
    signedIp: contractData?.signed_ip || '---',
    signedAt: contractData?.signed_at || null
  };

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
          <ContractDocument
            data={docData}
            signedSuccess={signedSuccess}
          />
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

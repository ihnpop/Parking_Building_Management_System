import { useRef, useState, useEffect } from 'react';
import { XCircle, Download, Loader2, X, Mail } from 'lucide-react';
import { useNotification } from '../../../context/NotificationContext';
import { getContractStatus, sendContractEmail } from '../../../service/contractApi';
import ContractDocument from './ContractDocument';
import "./ContractModal.css";

export default function ContractModal({ isOpen, onClose, cardData }) {
  const { showToast } = useNotification();
  const [downloading, setDownloading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [contractStatus, setContractStatus] = useState('Chưa gửi');
  const contractRef = useRef(null);

  useEffect(() => {
    const fetchStatus = async () => {
      if (isOpen && cardData?.registrationId) {
        try {
          const res = await getContractStatus(cardData.registrationId);
          setContractStatus(res.status || 'Chưa gửi');
        } catch (err) {
          console.error("Lỗi lấy trạng thái hợp đồng:", err);
          setContractStatus('Chưa gửi');
        }
      }
    };
    fetchStatus();
  }, [isOpen, cardData?.registrationId]);

  if (!isOpen || !cardData) return null;

  const handleSendEmail = async () => {
    try {
      setSendingEmail(true);
      const res = await sendContractEmail(cardData.registrationId);
      setContractStatus(res.status);
      showToast('Gửi email yêu cầu ký hợp đồng thành công!', 'success');
    } catch (err) {
      console.error("Lỗi gửi email hợp đồng:", err);
      showToast(err.response?.data?.error || err.message || 'Không thể gửi email hợp đồng.', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);

      // Import html2pdf động để tránh SSR issues
      const html2pdf = (await import('html2pdf.js')).default;

      const element = contractRef.current;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Hop_Dong_Ve_Thang_${cardData.cardNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
      };

      await html2pdf().set(opt).from(element).save();
      showToast('Tải hợp đồng thành công!', 'success');
    } catch (error) {
      console.error('Lỗi khi tải tệp hợp đồng:', error);
      showToast('Không thể tải tệp hợp đồng. Vui lòng thử lại sau!', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const docData = {
    contractNo: `HD-${cardData.cardNo}/PBMS`,
    customerName: cardData.customer || '---',
    phone: cardData.phone || '---',
    email: cardData.email || '---',
    cccdNumber: cardData.cccd_number || '---',
    cardCode: cardData.cardNo || '---',
    plateNumber: cardData.plate || '---',
    vehicleType: cardData.type || '---',
    startDate: cardData.startDate || '---',
    endDate: cardData.endDate || '---',
    priceDisplay: cardData.type === 'Ô tô' ? '850.000 VNĐ' : '300.000 VNĐ',
    paymentStatus: 'Đã thanh toán'
  };

  return (
    <div className="contract-overlay" onClick={onClose}>
      <div className="contract-container" onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div className="contract-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ margin: 0 }}>Hợp đồng đăng ký thẻ tháng</h3>
            <span className={`contract-status-badge status-${contractStatus}`}>
              {contractStatus}
            </span>
          </div>
          <button className="contract-close-top" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Nội dung Hợp đồng dạng A4 Read-only */}
        <div className="contract-body">
          <div className="contract-paper-wrapper">
            <ContractDocument
              ref={contractRef}
              data={docData}
              signedSuccess={contractStatus === 'Đã ký'}
            />
          </div>
        </div>

        {/* Footer Modal với các nút hành động */}
        <div className="contract-footer">
          <button
            type="button"
            className="contract-btn contract-btn-close"
            onClick={onClose}
            disabled={downloading || sendingEmail}
          >
            <XCircle size={18} />
            Đóng
          </button>
          
          <button
            type="button"
            className="contract-btn contract-btn-email"
            onClick={handleSendEmail}
            disabled={sendingEmail || downloading || !cardData.email || contractStatus === 'Đã ký'}
            style={{
              backgroundColor: contractStatus === 'Đã ký' ? '#cbd5e1' : 'var(--primary, #2563eb)',
              color: contractStatus === 'Đã ký' ? '#64748b' : '#ffffff',
              cursor: (sendingEmail || downloading || !cardData.email || contractStatus === 'Đã ký') ? 'not-allowed' : 'pointer'
            }}
            title={!cardData.email ? "Khách hàng không có địa chỉ email" : ""}
          >
            {sendingEmail ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Mail size={18} />
                Gửi Mail Ký HĐ
              </>
            )}
          </button>

          <button
            type="button"
            className="contract-btn contract-btn-download"
            onClick={handleDownload}
            disabled={downloading || sendingEmail}
          >
            {downloading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Đang tạo PDF...
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

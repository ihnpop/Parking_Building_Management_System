// Import React hooks: useState để quản lý trạng thái, useCallback để memoize callback tránh re-render thừa
import React, { createContext, useContext, useState, useCallback } from 'react';
// Import CSS riêng của NotificationContext (styles cho toast và modal)
import "./NotificationContext.css";

// Tạo Context với giá trị mặc định null — sẽ được gán giá trị thực bởi NotificationProvider
const NotificationContext = createContext(null);

// Custom hook để đọc NotificationContext từ bất kỳ component con nào
// Ném lỗi nếu dùng ngoài NotificationProvider để dễ debug
export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}

// NotificationProvider: component bọc toàn bộ app, cung cấp hệ thống thông báo toàn cục
export function NotificationProvider({ children }) {
    // State lưu danh sách các toast đang hiển thị (mỗi toast là { id, message, type })
    const [toasts, setToasts] = useState([]);
    // State lưu thông tin hộp thoại xác nhận (confirm dialog), null nếu không có
    const [confirmDialog, setConfirmDialog] = useState(null);
    // State lưu thông tin hộp thoại nhập liệu (prompt dialog), null nếu không có
    const [promptDialog, setPromptDialog] = useState(null);

    // Hàm hiển thị toast thông báo
    // useCallback đảm bảo hàm không bị tạo lại mỗi lần render, tránh re-render không cần thiết ở component dùng nó
    const showToast = useCallback((message, type = 'success') => {
        // Tạo id độc nhất cho mỗi toast = timestamp + random string
        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        // Thêm toast mới vào cuối mảng
        setToasts((prev) => [...prev, { id, message, type }]);
        // Tự động xóa toast sau 3 giây
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    // Hàm hiển thị hộp thoại xác nhận (Confirm Dialog)
    // isDangerous=true sẽ đổi màu nút xác nhận thành đỏ (cảnh báo nguy hiểm)
    const showConfirm = useCallback(({ message, onConfirm, onCancel, title = 'Xác nhận yêu cầu', confirmText = 'Xác nhận', cancelText = 'Hủy', isDangerous = false }) => {
        setConfirmDialog({
            title,
            message,
            // Wrap onConfirm để tự động đóng dialog sau khi người dùng xác nhận
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setConfirmDialog(null);
            },
            // Wrap onCancel để tự động đóng dialog sau khi người dùng hủy
            onCancel: () => {
                if (onCancel) onCancel();
                setConfirmDialog(null);
            },
            confirmText, // Text hiển thị trên nút xác nhận
            cancelText,  // Text hiển thị trên nút hủy
            isDangerous  // Có phải hành động nguy hiểm không (xóa dữ liệu, ...)
        });
    }, []);

    // Hàm hiển thị hộp thoại nhập liệu (Prompt Dialog — tương tự window.prompt() nhưng đẹp hơn)
    const showPrompt = useCallback(({ message, defaultValue = '', onConfirm, onCancel, title = 'Nhập thông tin', placeholder = '' }) => {
        setPromptDialog({
            title,
            message,
            defaultValue,   // Giá trị mặc định trong input
            placeholder,    // Placeholder text của input
            // Wrap onConfirm: truyền giá trị đã nhập ra ngoài, rồi đóng dialog
            onConfirm: (val) => {
                if (onConfirm) onConfirm(val);
                setPromptDialog(null);
            },
            // Wrap onCancel: đóng dialog khi người dùng hủy
            onCancel: () => {
                if (onCancel) onCancel();
                setPromptDialog(null);
            }
        });
    }, []);

    return (
        // Cung cấp 3 hàm showToast, showConfirm, showPrompt cho toàn bộ cây component con
        <NotificationContext.Provider value={{ showToast, showConfirm, showPrompt }}>
            {/* Render các component con bên trong provider */}
            {children}
            
            {/* Toast Container — container hiển thị tất cả toast thông báo */}
            <div className="custom-toast-container">
                {/* Vòng lặp render từng toast đang active */}
                {toasts.map((toast) => (
                    <div key={toast.id} className={`custom-toast ${toast.type}`}>
                        {/* Thanh màu dọc bên trái toast (accent line) */}
                        <div className="toast-accent-line"></div>
                        {/* Wrapper icon trạng thái toast */}
                        <div className="toast-icon-wrapper">
                            <span className="material-symbols-outlined toast-icon">
                                {/* Hiển thị icon tương ứng với loại toast */}
                                {toast.type === 'success' && 'check_circle'}
                                {toast.type === 'error' && 'error'}
                                {toast.type === 'warning' && 'warning'}
                                {toast.type === 'info' && 'info'}
                            </span>
                        </div>
                        {/* Nội dung văn bản của toast */}
                        <div className="toast-content">
                            <span className="toast-text">{toast.message}</span>
                        </div>
                        {/* Nút X để đóng toast thủ công (lọc bỏ toast có id tương ứng khỏi mảng) */}
                        <button type="button" className="toast-close-btn" onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                ))}
            </div>

            {/* Confirm Dialog Modal — chỉ render khi confirmDialog có giá trị (không null) */}
            {confirmDialog && (
                // Overlay nền mờ — click ra ngoài để hủy
                <div className="custom-modal-overlay" onClick={confirmDialog.onCancel}>
                    {/* Hộp thoại xác nhận — ngăn sự kiện click lan ra overlay */}
                    <div className="custom-modal-box confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        {/* Header modal: tiêu đề + nút X đóng */}
                        <div className="custom-modal-header">
                            <h3>{confirmDialog.title}</h3>
                            <button type="button" className="modal-close-x-btn" onClick={confirmDialog.onCancel}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        {/* Body modal: nội dung câu hỏi xác nhận */}
                        <div className="custom-modal-body">
                            <p className="confirm-message">{confirmDialog.message}</p>
                        </div>
                        {/* Footer modal: 2 nút Hủy và Xác nhận */}
                        <div className="custom-modal-footer">
                            {/* Nút Hủy */}
                            <button type="button" className="custom-modal-btn cancel" onClick={confirmDialog.onCancel}>
                                {confirmDialog.cancelText}
                            </button>
                            {/* Nút Xác nhận — đổi class "dangerous" (đỏ) nếu là hành động nguy hiểm */}
                            <button 
                                type="button" 
                                className={`custom-modal-btn confirm ${confirmDialog.isDangerous ? 'dangerous' : 'primary'}`} 
                                onClick={confirmDialog.onConfirm}
                            >
                                {confirmDialog.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Prompt Dialog Modal — chỉ render khi promptDialog có giá trị (không null) */}
            {promptDialog && <PromptDialogModal dialog={promptDialog} />}
        </NotificationContext.Provider>
    );
}

// Component nội bộ render hộp thoại nhập liệu (Prompt)
function PromptDialogModal({ dialog }) {
    // State quản lý giá trị đang nhập trong input, khởi tạo từ defaultValue của dialog
    const [value, setValue] = useState(dialog.defaultValue);

    // Xử lý submit form: ngăn reload trang và truyền giá trị đã nhập vào onConfirm
    const handleSubmit = (e) => {
        e.preventDefault(); // Ngăn browser reload trang khi submit form
        dialog.onConfirm(value); // Truyền giá trị nhập vào cho callback
    };

    return (
        // Overlay nền mờ — click ra ngoài để hủy
        <div className="custom-modal-overlay" onClick={dialog.onCancel}>
            {/* Hộp thoại nhập liệu */}
            <div className="custom-modal-box prompt-dialog" onClick={(e) => e.stopPropagation()}>
                {/* Header: tiêu đề + nút X */}
                <div className="custom-modal-header">
                    <h3>{dialog.title}</h3>
                    <button type="button" className="modal-close-x-btn" onClick={dialog.onCancel}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                {/* Form chứa input nhập liệu */}
                <form onSubmit={handleSubmit}>
                    <div className="custom-modal-body">
                        {/* Câu hỏi / hướng dẫn nhập liệu */}
                        <p className="prompt-message">{dialog.message}</p>
                        {/* Ô nhập liệu — autoFocus để người dùng không cần click vào */}
                        <input
                            type="text"
                            className="prompt-input"
                            value={value}
                            onChange={(e) => setValue(e.target.value)} // Cập nhật state mỗi khi người dùng gõ
                            placeholder={dialog.placeholder}
                            autoFocus // Tự động focus vào ô nhập khi dialog mở
                        />
                    </div>
                    <div className="custom-modal-footer">
                        {/* Nút Hủy — type="button" để không trigger submit form */}
                        <button type="button" className="custom-modal-btn cancel" onClick={dialog.onCancel}>
                            Hủy
                        </button>
                        {/* Nút Xác nhận — type="submit" để trigger handleSubmit */}
                        <button type="submit" className="custom-modal-btn confirm primary">
                            Xác nhận
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

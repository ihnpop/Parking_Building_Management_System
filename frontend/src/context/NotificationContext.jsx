import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}

export function NotificationProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [promptDialog, setPromptDialog] = useState(null);

    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    const showConfirm = useCallback(({ message, onConfirm, onCancel, title = 'Xác nhận yêu cầu', confirmText = 'Xác nhận', cancelText = 'Hủy', isDangerous = false }) => {
        setConfirmDialog({
            title,
            message,
            onConfirm: () => {
                if (onConfirm) onConfirm();
                setConfirmDialog(null);
            },
            onCancel: () => {
                if (onCancel) onCancel();
                setConfirmDialog(null);
            },
            confirmText,
            cancelText,
            isDangerous
        });
    }, []);

    const showPrompt = useCallback(({ message, defaultValue = '', onConfirm, onCancel, title = 'Nhập thông tin', placeholder = '' }) => {
        setPromptDialog({
            title,
            message,
            defaultValue,
            placeholder,
            onConfirm: (val) => {
                if (onConfirm) onConfirm(val);
                setPromptDialog(null);
            },
            onCancel: () => {
                if (onCancel) onCancel();
                setPromptDialog(null);
            }
        });
    }, []);

    return (
        <NotificationContext.Provider value={{ showToast, showConfirm, showPrompt }}>
            {children}
            
            {/* Toast Container */}
            <div className="custom-toast-container">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`custom-toast ${toast.type}`}>
                        <div className="toast-accent-line"></div>
                        <div className="toast-icon-wrapper">
                            <span className="material-symbols-outlined toast-icon">
                                {toast.type === 'success' && 'check_circle'}
                                {toast.type === 'error' && 'error'}
                                {toast.type === 'warning' && 'warning'}
                                {toast.type === 'info' && 'info'}
                            </span>
                        </div>
                        <div className="toast-content">
                            <span className="toast-text">{toast.message}</span>
                        </div>
                        <button type="button" className="toast-close-btn" onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                ))}
            </div>

            {/* Confirm Dialog Modal */}
            {confirmDialog && (
                <div className="custom-modal-overlay" onClick={confirmDialog.onCancel}>
                    <div className="custom-modal-box confirm-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="custom-modal-header">
                            <h3>{confirmDialog.title}</h3>
                            <button type="button" className="modal-close-x-btn" onClick={confirmDialog.onCancel}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="custom-modal-body">
                            <p className="confirm-message">{confirmDialog.message}</p>
                        </div>
                        <div className="custom-modal-footer">
                            <button type="button" className="custom-modal-btn cancel" onClick={confirmDialog.onCancel}>
                                {confirmDialog.cancelText}
                            </button>
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

            {/* Prompt Dialog Modal */}
            {promptDialog && <PromptDialogModal dialog={promptDialog} />}
        </NotificationContext.Provider>
    );
}

function PromptDialogModal({ dialog }) {
    const [value, setValue] = useState(dialog.defaultValue);

    const handleSubmit = (e) => {
        e.preventDefault();
        dialog.onConfirm(value);
    };

    return (
        <div className="custom-modal-overlay" onClick={dialog.onCancel}>
            <div className="custom-modal-box prompt-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="custom-modal-header">
                    <h3>{dialog.title}</h3>
                    <button type="button" className="modal-close-x-btn" onClick={dialog.onCancel}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="custom-modal-body">
                        <p className="prompt-message">{dialog.message}</p>
                        <input
                            type="text"
                            className="prompt-input"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={dialog.placeholder}
                            autoFocus
                        />
                    </div>
                    <div className="custom-modal-footer">
                        <button type="button" className="custom-modal-btn cancel" onClick={dialog.onCancel}>
                            Hủy
                        </button>
                        <button type="submit" className="custom-modal-btn confirm primary">
                            Xác nhận
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

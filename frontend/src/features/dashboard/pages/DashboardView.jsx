import React from 'react';
import DashboardShell from '../../../components/layout/DashboardShell';
import DashboardSection from '../components/DashboardSection';
import { useAuth } from '../../../context/AuthContext';

// import SystemOperations from '../components/SystemOperations';

const baseSections = [
    {
        title: 'QUẢN LÝ THẺ & VÉ',
        columns: 2, // Chỉnh xuống 2 cột để 2 card "Thẻ" và "Vé tháng" nằm vừa vặn, đẹp mắt
        cards: [
            { title: 'Thẻ', description: 'Xem danh sách thẻ, đăng ký thẻ mới, cập nhật loại thẻ.', icon: 'credit_card', path: '/login/dashboard/card' },
            { title: 'Vé tháng', description: 'Thêm, xóa, sửa, đổi thẻ, gia hạn, tìm kiếm vé tháng.', icon: 'calendar_month', path: '/login/dashboard/month-card' },
        ],
    },
    {
        title: 'THỐNG KÊ',
        columns: 3, // Giữ 3 cột vì còn đúng 3 mục, xếp ngang hàng rất cân đối
        cards: [
            { title: 'Thống kê tổng quát', description: 'Xem tổng quát doanh thu theo khoảng thời gian, tồn đầu kỳ, cuối kỳ.', icon: 'pie_chart', path: '/login/dashboard/OccupancyChart' },
        ],
    },
    {
        title: 'NHẬT KÝ VẬN HÀNH',
        columns: 3, // Chỉnh từ 4 xuống 3 cột để 3 mục còn lại lấp đầy 1 hàng ngang
        cards: [
            { title: 'Nhật ký xử lý mất thẻ', description: 'Xem nhật ký các xử lý mất thẻ: hủy thẻ xe, cho xe ra.', icon: 'find_in_page', path: '/login/dashboard/lost-card-log' },
            { title: 'Nhật ký vé tháng', description: 'Xem nhật ký xử lý vé tháng: gia hạn, đổi thẻ, thêm, xóa, cập nhật.', icon: 'receipt_long', path: '/login/dashboard/month-card-log' },
            { title: 'Nhật ký đăng nhập', description: 'Xem nhật ký đăng nhập của nhân viên: thời gian vào ra.', icon: 'login', path: '/login/dashboard/login-log' },
        ],
    },
    {
        title: 'CÀI ĐẶT HỆ THỐNG',
        columns: 3,
        cards: [
            { title: 'Hệ thống', description: 'Thiết lập thông tin hệ thống, thiết bị đọc thẻ và cấu hình chung.', icon: 'settings', path: '/login/dashboard/settings' },
        ],
    },
];

const adminOnlySections = [
    {
        title: 'QUẢN TRỊ NGƯỜI DÙNG',
        columns: 3,
        cards: [
            { title: 'Phân quyền người dùng', description: 'Xem danh sách tài khoản, thay đổi vai trò Admin / Manager / Staff cho từng người dùng.', icon: 'manage_accounts', path: '/login/dashboard/user-management' },
        ],
    },
];

export default function DashboardView() {
    const { userRole } = useAuth();
    const isAdmin = userRole === 'ADMIN';

    const dashboardSections = isAdmin
        ? [...baseSections, ...adminOnlySections]
        : baseSections;

    return (
        <DashboardShell>
            {/* Render các khối quản lý từ mảng data */}
            {dashboardSections.map((section) => (
                <DashboardSection key={section.title} {...section} />
            ))}

            {/* Render thêm 2 bảng phía dưới cùng */}
            {/* <SystemOperations /> */}
        </DashboardShell>
    );
}
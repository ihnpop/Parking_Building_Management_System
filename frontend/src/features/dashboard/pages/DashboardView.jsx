import React from 'react';
import DashboardShell from '../../../components/layout/DashboardShell';
import DashboardSection from '../components/DashboardSection';
import Generalstatistictable from '../components/Generalstatistictable';
import SystemOperations from '../components/SystemOperations';

const dashboardSections = [
    {
        title: 'QUẢN LÝ THẺ & VÉ',
        columns: 2, // Chỉnh xuống 2 cột để 2 card "Thẻ" và "Vé tháng" nằm vừa vặn, đẹp mắt
        cards: [
            { title: 'Thẻ', description: 'Xem danh sách thẻ, đăng ký thẻ mới, cập nhật loại thẻ.', icon: 'credit_card' },
            { title: 'Vé tháng', description: 'Thêm, xóa, sửa, đổi thẻ, gia hạn, tìm kiếm vé tháng.', icon: 'calendar_month' },
        ],
    },
    {
        title: 'THỐNG KÊ',
        columns: 3, // Giữ 3 cột vì còn đúng 3 mục, xếp ngang hàng rất cân đối
        cards: [
            { title: 'Thống kê tổng quát', description: 'Xem tổng quát doanh thu theo khoảng thời gian, tồn đầu kỳ, cuối kỳ.', icon: 'pie_chart' },
            { title: 'Thống kê chi tiết', description: 'Xem chi tiết các loại xe: thời gian vào, ra, loại vé và tổng doanh thu.', icon: 'bar_chart' },
            { title: 'Thống kê theo khoảng thời gian', description: 'Xem doanh thu theo ngày, tuần, tháng, năm và so sánh.', icon: 'schedule' },
        ],
    },
    {
        title: 'NHẬT KÝ VẬN HÀNH',
        columns: 3, // Chỉnh từ 4 xuống 3 cột để 3 mục còn lại lấp đầy 1 hàng ngang
        cards: [
            { title: 'Nhật ký xử lý mất thẻ', description: 'Xem nhật ký các xử lý mất thẻ: hủy thẻ xe, cho xe ra.', icon: 'find_in_page' },
            { title: 'Nhật ký vé tháng', description: 'Xem nhật ký xử lý vé tháng: gia hạn, đổi thẻ, thêm, xóa, cập nhật.', icon: 'receipt_long' },
            { title: 'Nhật ký đăng nhập', description: 'Xem nhật ký đăng nhập của nhân viên: thời gian vào ra.', icon: 'login' },
        ],
    },
    {
        title: 'CÀI ĐẶT HỆ THỐNG',
        columns: 3,
        cards: [
            { title: 'Hệ thống', description: 'Thiết lập thông tin hệ thống, thiết bị đọc thẻ và cấu hình chung.', icon: 'settings' },
        ],
    },
];

export default function DashboardView() {
    return (
        <DashboardShell>
            {/* Render các khối quản lý từ mảng data */}
            {dashboardSections.map((section) => (
                <DashboardSection key={section.title} {...section} />
            ))}

            {/* Render thêm 2 bảng phía dưới cùng */}
            <Generalstatistictable />
            <SystemOperations />
        </DashboardShell>
    );
}
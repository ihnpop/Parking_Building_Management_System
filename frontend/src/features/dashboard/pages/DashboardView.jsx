import React from 'react';
import DashboardShell from '../../../components/layout/DashboardShell';
import DashboardSection from '../components/DashboardSection';
import Generalstatistictable from '../components/Generalstatistictable';
import SystemOperations from '../components/SystemOperations';

const dashboardSections = [
    {
        title: 'QUẢN LÝ THẺ & VÉ',
        columns: 3,
        cards: [
            { title: 'Thẻ', description: 'Xem danh sách thẻ, đăng ký thẻ mới, cập nhật loại thẻ.', icon: 'credit_card' },
            { title: 'Vé tháng', description: 'Thêm, xóa, sửa, đổi thẻ, gia hạn, tìm kiếm vé tháng.', icon: 'calendar_month' },
            { title: 'Vé lượt', description: 'Quy định giá vé lượt, mốc thời gian ngày đêm, phụ thu và điều chỉnh.', icon: 'local_taxi' },
            { title: 'Tra cứu xe vào, ra', description: 'Tìm kiếm xe chưa ra, xe đã ra, xe tháng theo biển số hoặc thời gian.', icon: 'search' },
            { title: 'Người dùng', description: 'Quản lý nhân viên, phân quyền truy cập và dữ liệu người dùng.', icon: 'person' },
        ],
    },
    {
        title: 'THỐNG KÊ',
        columns: 3,
        cards: [
            { title: 'Thống kê theo máy tính', description: 'Xem doanh thu theo máy tính và đơn vị thu tiền từng ca.', icon: 'computer' },
            { title: 'Thống kê tổng quát', description: 'Xem tổng quát doanh thu theo khoảng thời gian, tồn đầu kỳ, cuối kỳ.', icon: 'pie_chart' },
            { title: 'Thống kê chi tiết', description: 'Xem chi tiết các loại xe: thời gian vào, ra, loại vé và tổng doanh thu.', icon: 'bar_chart' },
            { title: 'Thống kê theo khoảng thời gian', description: 'Xem doanh thu theo ngày, tuần, tháng, năm và so sánh.', icon: 'schedule' },
            { title: 'Thống kê theo nhân viên', description: 'Xem doanh thu theo nhân viên trực ca và hiệu suất làm việc.', icon: 'group' },
        ],
    },
    {
        title: 'NHẬT KÝ VẬN HÀNH',
        columns: 4,
        cards: [
            { title: 'Nhật ký xử lý mất thẻ', description: 'Xem nhật ký các xử lý mất thẻ: hủy thẻ xe, cho xe ra.', icon: 'find_in_page' },
            { title: 'Nhật ký vé tháng', description: 'Xem nhật ký xử lý vé tháng: gia hạn, đổi thẻ, thêm, xóa, cập nhật.', icon: 'receipt_long' },
            { title: 'Nhật ký đăng nhập', description: 'Xem nhật ký đăng nhập của nhân viên: thời gian vào ra.', icon: 'login' },
            { title: 'Nhật ký điều chỉnh giá vé', description: 'Xem nhật ký điều chỉnh giá vé và các phiên bản giá.', icon: 'price_change' },
            { title: 'Nhật ký vé lượt', description: 'Xem nhật ký vé lượt: thêm, xóa, sửa, khôi phục và kiểm tra.', icon: 'inventory' },
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
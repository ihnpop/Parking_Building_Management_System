/**
 * Trả về chuỗi yyyy-MM-dd theo timezone Việt Nam (ICT)
 */
export function todayVN() {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

/**
 * Trả về chuỗi yyyy-MM theo timezone Việt Nam (ICT)
 */
export function thisMonthVN() {
    return todayVN().slice(0, 7);
}

/**
 * Shift input date by +7 hours so that UTC methods return the Vietnam time components directly
 */
export function getVNDateParts(dateInput) {
    if (!dateInput) return null;
    let val = String(dateInput).trim();
    if (val.includes(' ') && !val.includes('T')) {
        val = val.replace(' ', 'T');
    }
    if (!val.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(val)) {
        val = val + 'Z';
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    const vnTime = d.getTime() + 7 * 60 * 60 * 1000;
    const vnDate = new Date(vnTime);
    return {
        year: vnDate.getUTCFullYear(),
        month: vnDate.getUTCMonth() + 1,
        date: vnDate.getUTCDate(),
        hour: vnDate.getUTCHours(),
        minute: vnDate.getUTCMinutes(),
        second: vnDate.getUTCSeconds(),
        dayOfWeek: vnDate.getUTCDay()
    };
}

/**
 * Format timestamp sang yyyy-MM-dd theo timezone Việt Nam
 */
export function getLocalDateVN(dateInput) {
    if (!dateInput) return '';
    let val = String(dateInput).trim();
    if (val.includes(' ') && !val.includes('T')) {
        val = val.replace(' ', 'T');
    }
    if (!val.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(val)) {
        val = val + 'Z';
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
}

export function formatLabel(dateStr) {
    if (!dateStr || !dateStr.includes('-')) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return dateStr;
}

/**
 * Lấy giờ (0..23) theo timezone Việt Nam
 */
export function getHourVN(dateInput) {
    if (!dateInput) return -1;
    let val = String(dateInput).trim();
    if (val.includes(' ') && !val.includes('T')) {
        val = val.replace(' ', 'T');
    }
    if (!val.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(val)) {
        val = val + 'Z';
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return -1;
    const hourStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: 'numeric',
        hour12: false
    }).format(d);
    const h = parseInt(hourStr, 10);
    return h === 24 ? 0 : h;
}

export function formatVNDCompact(val) {
    if (val === null || val === undefined || isNaN(Number(val))) return '0 ₫';
    const num = Number(val);
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M ₫';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(0) + 'K ₫';
    }
    return num + ' ₫';
}

export function formatDateFormatted(customDate) {
    if (!customDate) return '';
    const parts = customDate.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return customDate;
}

export function formatWeekLabel(customDate) {
    if (!customDate) return '';
    const parts = customDate.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return '';
    const [y, m, d] = parts;
    const dt = new Date(y, m - 1, d);
    const currentDay = dt.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(y, m - 1, d + diffToMonday);
    const sunday = new Date(y, m - 1, d + diffToMonday + 6);
    const formatShort = (dateObj) => {
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}`;
    };
    return `${formatShort(monday)} - ${formatShort(sunday)}`;
}

export function formatMonthLabel(customMonth) {
    if (!customMonth) return '';
    const parts = customMonth.split('-');
    if (parts.length === 2) {
        return `${parts[1]}/${parts[0]}`;
    }
    return customMonth;
}

export function getVNPeriodRange(period, customDate, customMonth) {
    let startVN, endVN;

    if (period === 'day' && customDate) {
        const parts = customDate.split('-').map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
            const [y, m, d] = parts;
            startVN = Date.UTC(y, m - 1, d, 0, 0, 0, 0) - 7 * 60 * 60 * 1000;
            endVN = Date.UTC(y, m - 1, d, 23, 59, 59, 999) - 7 * 60 * 60 * 1000;
        }
    } else if (period === 'week' && customDate) {
        const parts = customDate.split('-').map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
            const [y, m, d] = parts;
            const dt = new Date(y, m - 1, d);
            const currentDay = dt.getDay();
            const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
            startVN = Date.UTC(y, m - 1, d + diffToMonday, 0, 0, 0, 0) - 7 * 60 * 60 * 1000;
            endVN = Date.UTC(y, m - 1, d + diffToMonday + 6, 23, 59, 59, 999) - 7 * 60 * 60 * 1000;
        }
    } else if (period === 'month' && customMonth) {
        const parts = customMonth.split('-').map(Number);
        if (parts.length === 2 && !parts.some(isNaN)) {
            const [y, m] = parts;
            startVN = Date.UTC(y, m - 1, 1, 0, 0, 0, 0) - 7 * 60 * 60 * 1000;
            endVN = Date.UTC(y, m, 0, 23, 59, 59, 999) - 7 * 60 * 60 * 1000;
        }
    }

    if (!startVN || !endVN) {
        const todayStr = todayVN();
        const [y, m, d] = todayStr.split('-').map(Number);
        startVN = Date.UTC(y, m - 1, d, 0, 0, 0, 0) - 7 * 60 * 60 * 1000;
        endVN = Date.UTC(y, m - 1, d, 23, 59, 59, 999) - 7 * 60 * 60 * 1000;
    }

    return {
        startDate: new Date(startVN).toISOString(),
        endDate: new Date(endVN).toISOString()
    };
}

/**
 * Trích xuất dữ liệu Dashboard ra Excel (XLS XML format)
 */
export const handleExportExcel = ({
    dashboardPeriod,
    dateFormatted,
    weekLabel,
    monthFormatted,
    stats,
    floorData,
    vehicleTypes,
    trafficChartData,
    revenueChartData,
    recentIn,
    recentOut,
    incidents,
    formatVND
}) => {
    const periodStr = dashboardPeriod === 'day' 
        ? `Ngày ${dateFormatted}` 
        : dashboardPeriod === 'week' 
            ? `Tuần ${weekLabel}` 
            : `Tháng ${monthFormatted}`;
            
    const exportTimeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    const totalCapacity = stats.usedSlots + stats.emptySlots;
    const occupancyPercentage = Math.round((stats.usedSlots / (totalCapacity || 1)) * 100);
    const avgRevenuePerVehicle = stats.todayTraffic > 0 ? Math.round(stats.revenueToday / stats.todayTraffic) : 0;
    
    let capacityAlert = 'Bình thường';
    if (occupancyPercentage >= 90) capacityAlert = 'Quá tải nghiêm trọng';
    else if (occupancyPercentage >= 80) capacityAlert = 'Cảnh báo quá tải';
    else if (occupancyPercentage >= 50) capacityAlert = 'Hiệu suất tốt';
    else capacityAlert = 'Thấp';

    const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
    <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
    <!--[if gte mso 9]>
    <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Báo cáo tổng quan</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      .title { font-size: 16pt; font-weight: bold; color: #1e3a8a; text-align: center; }
      .subtitle { font-size: 10pt; color: #475569; text-align: center; margin-bottom: 20px; }
      .section-title { font-size: 12pt; font-weight: bold; color: #1e3a8a; padding-top: 15px; }
      .kpi-table { border-collapse: collapse; margin-top: 10px; width: 800px; }
      .kpi-label { border: 1px solid #cbd5e1; background-color: #f1f5f9; text-align: center; font-weight: bold; font-size: 9pt; color: #475569; padding: 6px; }
      .kpi-val { border: 1px solid #cbd5e1; text-align: center; font-weight: bold; font-size: 12pt; padding: 10px; background-color: #ffffff; }
      .data-table { border-collapse: collapse; margin-top: 10px; width: 800px; }
      .data-table th { background-color: #2563eb; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 10pt; }
      .data-table td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 10pt; }
      .data-table tr:nth-child(even) { background-color: #f8fafc; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
    </style>
    </head>
    <body>
      <!-- Tiêu đề báo cáo -->
      <table style="width: 800px;">
        <tr>
          <td colspan="4" class="title" style="height: 40px; vertical-align: middle;">BÁO CÁO THỐNG KÊ TỔNG QUAN HỆ THỐNG PARKING</td>
        </tr>
        <tr>
          <td colspan="4" class="subtitle" style="height: 20px; vertical-align: middle;">Khoảng thời gian: ${periodStr} | Ngày xuất báo cáo: ${exportTimeStr}</td>
        </tr>
      </table>
      <br/>
      
      <!-- I. KPI CHÍNH -->
      <table class="kpi-table">
        <colgroup>
          <col style="width: 200px;" />
          <col style="width: 200px;" />
          <col style="width: 200px;" />
          <col style="width: 200px;" />
        </colgroup>
        <tr>
          <td colspan="4" class="section-title" style="height: 35px; vertical-align: bottom; padding-bottom: 5px;">I. CHỈ SỐ KPI CHÍNH</td>
        </tr>
        <!-- Row 1: Labels -->
        <tr style="height: 25px;">
          <td class="kpi-label">LƯỢT XE RA / VÀO</td>
          <td class="kpi-label">CHỖ TRỐNG KHẢ DỤNG</td>
          <td class="kpi-label">CHỖ ĐÃ SỬ DỤNG</td>
          <td class="kpi-label">TỶ LỆ LẤP ĐẦY</td>
        </tr>
        <!-- Row 1: Values -->
        <tr style="height: 35px;">
          <td class="kpi-val" style="color: #2563eb;">${stats.todayTraffic} lượt</td>
          <td class="kpi-val" style="color: #10b981;">${stats.emptySlots} chỗ</td>
          <td class="kpi-val" style="color: #6366f1;">${stats.usedSlots} chỗ</td>
          <td class="kpi-val" style="color: #0f172a;">${occupancyPercentage}%</td>
        </tr>
        <!-- Row 2: Labels -->
        <tr style="height: 25px;">
          <td colspan="2" class="kpi-label">DOANH THU KHOẢNG THỜI GIAN</td>
          <td class="kpi-label">SỰ CỐ GHI NHẬN</td>
          <td class="kpi-label">DOANH THU THÁNG / DOANH THU TB</td>
        </tr>
        <!-- Row 2: Values -->
        <tr style="height: 35px;">
          <td colspan="2" class="kpi-val" style="color: #059669;">${formatVND(stats.revenueToday)}</td>
          <td class="kpi-val" style="color: ${stats.incidents > 0 ? '#ef4444' : '#10b981'};">${stats.incidents} sự cố</td>
          <td class="kpi-val" style="color: #1d4ed8;">${formatVND(stats.revenueMonth)}</td>
        </tr>
      </table>
      <br/>

      <!-- II. PHÂN TÍCH HIỆU SUẤT & DOANH THU -->
      <table class="kpi-table">
        <colgroup>
          <col style="width: 200px;" />
          <col style="width: 200px;" />
          <col style="width: 200px;" />
          <col style="width: 200px;" />
        </colgroup>
        <tr>
          <td colspan="4" class="section-title" style="height: 35px; vertical-align: bottom; padding-bottom: 5px;">II. PHÂN TÍCH CHI TIẾT HIỆU SUẤT & DOANH THU VẬN HÀNH</td>
        </tr>
        <!-- Row 1: Labels -->
        <tr style="height: 25px;">
          <td class="kpi-label">TỔNG CÔNG SUẤT BÃI</td>
          <td class="kpi-label">DOANH THU / LƯỢT XE TB</td>
          <td class="kpi-label">MỨC ĐỘ SỬ DỤNG</td>
          <td class="kpi-label">TRẠNG THÁI BÃI XE</td>
        </tr>
        <!-- Row 1: Values -->
        <tr style="height: 35px;">
          <td class="kpi-val" style="color: #475569;">${totalCapacity} chỗ</td>
          <td class="kpi-val" style="color: #0d9488;">${formatVND(avgRevenuePerVehicle)}</td>
          <td class="kpi-val" style="color: #0f172a;">${occupancyPercentage}%</td>
          <td class="kpi-val" style="color: ${occupancyPercentage >= 80 ? '#ef4444' : '#10b981'};">${capacityAlert}</td>
        </tr>
      </table>
      <br/>
      
      <!-- III. TỶ LỆ LẤP ĐẦY THEO TẦNG -->
      <table class="data-table">
        <colgroup>
          <col style="width: 260px;" />
          <col style="width: 180px;" />
          <col style="width: 180px;" />
          <col style="width: 180px;" />
        </colgroup>
        <tr>
          <td colspan="4" class="section-title" style="height: 35px; vertical-align: bottom; padding-bottom: 5px;">III. TỶ LỆ LẤP ĐẦY THEO TẦNG</td>
        </tr>
        <tr style="height: 25px;">
          <th>Tầng</th>
          <th style="text-align: right;">Chỗ đã sử dụng</th>
          <th style="text-align: right;">Tổng số chỗ</th>
          <th style="text-align: right;">Tỷ lệ lấp đầy</th>
        </tr>
        ${floorData.map((f, idx) => `
          <tr style="height: 24px;">
            <td>${f.floorName.replace(/Floor/g, 'Tầng')}</td>
            <td class="text-right">${f.occupiedSlots}</td>
            <td class="text-right">${f.totalSlots}</td>
            <td class="text-right" style="font-weight: bold; color: #2563eb;">${f.percentage}%</td>
          </tr>
        `).join('')}
      </table>
      <br/>
      
      <!-- IV. PHÂN LOẠI PHƯƠNG TIỆN -->
      <table class="data-table">
        <colgroup>
          <col style="width: 80px;" />
          <col style="width: 240px;" />
          <col style="width: 240px;" />
          <col style="width: 240px;" />
        </colgroup>
        <tr>
          <td colspan="4" class="section-title" style="height: 35px; vertical-align: bottom; padding-bottom: 5px;">IV. PHÂN LOẠI PHƯƠNG TIỆN ĐANG ĐỖ</td>
        </tr>
        <tr style="height: 25px;">
          <th class="text-center">STT</th>
          <th>Loại phương tiện</th>
          <th style="text-align: right;">Số lượng xe</th>
          <th style="text-align: right;">Tỷ lệ (%)</th>
        </tr>
        ${vehicleTypes.map((v, idx) => `
          <tr style="height: 24px;">
            <td class="text-center">${idx + 1}</td>
            <td>${v.vehicleTypeName}</td>
            <td class="text-right">${v.count}</td>
            <td class="text-right" style="font-weight: bold; color: #059669;">${v.percentage}%</td>
          </tr>
        `).join('')}
      </table>
      <br/>
      
      <!-- V. CHI TIẾT LƯU LƯỢNG & DOANH THU -->
      <table class="data-table">
        <colgroup>
          <col style="width: 80px;" />
          <col style="width: 240px;" />
          <col style="width: 240px;" />
          <col style="width: 240px;" />
        </colgroup>
        <tr>
          <td colspan="4" class="section-title" style="height: 35px; vertical-align: bottom; padding-bottom: 5px;">V. CHI TIẾT LƯU LƯỢNG & DOANH THU THEO KHOẢNG THỜI GIAN</td>
        </tr>
        <tr style="height: 25px;">
          <th class="text-center">STT</th>
          <th>Thời gian</th>
          <th style="text-align: right;">Lượt xe vào</th>
          <th style="text-align: right;">Doanh thu phát sinh</th>
        </tr>
        ${trafficChartData.map((item, idx) => {
          const revItem = revenueChartData[idx] || { val: 0 };
          return `
            <tr style="height: 24px;">
              <td class="text-center">${idx + 1}</td>
              <td>${item.labelFull || item.label}</td>
              <td class="text-right">${item.val}</td>
              <td class="text-right" style="font-weight: bold; color: #1d4ed8;">${formatVND(revItem.val)}</td>
            </tr>
          `;
        }).join('')}
      </table>
      <br/>

      <!-- VI. XE VÀO GẦN ĐÂY -->
      <table class="data-table">
        <colgroup>
          <col style="width: 80px;" />
          <col style="width: 240px;" />
          <col style="width: 240px;" />
          <col style="width: 240px;" />
        </colgroup>
        <tr>
          <td colspan="4" class="section-title" style="height: 35px; vertical-align: bottom; padding-bottom: 5px;">VI. HOẠT ĐỘNG: XE VÀO GẦN ĐÂY</td>
        </tr>
        <tr style="height: 25px;">
          <th class="text-center">STT</th>
          <th>Biển số xe</th>
          <th>Vị trí đỗ</th>
          <th>Thời gian vào</th>
        </tr>
        ${recentIn.length === 0 ? `
          <tr style="height: 30px;"><td colspan="4" class="text-center" style="color: #64748b;">Chưa có dữ liệu xe vào.</td></tr>
        ` : recentIn.map((row, idx) => `
          <tr style="height: 24px;">
            <td class="text-center">${idx + 1}</td>
            <td style="font-weight: bold;">${row.plate}</td>
            <td>${row.slot || '—'}</td>
            <td>${row.time}</td>
          </tr>
        `).join('')}
      </table>
      <br/>

      <!-- VII. XE RA GẦN ĐÂY -->
      <table class="data-table">
        <colgroup>
          <col style="width: 80px;" />
          <col style="width: 240px;" />
          <col style="width: 240px;" />
          <col style="width: 240px;" />
        </colgroup>
        <tr>
          <td colspan="4" class="section-title" style="height: 35px; vertical-align: bottom; padding-bottom: 5px;">VII. HOẠT ĐỘNG: XE RA GẦN ĐÂY</td>
        </tr>
        <tr style="height: 25px;">
          <th class="text-center">STT</th>
          <th>Biển số xe</th>
          <th>Vị trí đỗ</th>
          <th>Thời gian ra</th>
        </tr>
        ${recentOut.length === 0 ? `
          <tr style="height: 30px;"><td colspan="4" class="text-center" style="color: #64748b;">Chưa có dữ liệu xe ra.</td></tr>
        ` : recentOut.map((row, idx) => `
          <tr style="height: 24px;">
            <td class="text-center">${idx + 1}</td>
            <td style="font-weight: bold;">${row.plate}</td>
            <td>${row.slot || '—'}</td>
            <td>${row.time}</td>
          </tr>
        `).join('')}
      </table>
      <br/>

      <!-- VIII. DANH SÁCH SỰ CỐ MỚI GHI NHẬN -->
      <table class="data-table">
        <colgroup>
          <col style="width: 80px;" />
          <col style="width: 240px;" />
          <col style="width: 240px;" />
          <col style="width: 240px;" />
        </colgroup>
        <tr>
          <td colspan="4" class="section-title" style="height: 35px; vertical-align: bottom; padding-bottom: 5px;">VIII. DANH SÁCH SỰ CỐ MỚI GHI NHẬN</td>
        </tr>
        <tr style="height: 25px;">
          <th class="text-center">STT</th>
          <th>Biển số / Mã vé</th>
          <th>Loại sự cố</th>
          <th>Trạng thái xử lý</th>
        </tr>
        ${incidents.length === 0 ? `
          <tr style="height: 30px;"><td colspan="4" class="text-center" style="color: #64748b;">Không có sự cố nào ghi nhận.</td></tr>
        ` : incidents.map((inc, idx) => `
          <tr style="height: 24px;">
            <td class="text-center">${idx + 1}</td>
            <td style="font-weight: bold;">${inc.identifier}</td>
            <td>${inc.type}</td>
            <td style="color: ${inc.statusClass === 'db-badge--done' ? '#10b981' : '#f59e0b'}; font-weight: bold;">${inc.status}</td>
          </tr>
        `).join('')}
      </table>
    </body>
    </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PBMS_Bao_Cao_Tong_Quan_${dashboardPeriod}_${todayVN()}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

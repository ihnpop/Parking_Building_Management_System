import { formatDateTimeVN, formatDateTimeVNSplit, computeDuration, formatCasualVND } from './formatters';

/**
 * Maps casual card session payload into normalized table row structure.
 * @param {object} session 
 * @returns {object} Normalized row object for UI display
 */
export function mapSessionToRow(session) {
    if (!session) return {};

    const isMonthlySession = session.ticket_type === 'Thẻ tháng' ||
        session.card_type === 'Thẻ tháng' ||
        session.card?.card_type === 'Thẻ tháng' ||
        session.card?.type === 'MONTHLY' ||
        session.is_monthly === true;

    const paymentList = Array.isArray(session.payment) ? session.payment : (session.payment ? [session.payment] : []);
    const lostCardPayment = paymentList.find(p =>
        p.payment_type === 'Phí mất thẻ lượt' ||
        (p.payment_type && p.payment_type.toLowerCase().includes('mất thẻ'))
    );
    const isLostCard = !!lostCardPayment ||
        session.status === 'Mất thẻ' ||
        session.status === 'Thẻ đã cấp lại' ||
        session.is_lost_card === true ||
        !!session.lost_report_id;

    let status = session.status || '---';
    if (isLostCard || status === 'Thẻ đã cấp lại') {
        status = 'Mất thẻ';
    }

    const effectivePayment = lostCardPayment || paymentList[0] || null;
    
    let actualFee = 0;
    if (lostCardPayment) {
        let noteObj = lostCardPayment.note;
        if (typeof noteObj === 'string') {
            try { noteObj = JSON.parse(noteObj); } catch(e) {}
        }
        actualFee = noteObj?.parkingFee ?? session.final_fee ?? session.estimated_fee ?? 0;
    } else if (paymentList.length > 0) {
        actualFee = paymentList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    } else {
        actualFee = session.final_fee ?? session.fee ?? session.estimated_fee ?? 0;
    }

    return {
        session_id: session.session_id || '',
        cardCode: session.cardCode || session.card?.code || '---',
        plate: session.plate || session.plate_number || '---',
        vehicleType: session.vehicleType || session.vehicle?.vehicle_type?.name || '---',
        entryTime: session.entryTime || session.entry_time || null,
        exitTime: session.exitTime || session.exit_time || null,
        entryTimeDisplay: session.entryTimeDisplay || formatDateTimeVN(session.entry_time || session.entryTime),
        exitTimeDisplay: session.exitTimeDisplay || formatDateTimeVN(session.exit_time || session.exitTime),
        entryTimeSplit: session.entryTimeSplit || formatDateTimeVNSplit(session.entry_time || session.entryTime),
        exitTimeSplit: session.exitTimeSplit || formatDateTimeVNSplit(session.exit_time || session.exitTime),
        duration: session.duration || computeDuration(session.entry_time || session.entryTime, session.exit_time || session.exitTime),
        fee: actualFee,
        feeDisplay: formatCasualVND(actualFee),
        paymentMethod: session.paymentMethod || effectivePayment?.payment_method || 'Tiền mặt',
        paymentInfo: effectivePayment || session.paymentInfo || session.payment || null,
        isLostCardSession: isLostCard,
        isMonthlySession: isMonthlySession,
        status: status,
        entryGate: session.entryGate || session.entry_gate?.name || '---',
        exitGate: session.exitGate || session.exit_gate?.name || '---',
        staffIn: session.staffIn || session.staff_in?.full_name || '---',
    };
}

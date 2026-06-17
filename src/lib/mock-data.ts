import type { User, Contact, Opportunity, Task, ActivityLog } from '@/types'

export const USERS: User[] = [
  { id: 'u1', full_name: 'Nguyễn Thị Nguyệt', email: 'nguyet.stv@hns.vn', phone: '0901111111', role: 'sale', is_sale_tv: true, can_manage_campaign: false, can_qualify_lead: false, can_cskh_post: false, is_active: true },
  { id: 'u2', full_name: 'Nguyễn Thị Huệ', email: 'hue.stv@hns.vn', phone: '0902222222', role: 'sale', is_sale_tv: true, can_manage_campaign: false, can_qualify_lead: false, can_cskh_post: false, is_active: true },
  { id: 'u3', full_name: 'Nguyễn Văn Duy', email: 'duy.stv@hns.vn', phone: '0903333333', role: 'sale', is_sale_tv: true, can_manage_campaign: false, can_qualify_lead: false, can_cskh_post: false, is_active: true },
  { id: 'u4', full_name: 'Phạm Văn Hùng', email: 'hung.stv@hns.vn', phone: '0904444444', role: 'sale', is_sale_tv: true, can_manage_campaign: false, can_qualify_lead: false, can_cskh_post: false, is_active: false },
  { id: 'u5', full_name: 'Trần Như Hùng', email: 'hung.sa@hns.vn', phone: '0905555555', role: 'sale_admin', is_sale_tv: true, can_manage_campaign: false, can_qualify_lead: false, can_cskh_post: false, is_active: true },
  { id: 'u6', full_name: 'Nguyễn Thị Trang', email: 'trang.mkt@hns.vn', phone: '0906666666', role: 'mkt', is_sale_tv: false, can_manage_campaign: true, can_qualify_lead: false, can_cskh_post: false, is_active: true },
  { id: 'u7', full_name: 'Nguyễn Thị Vân', email: 'van.cskh@hns.vn', phone: '0907777777', role: 'cskh', is_sale_tv: false, can_manage_campaign: false, can_qualify_lead: true, can_cskh_post: true, is_active: true },
  { id: 'u8', full_name: 'Lưu Trường Quốc', email: 'quoc.admin@hns.vn', phone: '0908888888', role: 'admin', is_sale_tv: false, can_manage_campaign: true, can_qualify_lead: true, can_cskh_post: true, is_active: true },
]

export const CONTACTS: Contact[] = [
  { id: 'c1', name: 'Nguyễn Thị Lan Anh', company: 'Honda Việt Nam', phone: '0912000001', email: 'lananh.hr@honda.com.vn', source: 'mkt', lead_score: 'hot', created_by: 'u6', created_at: '2026-05-18' },
  { id: 'c2', name: 'Trần Đức Minh', company: 'Viettel Group', phone: '0912000002', email: 'minhtd@viettel.com.vn', source: 'sale', lead_score: 'hot', created_by: 'u2', created_at: '2026-04-20' },
  { id: 'c3', name: 'Lê Thanh Hà', company: 'VPBank', phone: '0912000003', email: 'ha.lt@vpbank.com.vn', source: 'mkt', lead_score: 'warm', created_by: 'u6', created_at: '2026-05-01' },
  { id: 'c4', name: 'Phạm Văn Đức', company: 'FPT Software', phone: '0912000004', email: 'ducpv@fpt.com.vn', source: 'partner', lead_score: 'warm', created_by: 'u3', created_at: '2026-05-28' },
  { id: 'c5', name: 'Ngô Thị Bình', company: 'ABC Corp', phone: '0912000005', email: 'binh@abccorp.vn', source: 'referral', lead_score: 'warm', customer_tier: 'warm', created_by: 'u4', created_at: '2026-03-10' },
  { id: 'c6', name: 'Vũ Hoàng Nam', company: 'Sun Group', phone: '0912000006', email: 'namvh@sungroup.com.vn', source: 'bod', lead_score: 'hot', created_by: 'u5', created_at: '2026-04-15' },
  { id: 'c7', name: 'Đinh Thị Thu Hương', company: 'Mobifone', phone: '0912000007', email: 'huongdtt@mobifone.vn', source: 'mkt', lead_score: 'warm', created_by: 'u6', created_at: '2026-06-05' },
  { id: 'c8', name: 'Bùi Văn Long', company: 'EVN', phone: '0912000008', source: 'sale', lead_score: 'cold', created_by: 'u4', created_at: '2026-03-01' },
  { id: 'c9', name: 'Hoàng Minh Tuấn', company: 'Techcombank', phone: '0912000009', email: 'tuanhm@techcombank.com.vn', source: 'partner', lead_score: 'hot', created_by: 'u2', created_at: '2026-05-10' },
  { id: 'c10', name: 'Trần Thị Mai', phone: '0912000010', source: 'cskh', lead_score: 'warm', customer_tier: 'warm', created_by: 'u7', created_at: '2026-02-15' },
]

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: 'opp-1',
    title: 'Honda VN – Phòng HR',
    description: 'Tour nghỉ dưỡng kết hợp team building cho 45 nhân viên phòng HR Honda Việt Nam. Phú Quốc 5N4Đ, Fusion Resort 5*, có hoạt động BBQ bãi biển và gala dinner.',
    contact_id: 'c1', assigned_to: 'u1', created_by: 'u5',
    source: 'mkt', campaign_id: 'camp-1', stage: 'stage_3',
    stage_updated_at: '2026-06-05', estimated_value: 450_000_000,
    tour_date: '2026-07-15', deadline: '2026-06-20',
    created_at: '2026-05-18', updated_at: '2026-06-08',
  },
  {
    id: 'opp-2',
    title: 'Viettel – Team Building Q3',
    description: 'Tour team building 3N2Đ tại Đà Nẵng cho 80 nhân viên. Yêu cầu hoạt động thể thao, workshop và gala dinner.',
    contact_id: 'c2', assigned_to: 'u2', created_by: 'u5',
    source: 'sale', stage: 'stage_2',
    stage_updated_at: '2026-05-25', estimated_value: 280_000_000,
    tour_date: '2026-08-10', deadline: '2026-06-30',
    created_at: '2026-04-22', updated_at: '2026-06-08',
  },
  {
    id: 'opp-3',
    title: 'VPBank – Hội nghị Leadership',
    description: 'Hội nghị lãnh đạo cấp cao 35 người, Hạ Long 2N1Đ. Đang thực hiện tour.',
    contact_id: 'c3', assigned_to: 'u1', created_by: 'u5',
    source: 'mkt', stage: 'stage_4',
    stage_updated_at: '2026-06-07', estimated_value: 120_000_000,
    tour_date: '2026-06-07',
    created_at: '2026-05-03', updated_at: '2026-06-07',
  },
  {
    id: 'opp-4',
    title: 'FPT Software – Summer Tour',
    description: 'Tour nghỉ hè cho 60 nhân viên FPT Software. Sa Pa 3N2Đ, hoạt động ngoài trời và chinh phục Fansipan.',
    contact_id: 'c4', assigned_to: 'u3', created_by: 'u5',
    source: 'partner', stage: 'stage_1',
    stage_updated_at: '2026-06-08', estimated_value: 95_000_000,
    tour_date: '2026-07-25', deadline: '2026-07-01',
    created_at: '2026-06-08', updated_at: '2026-06-08',
  },
  {
    id: 'opp-5',
    title: 'ABC Corp – Team Outing',
    description: 'Tour team outing 4N3Đ Hội An, 30 người. Đã hoàn thành tháng 5/2026, khách hàng rất hài lòng.',
    contact_id: 'c5', assigned_to: 'u4', created_by: 'u5',
    source: 'referral', stage: 'stage_5',
    stage_updated_at: '2026-05-25', estimated_value: 210_000_000, actual_value: 215_000_000,
    tour_date: '2026-05-20',
    created_at: '2026-04-01', updated_at: '2026-05-25',
  },
  {
    id: 'opp-6',
    title: 'Sun Group – Leadership Retreat',
    description: 'Retreat ban lãnh đạo Sun Group, 25 người. Phú Quốc 5N4Đ, villa cao cấp riêng biệt. Đang báo giá.',
    contact_id: 'c6', assigned_to: 'u2', created_by: 'u5',
    source: 'bod', stage: 'stage_2',
    stage_updated_at: '2026-05-20', estimated_value: 850_000_000,
    tour_date: '2026-09-05', deadline: '2026-07-15',
    created_at: '2026-04-17', updated_at: '2026-06-03',
  },
  {
    id: 'opp-7',
    title: 'Mobifone – Kỷ niệm 30 năm',
    description: 'Tour kỷ niệm 30 năm thành lập Mobifone. 100 người, Nha Trang 3N2Đ, gala dinner đặc biệt.',
    contact_id: 'c7', assigned_to: 'u3', created_by: 'u5',
    source: 'mkt', stage: 'stage_1',
    stage_updated_at: '2026-06-06', estimated_value: 175_000_000,
    tour_date: '2026-08-15', deadline: '2026-07-20',
    created_at: '2026-06-06', updated_at: '2026-06-06',
  },
  {
    id: 'opp-8',
    title: 'EVN – Công đoàn 2026',
    description: 'Tour công đoàn Đà Lạt 3N2Đ, 55 người. Đã mất do ngân sách bị cắt.',
    contact_id: 'c8', assigned_to: 'u4', created_by: 'u5',
    source: 'sale', stage: 'lost',
    stage_updated_at: '2026-04-10', estimated_value: 145_000_000,
    lost_reason: 'Ngân sách bị cắt do tái cơ cấu nội bộ cuối Q1/2026. KH hẹn xem xét lại năm 2027.',
    created_at: '2026-03-05', updated_at: '2026-04-10',
  },
  {
    id: 'opp-9',
    title: 'Techcombank – MICE Quý 3',
    description: 'Hội nghị MICE cho 120 người, Phú Quốc 4N3Đ. Đã ký HĐ, đang chuẩn bị trước tour.',
    contact_id: 'c9', assigned_to: 'u2', created_by: 'u5',
    source: 'partner', stage: 'stage_3',
    stage_updated_at: '2026-06-01', estimated_value: 680_000_000,
    tour_date: '2026-07-28', deadline: '2026-06-25',
    created_at: '2026-05-12', updated_at: '2026-06-05',
  },
  {
    id: 'opp-10',
    title: 'Trần Thị Mai – Gia đình',
    description: 'Tour gia đình Đà Nẵng 3N2Đ, 8 người. Đang trong tour.',
    contact_id: 'c10', assigned_to: 'u1', created_by: 'u1',
    source: 'cskh', stage: 'stage_4',
    stage_updated_at: '2026-06-06', estimated_value: 35_000_000,
    tour_date: '2026-06-06',
    created_at: '2026-05-20', updated_at: '2026-06-06',
  },
]

export const ACTIVITY_LOGS: ActivityLog[] = [
  // === opp-1: Honda VN – đầy đủ timeline ===
  {
    id: 'log-1', opportunity_id: 'opp-1', user_id: 'u1', log_type: 'sale_update',
    log_date: '2026-05-20',
    description: 'Tiếp nhận yêu cầu từ chị Lan Anh – Trưởng phòng HR Honda VN qua form Zalo. Đoàn 45 người, tour Phú Quốc 5N4Đ, dự kiến 15–19/7. Yêu cầu: KS 5*, team building ngoài trời, BBQ bãi biển và gala dinner.',
    next_step: 'Lập 2 phương án CT tour + báo giá sơ bộ',
    next_step_due: '2026-05-22',
    stage_at_log: 'stage_1',
    created_at: '2026-05-20T09:30:00',
  },
  {
    id: 'log-2', opportunity_id: 'opp-1', user_id: 'u1', log_type: 'stage_change',
    log_date: '2026-05-22',
    description: 'Đã gửi 2 phương án chương trình: PA1 (Seashells Resort 4*, 420M) và PA2 (Fusion Resort 5*, 450M). Chị Lan Anh sẽ họp nội bộ HR và phản hồi trước 25/5.',
    next_step: 'Follow-up sau 26/5 nếu chưa có phản hồi',
    next_step_due: '2026-05-26',
    stage_at_log: 'stage_2', stage_from: 'stage_1', stage_to: 'stage_2',
    created_at: '2026-05-22T14:15:00',
  },
  {
    id: 'log-3', opportunity_id: 'opp-1', user_id: 'u1', log_type: 'sale_update',
    log_date: '2026-05-28',
    description: 'Chị Lan Anh xác nhận chọn PA2 – Fusion Resort 5*. Yêu cầu điều chỉnh: đổi 1 buổi tối ăn tại nhà hàng thành BBQ riêng trên bãi biển. Đang liên hệ vendor cập nhật CT.',
    next_step: 'Hoàn thiện báo giá chính thức + gửi HĐ nháp',
    next_step_due: '2026-06-02',
    stage_at_log: 'stage_2',
    created_at: '2026-05-28T10:00:00',
  },
  {
    id: 'log-4', opportunity_id: 'opp-1', user_id: 'u1', log_type: 'sale_update',
    log_date: '2026-06-02',
    description: 'Gửi báo giá chính thức 450,000,000 VNĐ (đã bao gồm BBQ bãi biển). Honda đang trình phòng Tài vụ phê duyệt. Dự kiến có kết quả trước 05/6.',
    next_step: 'Gọi điện xác nhận tiến độ phê duyệt nội bộ',
    next_step_due: '2026-06-05',
    stage_at_log: 'stage_2',
    created_at: '2026-06-02T11:30:00',
  },
  {
    id: 'log-5', opportunity_id: 'opp-1', user_id: 'u1', log_type: 'stage_change',
    log_date: '2026-06-05',
    description: 'Honda VN xác nhận CHỐT TOUR! Ký hợp đồng ngày 07/6, đặt cọc 70% = 315,000,000 VNĐ. Đã gửi mail thông báo cho phòng kế toán và điều hành.',
    next_step: 'Ký HĐ chính thức + thu cọc ngày 07/6',
    next_step_due: '2026-06-07',
    stage_at_log: 'stage_3', stage_from: 'stage_2', stage_to: 'stage_3',
    created_at: '2026-06-05T16:00:00',
  },
  {
    id: 'log-6', opportunity_id: 'opp-1', user_id: 'u1', log_type: 'sale_update',
    log_date: '2026-06-07',
    description: 'ĐÃ NHẬN CỌC 315,000,000 VNĐ qua chuyển khoản (Honda VN – BIDV). Đã gửi mail xác nhận và bill tạm cho phòng kế toán Honda.',
    next_step: 'Liên hệ Fusion Resort xác nhận room list + Bamboo Airways đặt vé',
    next_step_due: '2026-06-15',
    stage_at_log: 'stage_3',
    created_at: '2026-06-07T09:00:00',
  },
  {
    id: 'log-11', opportunity_id: 'opp-1', user_id: 'u1', log_type: 'sale_update',
    log_date: '2026-06-08',
    description: 'Gọi điện Fusion Resort xác nhận room list: 22 phòng Superior + 1 Suite + 2 Deluxe cho đoàn 45 người. KS yêu cầu ký booking agreement trước 15/6.',
    next_step: 'Ký booking agreement với Fusion Resort + đặt vé Bamboo',
    next_step_due: '2026-06-15',
    stage_at_log: 'stage_3',
    created_at: '2026-06-08T11:00:00',
  },

  // === opp-2: Viettel – log hôm nay ===
  {
    id: 'log-7', opportunity_id: 'opp-2', user_id: 'u2', log_type: 'stage_change',
    log_date: '2026-06-01',
    description: 'Họp với anh Minh (Viettel) trao đổi nhu cầu team building. 80 người, Đà Nẵng 3N2Đ, budget ~280M. Yêu cầu workshop lãnh đạo và các trò chơi tập thể.',
    stage_at_log: 'stage_2', stage_from: 'stage_1', stage_to: 'stage_2',
    created_at: '2026-06-01T14:00:00',
  },
  {
    id: 'log-8', opportunity_id: 'opp-2', user_id: 'u2', log_type: 'sale_update',
    log_date: '2026-06-08',
    description: 'Đã hoàn thiện 2 phương án CT team building (PA1: Furama 4* + PA2: Hyatt Regency 5*) và gửi báo giá sơ bộ. Chờ anh Minh phản hồi sau họp ban giám đốc ngày 10/6.',
    next_step: 'Follow-up sau 10/6, đặt lịch demo CT nếu khách có phản hồi',
    next_step_due: '2026-06-12',
    stage_at_log: 'stage_2',
    created_at: '2026-06-08T09:30:00',
  },

  // === opp-3: VPBank – trong tour ===
  {
    id: 'log-9', opportunity_id: 'opp-3', user_id: 'u1', log_type: 'stage_change',
    log_date: '2026-06-07',
    description: 'Đoàn VPBank 35 người đã lên đường sáng 07/6. HDV đi kèm: Anh Tuấn. Tàu Hạ Long đã confirm, phòng KS OK. Mọi dịch vụ hoạt động bình thường, ban tổ chức hài lòng.',
    stage_at_log: 'stage_4', stage_from: 'stage_3', stage_to: 'stage_4',
    created_at: '2026-06-07T07:30:00',
  },

  // === opp-4: FPT – log hôm nay ===
  {
    id: 'log-10', opportunity_id: 'opp-4', user_id: 'u3', log_type: 'sale_update',
    log_date: '2026-06-08',
    description: 'Gọi điện trao đổi với anh Đức (FPT Software). 60 người, Sa Pa 3N2Đ, dự kiến 25-27/7. Budget 80-100M. Yêu cầu có hoạt động chinh phục Fansipan cho nhóm năng động (30 người) và nhóm nghỉ dưỡng nhẹ nhàng.',
    next_step: 'Lập CT tách nhóm + báo giá chi tiết trước 12/6',
    next_step_due: '2026-06-12',
    stage_at_log: 'stage_1',
    created_at: '2026-06-08T10:15:00',
  },

  // === opp-9: Techcombank – trước tour ===
  {
    id: 'log-12', opportunity_id: 'opp-9', user_id: 'u2', log_type: 'stage_change',
    log_date: '2026-06-01',
    description: 'Đã ký hợp đồng chính thức với Techcombank. Nhận cọc 476,000,000 VNĐ (70%). Đang chuẩn bị hồ sơ đặt dịch vụ: KS, xe, vé máy bay cho 120 người.',
    stage_at_log: 'stage_3', stage_from: 'stage_2', stage_to: 'stage_3',
    created_at: '2026-06-01T15:00:00',
  },
]

export const TASKS: Task[] = [
  // GĐ1 – Honda VN (2/2 done)
  { id: 't1', opportunity_id: 'opp-1', stage: 1, title: 'Thu thập thông tin đoàn (số lượng, ngày đi, yêu cầu đặc biệt)', is_done: true, done_at: '2026-05-20' },
  { id: 't2', opportunity_id: 'opp-1', stage: 1, title: 'Xác nhận loại hình tour và ngân sách dự kiến', is_done: true, done_at: '2026-05-20' },

  // GĐ2 – Honda VN (2/3 done)
  { id: 't3', opportunity_id: 'opp-1', stage: 2, title: 'Lập 2 phương án chương trình tour', is_done: true, done_at: '2026-05-22', assigned_to: 'u1' },
  { id: 't4', opportunity_id: 'opp-1', stage: 2, title: 'Gửi báo giá chi tiết cho khách hàng', is_done: true, done_at: '2026-06-02', assigned_to: 'u1' },
  { id: 't5', opportunity_id: 'opp-1', stage: 2, title: 'Xác nhận và chốt nhà cung cấp (KS, xe, HDV)', is_done: false, due_date: '2026-06-15', assigned_to: 'u1' },

  // GĐ3 – Honda VN (2/5 done)
  { id: 't6', opportunity_id: 'opp-1', stage: 3, title: 'Ký hợp đồng chính thức', is_done: true, done_at: '2026-06-05', assigned_to: 'u1' },
  { id: 't7', opportunity_id: 'opp-1', stage: 3, title: 'Thu đặt cọc 70% (315 triệu)', is_done: true, done_at: '2026-06-07', assigned_to: 'u5' },
  { id: 't8', opportunity_id: 'opp-1', stage: 3, title: 'Gửi thông tin tour + mẫu danh sách hành khách cho đoàn', is_done: false, due_date: '2026-06-20', assigned_to: 'u7' },
  { id: 't9', opportunity_id: 'opp-1', stage: 3, title: 'Xác nhận phòng khách sạn (room list Fusion Resort)', is_done: false, due_date: '2026-06-20', assigned_to: 'u1' },
  { id: 't10', opportunity_id: 'opp-1', stage: 3, title: 'Đặt vé máy bay (Bamboo Airways – 45 vé HAN-PQC)', is_done: false, due_date: '2026-06-25', assigned_to: 'u8' },
]

// --- helpers ---

export function getUserById(id: string): User | undefined {
  return USERS.find(u => u.id === id)
}

export function getContactById(id: string): Contact | undefined {
  return CONTACTS.find(c => c.id === id)
}

export function getOppById(id: string): Opportunity | undefined {
  return OPPORTUNITIES.find(o => o.id === id)
}

export function getLogsForOpp(oppId: string): ActivityLog[] {
  return ACTIVITY_LOGS
    .filter(l => l.opportunity_id === oppId)
    .sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime())
}

export function getTasksForOpp(oppId: string): Task[] {
  return TASKS.filter(t => t.opportunity_id === oppId)
}

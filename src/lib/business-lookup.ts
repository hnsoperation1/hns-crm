export interface BusinessInfo {
  name: string
  address?: string
}

/**
 * Tra cứu thông tin doanh nghiệp theo mã số thuế.
 * Hiện dùng VietQR (miễn phí, không cần key).
 * Để chuyển sang meinvoice: thay phần implementation bên dưới,
 * giữ nguyên interface BusinessInfo và signature hàm này.
 */
export async function lookupBusiness(taxCode: string): Promise<BusinessInfo | null> {
  // --- VietQR provider ---
  const res = await fetch(`https://api.vietqr.io/v2/business/${taxCode.trim()}`, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 }, // cache 1h — thông tin DN ít thay đổi
  })
  if (!res.ok) return null
  const json = await res.json()
  if (json.code !== '00' || !json.data) return null
  return {
    name: json.data.name ?? '',
    address: json.data.address ?? undefined,
  }

  // --- Khi chuyển sang meinvoice, xóa block trên và thay bằng: ---
  // const res = await fetch(`https://api.meinvoice.vn/.../${taxCode}`, {
  //   headers: { Authorization: `Bearer ${process.env.MEINVOICE_API_KEY}` },
  // })
  // ...
}

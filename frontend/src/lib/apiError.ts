/**
 * API xatosidan foydalanuvchiga ko'rsatiladigan matnni oladi (#6).
 *
 * Backend formatlari:
 * - biznes xato (ApiResponse::error): { success: false, error: { code, message } }
 * - validatsiya (422):               { message, errors: { field: [msg, ...] } }
 *
 * Tartib: error.message → birinchi validatsiya xabari → message → fallback.
 * `detail` maydonini o'qimang — backend uni hech qachon qaytarmaydi.
 */
type ApiErrorBody = {
  error?: { code?: string; message?: string };
  errors?: Record<string, string[] | string>;
  message?: string;
};

export function apiErrorMessage(err: unknown, fallback = 'Xatolik yuz berdi'): string {
  const response = (err as { response?: { status?: number; data?: ApiErrorBody } } | null)?.response;
  const data = response?.data;

  if (!response) {
    // So'rov serverga yetib bormadi (tarmoq uzildi, server o'chiq)
    return (err as { message?: string } | null)?.message === 'Network Error'
      ? "Server bilan aloqa yo'q. Internetni tekshirib, qayta urinib ko'ring."
      : fallback;
  }

  // 5xx: backend matni ("Server Error") foydalanuvchi uchun emas
  if ((response.status ?? 0) >= 500) {
    return "Serverda xatolik yuz berdi. Birozdan keyin qayta urinib ko'ring.";
  }

  if (data?.error?.message) return data.error.message;

  if (data?.errors) {
    const first = Object.values(data.errors)[0];
    const msg = Array.isArray(first) ? first[0] : first;
    if (msg) return msg;
  }

  return data?.message || fallback;
}

/** Validatsiya xatolari maydon bo'yicha: { phone: 'Telefon majburiy', ... } */
export function apiFieldErrors(err: unknown): Record<string, string> {
  const errors = (err as { response?: { data?: ApiErrorBody } } | null)?.response?.data?.errors ?? {};
  return Object.fromEntries(
    Object.entries(errors).map(([field, msgs]) => [field, Array.isArray(msgs) ? msgs[0] : msgs]),
  );
}

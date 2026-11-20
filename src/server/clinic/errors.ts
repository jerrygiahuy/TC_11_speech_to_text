import "server-only";

/** Lỗi có mã HTTP; route dịch thẳng sang Response. Thông điệp an toàn để trả cho client. */
export class ClinicHttpError extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 409 | 500,
    message: string,
  ) {
    super(message);
    this.name = "ClinicHttpError";
  }
}

export const notFound = () => new ClinicHttpError(404, "Không tìm thấy.");

export const storeError = (detail?: string) => {
  if (detail) console.error("Lỗi kho dữ liệu lịch khám:", detail);
  return new ClinicHttpError(500, "Không đọc được dữ liệu lịch khám.");
};

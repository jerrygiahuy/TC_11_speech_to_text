import "server-only";
import type { ClinicActor } from "./ports";

/**
 * Actor demo cố định phía server, khớp bác sĩ và cơ sở trong data/clinic/ (BS01 ở CS01).
 * Thay bằng actor thật của ưu tiên 1 khi có; client không được chọn actor.
 */
export const demoActor: ClinicActor = Object.freeze({ doctor_id: "BS01", facility_id: "CS01" });

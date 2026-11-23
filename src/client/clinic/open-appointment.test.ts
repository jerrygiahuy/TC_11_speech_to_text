import assert from "node:assert/strict";
import { test } from "node:test";
import type { AppointmentItem } from "@/shared/clinic/types";
import { chooseAppointment, openHref } from "./open-appointment";

const item = (id: string) => ({ appointment: { id } }) as unknown as AppointmentItem;

test("zero_one_many_and_selected", () => {
  assert.deepEqual(chooseAppointment([]), { action: "disabled", appointmentId: null });
  assert.deepEqual(chooseAppointment([item("A")]), { action: "open", appointmentId: "A" });
  assert.deepEqual(chooseAppointment([item("A"), item("B")]), { action: "pick", appointmentId: null });
  assert.deepEqual(chooseAppointment([item("A"), item("B")], "B"), { action: "open", appointmentId: "B" });
  // Lịch được chọn không thuộc danh sách (của người khác/đã đóng): không được mở lịch khác thay thế.
  assert.deepEqual(chooseAppointment([item("A")], "Z"), { action: "disabled", appointmentId: null });
});

test("open_href_encodes_record_id", () => {
  assert.equal(openHref("a b"), "/?ho_so=a%20b");
});

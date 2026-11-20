/** Raw forwarding is retired: inference requires an approved privacy ticket. */
export async function POST() {
  return Response.json({ error: "Luồng cũ đã được thay thế. Hãy kiểm tra thông tin riêng tư trong Trợ lý AI rồi tạo bản nháp." }, { status: 410 });
}

import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "@/lib/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!isAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum ficheiro enviado" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo não permitido. Use JPG, PNG ou WEBP." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Ficheiro demasiado grande (máx. 5MB)" }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Use Supabase Storage when configured (production / Vercel)
  const supabase = getSupabaseServiceClient();
  if (supabase) {
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filename, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(filename);
    return NextResponse.json({ ok: true, url: publicUrl });
  }

  // Fallback: save to public/uploads (local development)
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  return NextResponse.json({ ok: true, url: `/uploads/${filename}` });
}

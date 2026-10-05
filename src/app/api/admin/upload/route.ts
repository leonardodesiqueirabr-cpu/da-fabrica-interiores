import { randomUUID } from "node:crypto";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { requireAdminSession } from "@/lib/admin-session";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const LOCAL_UPLOAD_PREFIX = "/uploads/";
const PRODUCT_IMAGES_BUCKET = "product-images";
const ALLOWED_UPLOAD_FOLDERS = new Set(["homepage"]);

function getSupabaseStoragePathFromUrl(url: string): string | null {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) return null;

  const candidatePaths = new Set<string>();

  try {
    const parsedUrl = new URL(normalizedUrl);
    candidatePaths.add(parsedUrl.pathname);
  } catch {
    // Suporta URLs relativas como /storage/v1/object/public/...
    try {
      const parsedRelativeUrl = new URL(normalizedUrl, "http://localhost");
      candidatePaths.add(parsedRelativeUrl.pathname);
    } catch {
      candidatePaths.add(normalizedUrl);
    }
  }

  for (const candidatePath of candidatePaths) {
    const cleanedPath = candidatePath.split("?")[0];
    const objectMatch = cleanedPath.match(/\/storage\/v1\/object\/(?:public|sign|authenticated|private)\/([^/]+)\/(.+)$/);
    const renderMatch = cleanedPath.match(
      /\/storage\/v1\/object\/render\/image\/(?:public|sign|authenticated|private)\/([^/]+)\/(.+)$/,
    );
    const match = objectMatch || renderMatch;
    if (!match) continue;

    const [, bucket, objectPathRaw] = match;
    if (bucket !== PRODUCT_IMAGES_BUCKET) return null;

    const objectPath = decodeURIComponent(objectPathRaw).replace(/^\/+/, "");
    if (!objectPath) return null;
    return objectPath;
  }

  return null;
}

function getLocalUploadPathFromUrl(url: string): string | null {
  if (!url.startsWith(LOCAL_UPLOAD_PREFIX)) return null;
  const relativePath = url.slice(LOCAL_UPLOAD_PREFIX.length);
  if (!relativePath || relativePath.includes("..")) return null;
  return path.join(process.cwd(), "public", "uploads", relativePath);
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  const previousUrlValue = formData.get("previousUrl");
  const folderValue = formData.get("folder");
  const folder = typeof folderValue === "string" && folderValue.trim() ? folderValue.trim() : null;
  const previousUrl = typeof previousUrlValue === "string" && previousUrlValue.trim() ? previousUrlValue.trim() : null;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum ficheiro enviado" }, { status: 400 });
  }

  if (folder && !ALLOWED_UPLOAD_FOLDERS.has(folder)) {
    return NextResponse.json({ error: "Pasta de upload inválida." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo não permitido. Use JPG, PNG ou WEBP." }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Ficheiro demasiado grande (máx. 5MB)" }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const filename = folder ? `${folder}/${randomUUID()}${ext}` : `${randomUUID()}${ext}`;
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
    let oldFileDeleted = false;

    if (previousUrl) {
      const previousObjectPath = getSupabaseStoragePathFromUrl(previousUrl);
      if (previousObjectPath) {
        const { error: deleteError } = await supabase.storage.from("product-images").remove([previousObjectPath]);
        if (deleteError) {
          console.warn("[admin/upload] Falha ao remover imagem antiga do bucket product-images:", deleteError.message);
        } else {
          oldFileDeleted = true;
        }
      } else {
        console.info("[admin/upload] Imagem antiga preservada: URL anterior não reconhecida como product-images.");
      }
    }

    return NextResponse.json({ ok: true, url: publicUrl, oldFileDeleted });
  }

  // Fallback: save to public/uploads (local development)
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  const newLocalUrl = `${LOCAL_UPLOAD_PREFIX}${filename}`;
  let oldFileDeleted = false;

  if (previousUrl) {
    const previousLocalPath = getLocalUploadPathFromUrl(previousUrl);
    if (previousLocalPath) {
      try {
        await unlink(previousLocalPath);
        oldFileDeleted = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        console.warn("[admin/upload] Falha ao remover imagem antiga local:", message);
      }
    } else {
      console.info("[admin/upload] Imagem antiga local preservada: URL anterior não pertence a /uploads.");
    }
  }

  return NextResponse.json({ ok: true, url: newLocalUrl, oldFileDeleted });
}

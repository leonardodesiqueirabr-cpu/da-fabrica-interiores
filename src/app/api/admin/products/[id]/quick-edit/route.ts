import { cookies } from "next/headers";
import { isAdminSessionValue, ADMIN_SESSION_COOKIE } from "@/lib/admin-auth";
import { quickEditProductSchema } from "@/lib/data/admin-schemas";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  if (!isAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const payload = await request.json();

    // Validate payload
    const validatedPayload = quickEditProductSchema.parse(payload);

    // Find the product slug from the id
    const foldersIndexPath = join(process.cwd(), "public", "produtos", ".folders-index.json");
    const foldersIndex = JSON.parse(readFileSync(foldersIndexPath, "utf-8")) as Record<string, string>;
    
    const slug = foldersIndex[id];
    if (!slug) {
      return Response.json({ error: "Produto não encontrado" }, { status: 404 });
    }

    // Read the product JSON file
    const productJsonPath = join(process.cwd(), "public", "produtos", slug, "produto.json");
    const productFile = JSON.parse(readFileSync(productJsonPath, "utf-8")) as any;

    // Update only the editable fields in the data object
    productFile.data.name = validatedPayload.name;
    productFile.data.basePrice = validatedPayload.basePrice;
    productFile.data.available = validatedPayload.available;
    productFile.data.categories = validatedPayload.categories;
    
    // Also update top-level name
    productFile.name = validatedPayload.name;

    // Update timestamp
    productFile.updatedAt = new Date().toISOString();

    // Write back to file
    writeFileSync(productJsonPath, JSON.stringify(productFile, null, 2), "utf-8");

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Error in quick-edit:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Erro ao salvar" },
      { status: 400 }
    );
  }
}

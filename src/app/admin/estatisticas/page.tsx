import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Eye, MessageCircle, Users } from "lucide-react";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "@/lib/admin-auth";
import { ANALYTICS_PERIODS, type AnalyticsPeriod, getProductSlugFromPath } from "@/lib/analytics/shared";
import { getAnalyticsSummary } from "@/lib/data/analytics";
import { getCatalogData } from "@/lib/data/catalog";
import { ADMIN_CATEGORIES } from "@/lib/data/categories";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Lisbon",
});
const numberFormatter = new Intl.NumberFormat("pt-PT");
const formatNumber = (value: number) => numberFormatter.format(value);

function parsePeriod(raw: string | string[] | undefined): AnalyticsPeriod {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return (ANALYTICS_PERIODS as readonly number[]).includes(value) ? (value as AnalyticsPeriod) : 30;
}

const cardClass = "rounded-xl border border-[#e8e8eb] bg-white shadow-[0_2px_8px_rgba(20,20,25,0.025)]";
const thClass = "px-4 py-3 font-semibold sm:px-5";
const tdClass = "px-4 py-3 sm:px-5";

function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-sm text-[#898c92]">
        {children}
      </td>
    </tr>
  );
}

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string | string[] }>;
}) {
  const cookieStore = await cookies();
  if (!isAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  const period = parsePeriod((await searchParams).periodo);
  const [result, catalog] = await Promise.all([getAnalyticsSummary(period), getCatalogData()]);

  const productNames = new Map(catalog.products.map((product) => [product.slug, product.name]));
  const categoryLabels = new Map(ADMIN_CATEGORIES.map((category) => [category.slug, category.label]));
  const productLabel = (slug: string) => productNames.get(slug) ?? slug;
  const pageLabel = (path: string) => {
    if (path === "/") return "Página inicial";
    if (path === "/produtos") return "Todos os produtos";
    if (path === "/mais-vendidos") return "Mais vendidos";
    if (path.startsWith("/categorias/")) {
      const slug = path.slice("/categorias/".length);
      return `Categoria: ${categoryLabels.get(slug) ?? slug}`;
    }
    const slug = getProductSlugFromPath(path);
    return slug ? productLabel(slug) : path;
  };

  const summary = result.ok ? result.summary : null;
  const hasData = Boolean(summary?.collectionStartedAt);
  const totalClicks = summary ? summary.clicksProduct + summary.clicksFloat + summary.clicksOther : 0;
  const isPartialPeriod =
    summary?.collectionStartedAt != null && new Date(summary.collectionStartedAt) > new Date(summary.since);

  return (
    <section className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#222428] sm:text-3xl">Estatísticas</h1>
          <p className="mt-1 text-sm text-[#777b82]">
            {hasData && summary?.collectionStartedAt
              ? `Recolha iniciada em ${dateFormatter.format(new Date(summary.collectionStartedAt))}.`
              : "A recolha começa com as primeiras visitas ao site publicado."}
          </p>
        </div>
        <div className="inline-flex w-fit rounded-lg bg-[#f0f0f1] p-1" aria-label="Período">
          {ANALYTICS_PERIODS.map((days) => (
            <Link
              key={days}
              href={`/admin/estatisticas?periodo=${days}`}
              aria-current={period === days ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                period === days ? "bg-white text-[#24262a] shadow-sm" : "text-[#777b82] hover:text-[#34373c]"
              }`}
            >
              Últimos {days} dias
            </Link>
          ))}
        </div>
      </div>

      {!result.ok ? (
        <div className={`${cardClass} mt-8 p-6 text-sm text-[#555960]`}>
          {result.reason === "not-configured" ? (
            <p>O Supabase não está configurado neste ambiente, por isso não há estatísticas para mostrar.</p>
          ) : result.reason === "not-migrated" ? (
            <p>
              A tabela de estatísticas ainda não existe. Aplique a migração{" "}
              <code className="rounded bg-[#f4f4f5] px-1.5 py-0.5 text-xs">20261117000000_image_visibility_stock_analytics.sql</code>{" "}
              no Supabase.
            </p>
          ) : (
            <p>Não foi possível carregar as estatísticas. {result.message}</p>
          )}
        </div>
      ) : (
        <>
          {isPartialPeriod ? (
            <p className="mt-6 rounded-lg border border-[#f1e2c8] bg-[#fffaf0] px-4 py-2.5 text-xs text-[#8a6326]">
              Período parcial: só existem dados desde o início da recolha.
            </p>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Visualizações de páginas",
                value: summary!.pageviews,
                icon: Eye,
                iconClass: "bg-[#f4f4f5] text-[#666a71]",
                hint: null,
              },
              {
                label: "Visitantes únicos diários",
                value: summary!.visitors,
                icon: Users,
                iconClass: "bg-[#fff4e9] text-[#b95b17]",
                hint: "O total do período soma os visitantes únicos de cada dia; a mesma pessoa pode contar em dias diferentes.",
              },
              {
                label: "Cliques no WhatsApp",
                value: totalClicks,
                icon: MessageCircle,
                iconClass: "bg-[#eaf5ee] text-[#39764e]",
                hint: `Produto ${formatNumber(summary!.clicksProduct)} · Flutuante ${formatNumber(summary!.clicksFloat)}${
                  summary!.clicksOther > 0 ? ` · Outros ${formatNumber(summary!.clicksOther)}` : ""
                }`,
              },
            ].map((item) => (
              <article key={item.label} className={`${cardClass} flex items-start justify-between p-5`}>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#858990]">{item.label}</p>
                  <p className="text-3xl font-semibold tabular-nums tracking-tight text-[#25272b]">
                    {formatNumber(item.value)}
                  </p>
                  {item.hint ? <p className="text-xs text-[#898c92]">{item.hint}</p> : null}
                </div>
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.iconClass}`}>
                  <item.icon size={19} strokeWidth={1.8} />
                </span>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className={`${cardClass} overflow-hidden`}>
              <h2 className="border-b border-[#eeeeef] px-4 py-4 text-sm font-semibold text-[#292b30] sm:px-5">
                Páginas mais vistas
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#fafafb] text-[10px] uppercase tracking-[0.12em] text-[#858990]">
                    <tr className="border-b border-[#eeeeef]">
                      <th className={thClass}>Página</th>
                      <th className={`${thClass} text-right`}>Visualizações</th>
                      <th className={`${thClass} text-right`}>Visitantes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f1]">
                    {summary!.topPages.map((row) => (
                      <tr key={row.path}>
                        <td className={tdClass}>
                          <span className="block font-medium text-[#292b30]">{pageLabel(row.path)}</span>
                          <span className="block text-xs text-[#9a9da3]">{row.path}</span>
                        </td>
                        <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(row.views)}</td>
                        <td className={`${tdClass} text-right tabular-nums text-[#666a71]`}>{formatNumber(row.visitors)}</td>
                      </tr>
                    ))}
                    {summary!.topPages.length === 0 ? <EmptyRow colSpan={3}>Ainda sem visualizações neste período.</EmptyRow> : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={`${cardClass} overflow-hidden`}>
              <h2 className="border-b border-[#eeeeef] px-4 py-4 text-sm font-semibold text-[#292b30] sm:px-5">
                Produtos mais vistos
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#fafafb] text-[10px] uppercase tracking-[0.12em] text-[#858990]">
                    <tr className="border-b border-[#eeeeef]">
                      <th className={thClass}>Produto</th>
                      <th className={`${thClass} text-right`}>Visualizações</th>
                      <th className={`${thClass} text-right`}>Visitantes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f1]">
                    {summary!.topProducts.map((row) => (
                      <tr key={row.slug}>
                        <td className={`${tdClass} font-medium text-[#292b30]`}>{productLabel(row.slug)}</td>
                        <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(row.views)}</td>
                        <td className={`${tdClass} text-right tabular-nums text-[#666a71]`}>{formatNumber(row.visitors)}</td>
                      </tr>
                    ))}
                    {summary!.topProducts.length === 0 ? <EmptyRow colSpan={3}>Ainda sem visitas a produtos neste período.</EmptyRow> : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className={`${cardClass} mt-6 overflow-hidden`}>
            <div className="border-b border-[#eeeeef] px-4 py-4 sm:px-5">
              <h2 className="text-sm font-semibold text-[#292b30]">Cliques no WhatsApp por produto</h2>
              <p className="mt-1 text-xs text-[#858990]">
                Cliques feitos na página de cada produto, no botão do produto ou no botão flutuante.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#fafafb] text-[10px] uppercase tracking-[0.12em] text-[#858990]">
                  <tr className="border-b border-[#eeeeef]">
                    <th className={thClass}>Produto</th>
                    <th className={`${thClass} text-right`}>Botão do produto</th>
                    <th className={`${thClass} text-right`}>Botão flutuante</th>
                    <th className={`${thClass} text-right`}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f1]">
                  {summary!.clicksByProduct.map((row) => (
                    <tr key={row.slug}>
                      <td className={`${tdClass} font-medium text-[#292b30]`}>{productLabel(row.slug)}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(row.productClicks)}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(row.floatClicks)}</td>
                      <td className={`${tdClass} text-right font-semibold tabular-nums`}>{formatNumber(row.total)}</td>
                    </tr>
                  ))}
                  {summary!.clicksByProduct.length === 0 ? (
                    <EmptyRow colSpan={4}>Ainda sem cliques no WhatsApp em páginas de produto neste período.</EmptyRow>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-6 text-xs leading-relaxed text-[#9a9da3]">
            Não são contados acessos ao administrador, sessões de administrador, ambientes de desenvolvimento, robôs nem
            navegadores com “Do Not Track”/GPC ativo. Não são guardados IP, cookies nem identificadores persistentes.
          </p>
        </>
      )}
    </section>
  );
}

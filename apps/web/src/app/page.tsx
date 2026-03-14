export const dynamic = "force-dynamic";

async function fetchHealth(): Promise<string> {
  const base =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:4000";
  try {
    const response = await fetch(`${base}/healthz`, { cache: "no-store" });
    if (!response.ok) {
      return `api unhealthy (${response.status})`;
    }
    return "api healthy";
  } catch {
    return "api unreachable";
  }
}

export default async function Home() {
  const health = await fetchHealth();

  return (
    <main style={{ maxWidth: 860, margin: "4rem auto", padding: "0 1rem" }}>
      <h1 style={{ marginBottom: 8 }}>PeopleFlow HR</h1>
      <p style={{ color: "#4b5563", marginTop: 0 }}>
        Multi-tenant HR MVP scaffold is online.
      </p>
      <section
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: "1rem",
          marginTop: "1rem",
        }}
      >
        <strong>Runtime status:</strong> {health}
      </section>
    </main>
  );
}

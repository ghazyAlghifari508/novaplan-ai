export async function GET() {
  const docs = {
    name: "NovaPlan API v1",
    version: "1.0.0",
    description: "REST API untuk generate dan manage PRD secara programmatic. Hanya untuk plan Hengker.",
    authentication: {
      type: "Bearer Token",
      header: "Authorization: Bearer nvp_...",
      note: "Generate API key di /settings/api",
    },
    rateLimit: {
      requests: 60,
      window: "per menit",
      perApiKey: true,
    },
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/generate",
        description: "Generate PRD dari deskripsi. Response berupa SSE stream (text/event-stream).",
        request: {
          contentType: "application/json",
          body: {
            description: { type: "string", required: true, description: "Deskripsi produk yang ingin dibuat PRD-nya" },
            name: { type: "string", required: false, description: "Nama PRD (default: Untitled PRD)" },
            preferences: { type: "object", required: false, description: "Preferensi generate (optional)" },
          },
        },
        response: {
          type: "text/event-stream",
          events: {
            delta: { type: "string", description: "Token konten yang di-stream" },
            done: { projectId: "string", conversationId: "string", description: "Sinyal selesai" },
            error: { error: "string", description: "Jika terjadi error" },
          },
        },
        example: {
          curl: `curl -X POST https://novaplan.ai/api/v1/generate \\
  -H "Authorization: Bearer nvp_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"description": "Aplikasi todo list mobile dengan fitur AI prioritization", "name": "TodoAI"}'
`,
        },
      },
      {
        method: "GET",
        path: "/api/v1/projects",
        description: "List semua PRD yang pernah dibuat via API.",
        query: {
          page: { type: "number", required: false, description: "Halaman (default: 1)" },
          limit: { type: "number", required: false, description: "Jumlah per halaman (default: 20, max: 50)" },
        },
        response: {
          type: "application/json",
          body: {
            data: "Array<Project>",
            pagination: { page: "number", limit: "number", total: "number", totalPages: "number" },
          },
        },
        example: {
          curl: `curl -X GET "https://novaplan.ai/api/v1/projects?page=1&limit=10" \\
  -H "Authorization: Bearer nvp_YOUR_API_KEY"
`,
        },
      },
      {
        method: "GET",
        path: "/api/v1/projects/:id",
        description: "Ambil detail single PRD beserta semua versinya.",
        response: {
          type: "application/json",
          body: {
            data: {
              id: "string",
              name: "string",
              status: "string",
              versions: "Array<{ version: number, content: string, created_at: string }>",
            },
          },
        },
        example: {
          curl: `curl -X GET "https://novaplan.ai/api/v1/projects/PROJECT_ID" \\
  -H "Authorization: Bearer nvp_YOUR_API_KEY"
`,
        },
      },
    ],
    errors: [
      { code: 401, description: "API key tidak valid atau tidak diberikan" },
      { code: 400, description: "Body request tidak valid (misal: description kosong)" },
      { code: 429, description: "Rate limit exceeded (60 req/menit per key)" },
      { code: 403, description: "Fitur hanya tersedia untuk plan Hengker" },
      { code: 404, description: "Project tidak ditemukan" },
    ],
  };

  return new Response(JSON.stringify(docs, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
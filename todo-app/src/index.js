/**
 * CLOUDFLARE WORKER - TODO BACKEND
 * This runs on Cloudflare's servers and handles all todo operations
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS headers - allows frontend to talk to this backend
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS, PATCH",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle preflight requests (browsers send this automatically)
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Database setup - using Cloudflare D1
    const db = env.DB;

    // Initialize database on first run
    try {
      await db.prepare(
        "CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY, title TEXT NOT NULL, completed INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
      ).run();
    } catch (e) {
      console.log("Table might already exist");
    }

    // ROUTE 1: GET /api/todos - Get all todos
    if (url.pathname === "/api/todos" && method === "GET") {
      const result = await db.prepare("SELECT * FROM todos ORDER BY created_at DESC").all();
      return new Response(JSON.stringify(result.results || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ROUTE 2: POST /api/todos - Add a new todo
    if (url.pathname === "/api/todos" && method === "POST") {
      const body = await request.json();
      const title = body.title?.trim();

      if (!title) {
        return new Response(JSON.stringify({ error: "Title required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await db
        .prepare("INSERT INTO todos (title) VALUES (?) RETURNING *")
        .bind(title)
        .first();

      return new Response(JSON.stringify(result), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ROUTE 3: DELETE /api/todos/:id - Delete a todo
    if (url.pathname.startsWith("/api/todos/") && method === "DELETE") {
      const id = url.pathname.split("/").pop();
      
      await db.prepare("DELETE FROM todos WHERE id = ?").bind(id).run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ROUTE 4: PATCH /api/todos/:id - Toggle todo completion
    if (url.pathname.startsWith("/api/todos/") && method === "PATCH") {
      const id = url.pathname.split("/").pop();
      const body = await request.json();
      const completed = body.completed ? 1 : 0;

      const result = await db
        .prepare("UPDATE todos SET completed = ? WHERE id = ? RETURNING *")
        .bind(completed, id)
        .first();

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no route matches, return 404
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  },
};

/**
 * CLOUDFLARE WORKER - TODO APP (Backend + Frontend)
 */

// Import the HTML file
import html from '../public/index.html';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS, PATCH",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle preflight requests
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const db = env.DB;

    // Initialize database
    try {
      await db.prepare(
        "CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY, title TEXT NOT NULL, completed INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
      ).run();
    } catch (e) {
      console.log("Table might already exist");
    }

    // API ROUTES
    if (url.pathname === "/api/todos" && method === "GET") {
      const result = await db.prepare("SELECT * FROM todos ORDER BY created_at DESC").all();
      return new Response(JSON.stringify(result.results || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (url.pathname.startsWith("/api/todos/") && method === "DELETE") {
      const id = url.pathname.split("/").pop();
      
      await db.prepare("DELETE FROM todos WHERE id = ?").bind(id).run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // SERVE FRONTEND HTML FOR ALL OTHER PATHS
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
      },
    });
  },
};
/**
 * CLOUDFLARE WORKER - NEEDIFY BACKEND & BOT
 */

import html from '../public/index.html';
import css from '../public/style.css';
import js from '../public/admin.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    const BOT_TOKEN = env.BOT_TOKEN;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS, PATCH",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const db = env.DB;

    // Initialize database
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY,
          chat_id TEXT NOT NULL,
          file_id TEXT,
          file_name TEXT,
          specifications TEXT,
          contact_number TEXT,
          amount TEXT,
          upi_id TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS user_states (
          chat_id TEXT PRIMARY KEY,
          state TEXT,
          order_id INTEGER
        )
      `).run();
    } catch (e) {
      console.log("Database init error:", e);
    }

    // --- STATIC ASSETS ---
    if (url.pathname === "/style.css") {
      return new Response(css, { headers: { "Content-Type": "text/css" } });
    }
    if (url.pathname === "/admin.js") {
      return new Response(js, { headers: { "Content-Type": "application/javascript" } });
    }

    // --- TELEGRAM BOT WEBHOOK ---
    if (url.pathname === "/webhook" && method === "POST") {
      const update = await request.json();
      return handleBotUpdate(update, env, db);
    }

    // --- API ROUTES FOR WEBSITE ---
    if (url.pathname === "/api/orders" && method === "GET") {
      const result = await db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
      return new Response(JSON.stringify(result.results || []), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (url.pathname.startsWith("/api/orders/") && method === "PATCH") {
      const id = url.pathname.split("/").pop();
      const body = await request.json();
      const { amount, upi_id } = body;

      const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: corsHeaders });
      }

      await db.prepare("UPDATE orders SET amount = ?, upi_id = ?, status = 'processed' WHERE id = ?")
        .bind(amount, upi_id, id)
        .run();

      // Notify User via Bot
      if (amount && upi_id) {
        const upiLink = `upi://pay?pa=${upi_id}&pn=Needify&am=${amount}&cu=INR`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;
        
        await sendPhoto(order.chat_id, qrUrl, `Order Processed!\n\nAmount: ₹${amount}\nUPI ID: ${upi_id}\n\nPlease pay using the QR code above.`, BOT_TOKEN);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (url.pathname.startsWith("/api/orders/") && method === "DELETE") {
      const id = url.pathname.split("/").pop();
      await db.prepare("DELETE FROM orders WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SERVE FRONTEND HTML
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=UTF-8" },
    });
  },
};

async function handleBotUpdate(update, env, db) {
  const BOT_TOKEN = env.BOT_TOKEN;
  const message = update.message || update.callback_query?.message;
  const chatId = message?.chat.id;
  const text = update.message?.text;
  const callbackData = update.callback_query?.data;
  const document = update.message?.document;

  if (!chatId) return new Response("OK");

  // Get user state
  let userState = await db.prepare("SELECT * FROM user_states WHERE chat_id = ?").bind(chatId.toString()).first();

  if (text === "/start") {
    await db.prepare("INSERT OR REPLACE INTO user_states (chat_id, state) VALUES (?, ?)")
      .bind(chatId.toString(), "start")
      .run();
    
    await sendMessage(chatId, "Welcome to Needify! How can I help you today?", BOT_TOKEN, {
      inline_keyboard: [[{ text: "Xerox", callback_data: "action_xerox" }]]
    });
    return new Response("OK");
  }

  if (callbackData === "action_xerox") {
    await db.prepare("UPDATE user_states SET state = 'awaiting_pdf' WHERE chat_id = ?")
      .bind(chatId.toString())
      .run();
    await sendMessage(chatId, "Please send the PDF file you want to print.", BOT_TOKEN);
    return new Response("OK");
  }

  if (userState?.state === "awaiting_pdf") {
    if (document && (document.mime_type === "application/pdf" || document.file_name.endsWith(".pdf"))) {
      const result = await db.prepare("INSERT INTO orders (chat_id, file_id, file_name) VALUES (?, ?, ?) RETURNING id")
        .bind(chatId.toString(), document.file_id, document.file_name)
        .first();
      
      await db.prepare("UPDATE user_states SET state = 'awaiting_specs', order_id = ? WHERE chat_id = ?")
        .bind(result.id, chatId.toString())
        .run();
      
      await sendMessage(chatId, "PDF received! Now, please mention the specifications (e.g., 'only first 2 pages color', 'black and white', etc.).", BOT_TOKEN);
    } else {
      await sendMessage(chatId, "Please send a valid PDF file.", BOT_TOKEN);
    }
    return new Response("OK");
  }

  if (userState?.state === "awaiting_specs" && text) {
    await db.prepare("UPDATE orders SET specifications = ? WHERE id = ?")
      .bind(text, userState.order_id)
      .run();
    
    await db.prepare("UPDATE user_states SET state = 'awaiting_contact' WHERE chat_id = ?")
      .bind(chatId.toString())
      .run();
    
    await sendMessage(chatId, "Specifications saved. Finally, please provide your contact number.", BOT_TOKEN);
    return new Response("OK");
  }

  if (userState?.state === "awaiting_contact" && text) {
    await db.prepare("UPDATE orders SET contact_number = ? WHERE id = ?")
      .bind(text, userState.order_id)
      .run();
    
    await db.prepare("UPDATE user_states SET state = 'completed' WHERE chat_id = ?")
      .bind(chatId.toString())
      .run();
    
    await sendMessage(chatId, "Thank you! Your order has been submitted. We will notify you once it's processed with the payment details.", BOT_TOKEN);
    return new Response("OK");
  }

  return new Response("OK");
}

async function sendMessage(chatId, text, token, replyMarkup = null) {
  const body = { chat_id: chatId, text: text };
  if (replyMarkup) body.reply_markup = replyMarkup;

  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function sendPhoto(chatId, photoUrl, caption, token) {
  return fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: photoUrl,
      caption: caption
    }),
  });
}

# GITHUB SETUP FOR TODO APP

## DIRECTORY STRUCTURE

Create this exact folder structure on your computer:

```
todo-app/
├── src/
│   └── index.js          (this is your backend code)
├── public/
│   └── index.html        (this is your frontend code)
├── wrangler.toml         (configuration file)
└── package.json          (tells Node what your app needs)
```

---

## FILE 1: `src/index.js` (YOUR BACKEND)

**This is the worker.js code I gave you, but with ONE change at the top:**

Replace the first line:
```javascript
export default {
```

With:
```javascript
export default {
```

Actually, keep it exactly the same. No changes needed to worker.js logic.

Just rename `worker.js` → `index.js` and put it in `src/` folder.

---

## FILE 2: `public/index.html` (YOUR FRONTEND)

This is the index.html I gave you, but with ONE change:

Around line 90, find:
```javascript
const BACKEND_URL = "http://localhost:8787/api/todos";
```

**DO NOT CHANGE THIS YET.** We'll do it after you connect to GitHub.

For now, just put the HTML file in the `public/` folder as-is.

---

## FILE 3: `wrangler.toml` (CONFIGURATION)

Create a new file called `wrangler.toml` in the root `todo-app/` folder.

Copy this EXACTLY:

```toml
name = "todo-app"
type = "javascript"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "todos_db"
database_id = "PLACEHOLDER_ID"
```

**IMPORTANT: Keep `PLACEHOLDER_ID` as is for now. We'll fix this after connecting to GitHub.**

---

## FILE 4: `package.json` (NODE CONFIGURATION)

Create a new file called `package.json` in the root `todo-app/` folder.

Copy this EXACTLY:

```json
{
  "name": "todo-app",
  "version": "1.0.0",
  "description": "Todo app with Cloudflare Workers and D1",
  "main": "src/index.js",
  "scripts": {
    "deploy": "wrangler deploy"
  },
  "dependencies": {}
}
```

---

## UPLOAD TO GITHUB

1. Create a NEW repository on GitHub called `todo-app`
2. Upload these 4 things to the root:
   - `src/` folder (with `index.js` inside)
   - `public/` folder (with `index.html` inside)
   - `wrangler.toml` file
   - `package.json` file

Your GitHub repo should look like this:

```
todo-app/
├── src/
│   └── index.js
├── public/
│   └── index.html
├── wrangler.toml
└── package.json
```

---

## AFTER YOU UPLOAD TO GITHUB

Come back and tell me:
1. "Done, repo is uploaded"
2. The GitHub repo URL (like github.com/YOUR_USERNAME/todo-app)

Then I'll tell you:
- How to connect it to Cloudflare Workers
- What changes to make to `wrangler.toml`
- What to update in the frontend URL

---

## SUMMARY OF CHANGES NEEDED

**Before connecting to Cloudflare:**
- ✅ Backend code in `src/index.js` - NO CHANGES
- ✅ Frontend code in `public/index.html` - NO CHANGES (yet)
- ✅ `wrangler.toml` with `PLACEHOLDER_ID` - NO CHANGES (yet)
- ✅ `package.json` - NO CHANGES (yet)

Just get the files on GitHub with the right folder structure. That's it.


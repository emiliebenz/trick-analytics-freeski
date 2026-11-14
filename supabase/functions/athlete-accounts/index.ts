// Supabase Edge Function «athlete-accounts» im Freeski-Projekt (Elite-App).
// Legt Logins für Athlet:innen an, setzt Startpasswörter zurück und entfernt Konten.
// Nur für Admins (Tabelle app_admins). Benutzername wie in der Youth-App: vorname.nachname,
// intern <benutzername>@login.trick-analyses.invalid. Startpasswörter werden NICHT gespeichert,
// sondern nur einmal an den Admin zurückgegeben. Beim ersten Login verlangt die App ein neues Passwort.
// Einstellung der Function: «Enforce JWT verification» EIN (Standard).
//
// Aufrufe (POST, JSON):
//   { action: "create", athletes: ["Vorname Nachname", ...] }  → neue Konten (bestehende werden übersprungen)
//   { action: "reset",  athlet: "Vorname Nachname" }            → neues Startpasswort
//   { action: "remove", athlet: "Vorname Nachname" }            → Konto löschen (inkl. Run-Check-Runs)

import { createClient } from "npm:@supabase/supabase-js@2";

const LOGIN_DOMAIN = "login.trick-analyses.invalid";

// 12 zufällige Zeichen in 3 Blöcken, ohne leicht verwechselbare Zeichen (0/O, 1/l/I)
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const password = () => {
  const r = crypto.getRandomValues(new Uint32Array(12));
  const s = [...r].map((x) => CHARS[x % CHARS.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
};

// vorname.nachname ohne Akzente; Namenszusätze gehören zum Nachnamen (van Essen → vanessen)
const slug = (name: string) => {
  const t = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/ß/g, "ss")
    .split(/[^a-z0-9]+/).filter(Boolean);
  if (t.length < 2) return t[0] || "athlet";
  const PART = ["van", "von", "de", "da", "di", "del", "della", "du", "le", "la", "el", "al", "ten", "ter", "zur", "zu", "dos", "das"];
  let k = t.length - 1;
  while (k > 1 && PART.includes(t[k - 1])) k--;
  return `${t[0]}.${t.slice(k).join("")}`;
};

Deno.serve(async (req) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "not logged in" }, 401);
    const { data: isAdmin } = await admin.from("app_admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
    if (!isAdmin) return json({ error: "admins only" }, 403);

    const body = await req.json().catch(() => ({}));
    const clean = (s: unknown) => String(s ?? "").trim().replace(/\s+/g, " ").slice(0, 80);

    if (body.action === "create") {
      const names = [...new Set((Array.isArray(body.athletes) ? body.athletes : []).map(clean).filter(Boolean))] as string[];
      if (!names.length) return json({ error: "no athletes" }, 400);
      const { data: existing } = await admin.from("athlete_accounts").select("athlet,username");
      const haveName = new Set((existing ?? []).map((r) => r.athlet));
      const usedUser = new Set((existing ?? []).map((r) => r.username));
      const created: { athlet: string; username: string; password: string }[] = [];
      const skipped: string[] = [], failed: { athlet: string; error: string }[] = [];
      for (const athlet of names) {
        if (haveName.has(athlet)) { skipped.push(athlet); continue; }
        let username = slug(athlet), n = 2;
        while (usedUser.has(username)) username = `${slug(athlet)}${n++}`;
        const pw = password();
        const { data: cu, error } = await admin.auth.admin.createUser({
          email: `${username}@${LOGIN_DOMAIN}`, password: pw, email_confirm: true,
          user_metadata: { name: athlet, role: "athlete" },
        });
        if (error || !cu?.user) { failed.push({ athlet, error: error?.message ?? "unknown" }); continue; }
        const { error: e2 } = await admin.from("athlete_accounts").insert({ user_id: cu.user.id, athlet, username, must_change_pw: true });
        if (e2) {
          // Ohne Zeile in athlete_accounts wäre das Konto ein Coach-Konto → sofort wieder löschen
          await admin.auth.admin.deleteUser(cu.user.id);
          failed.push({ athlet, error: e2.message });
          continue;
        }
        usedUser.add(username);
        created.push({ athlet, username, password: pw });
      }
      return json({ created, skipped, failed });
    }

    if (body.action === "reset" || body.action === "remove") {
      const athlet = clean(body.athlet);
      const { data: acc } = await admin.from("athlete_accounts").select("user_id,username").eq("athlet", athlet).maybeSingle();
      if (!acc) return json({ error: "no account for this athlete" }, 404);
      if (body.action === "remove") {
        const { error } = await admin.auth.admin.deleteUser(acc.user_id);
        if (error) return json({ error: error.message }, 500);
        return json({ removed: athlet });
      }
      const pw = password();
      const { error } = await admin.auth.admin.updateUserById(acc.user_id, { password: pw });
      if (error) return json({ error: error.message }, 500);
      await admin.from("athlete_accounts").update({ must_change_pw: true }).eq("user_id", acc.user_id);
      return json({ athlet, username: acc.username, password: pw });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

// Supabase Edge Function «create-accounts» im Youth-Projekt.
// Legt Konten mit zufälligem Startpasswort an: Coaches mit ihrer E-Mail, Athlet:innen mit Benutzername (Update 15,
// intern <benutzername>@login.trick-collector.invalid; der Benutzername wird bei Bedarf aus dem Namen erzeugt).
// Nur für Admins (Rolle DVLP). Die Startpasswörter werden NICHT gespeichert, sondern nur einmal an den Admin
// zurückgegeben (die App macht daraus die PDF-Liste pro Club). Beim ersten Login verlangt die App ein neues Passwort.
// Einstellung der Function: «Enforce JWT verification» EIN (Standard).

import { createClient } from "npm:@supabase/supabase-js@2";

// Startpasswort: 12 zufällige Zeichen in 3 Blöcken, z.B. «Kx7m-Qp4t-Wz9r»
// ohne leicht verwechselbare Zeichen (0/O, 1/l/I), damit man es gut abtippen kann
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const password = () => {
  const r = crypto.getRandomValues(new Uint32Array(12));
  const s = [...r].map((x) => CHARS[x % CHARS.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
};

// Athlet:innen: Benutzername aus dem Namen (vorname.nachname, ohne Akzente), bei Doppelten mit Zahl
const LOGIN_DOMAIN = "login.trick-collector.invalid";
const loginOf = (p: { role: string; email?: string | null; username?: string | null }) =>
  p.role === "athlete" ? `${p.username}@${LOGIN_DOMAIN}` : String(p.email ?? "").trim().toLowerCase();
const slug = (name: string) => {
  const t = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ß/g, "ss")
    .split(/[^a-z0-9]+/).filter(Boolean);
  if (t.length < 2) return t[0] || "athlet";
  // Nachname inkl. Namenszusatz (van Essen → vanessen, El Khoury → elkhoury)
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
    // Aufrufer prüfen: eingeloggt und Rolle DVLP (Admin)
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "not logged in" }, 401);
    const { data: me } = await admin.from("profiles").select("role").eq("user_id", u.user.id).maybeSingle();
    if (me?.role !== "dvlp") return json({ error: "admins only" }, 403);

    const body = await req.json().catch(() => ({}));
    const roles = Array.isArray(body.roles) && body.roles.length ? body.roles.filter((r: string) => ["athlete", "coach"].includes(r)) : ["athlete", "coach"];

    // Neue Startpasswörter für Konten, die sich noch nie eingeloggt haben (Startpasswort noch nicht geändert)
    if (body.reset) {
      // force + ids: einzelnes Konto zurücksetzen (Passwort vergessen), auch wenn schon eingeloggt
      const force = !!body.force && Array.isArray(body.ids) && body.ids.length > 0;
      let rq = admin.from("profiles").select("id,name,email,username,role,sport,level,group_id,user_id").not("user_id", "is", null).in("role", roles);
      if (Array.isArray(body.ids) && body.ids.length) rq = rq.in("id", body.ids);
      const { data: profs, error } = await rq;
      if (error) throw error;
      const created: unknown[] = [], failed: unknown[] = [];
      for (const p of profs ?? []) {
        const { data: au } = await admin.auth.admin.getUserById(p.user_id);
        if (!force && !au?.user?.user_metadata?.must_change_password) continue;   // hat schon ein eigenes Passwort
        const pw = password();
        const { error: e } = await admin.auth.admin.updateUserById(p.user_id, { password: pw, user_metadata: { ...(au?.user?.user_metadata ?? {}), must_change_password: true } });
        if (e) failed.push({ name: p.name, email: p.email, error: e.message });
        else created.push({ id: p.id, name: p.name, email: p.email, username: p.username, login: p.role === "athlete" ? p.username : p.email, role: p.role, sport: p.sport, level: p.level, group_id: p.group_id, password: pw });
      }
      return json({ created, failed });
    }
    // Athlet:innen brauchen keine E-Mail (Benutzername), Coaches schon
    let q = admin.from("profiles").select("id,name,email,username,role,sport,level,group_id").is("user_id", null).in("role", roles);
    if (Array.isArray(body.ids) && body.ids.length) q = q.in("id", body.ids);
    const { data: all, error } = await q;
    if (error) throw error;
    const profs = (all ?? []).filter((p) => p.role === "athlete" || p.email);

    // fehlende Benutzernamen vergeben (eindeutig über alle Profile)
    const { data: taken } = await admin.from("profiles").select("username").not("username", "is", null);
    const used = new Set((taken ?? []).map((x) => String(x.username).toLowerCase()));
    for (const p of profs) {
      if (p.role !== "athlete" || p.username) continue;
      const base = slug(p.name);
      let u = base, n = 2;
      while (used.has(u)) u = `${base}${n++}`;
      const { error: ue } = await admin.from("profiles").update({ username: u }).eq("id", p.id);
      if (ue) throw ue;
      used.add(u); p.username = u;
    }

    const created: unknown[] = [], failed: unknown[] = [];
    for (const p of profs) {
      const pw = password();
      const { error: e } = await admin.auth.admin.createUser({ email: loginOf(p), password: pw, email_confirm: true, user_metadata: { must_change_password: true, name: p.name } });
      if (e) failed.push({ name: p.name, email: p.email, error: e.message });
      else created.push({ id: p.id, name: p.name, email: p.email, username: p.username, login: p.role === "athlete" ? p.username : p.email, role: p.role, sport: p.sport, level: p.level, group_id: p.group_id, password: pw });
    }
    return json({ created, failed });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});

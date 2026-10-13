// ===== إعدادات =====
const CONFIG = {
  SUPABASE_URL: "",            // https://xxxx.supabase.co
  SUPABASE_ANON_KEY: "",       // مفتاح anon العام فقط (الحماية عبر RLS). لا تضع service_role هنا أبداً
};
const db = window.supabase.createClient(CONFIG.SUPABASE_URL || "https://placeholder.supabase.co", CONFIG.SUPABASE_ANON_KEY || "placeholder");
const V = document.getElementById("view");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const feeTxt = s => s.fee === "free" ? "مجاني" : s.fee === "fixed" ? Number(s.price_iqd).toLocaleString("ar-IQ") + " د.ع" : "الرسوم لم تحدد بعد";
const dt = i => new Intl.DateTimeFormat("ar-IQ", { timeZone: "Asia/Baghdad", dateStyle: "full", timeStyle: "short" }).format(new Date(i));
const tm = i => new Intl.DateTimeFormat("ar-IQ", { timeZone: "Asia/Baghdad", timeStyle: "short" }).format(new Date(i));
const msg = (t, k = "err") => `<p class="msg ${k}" role="alert">${esc(t)}</p>`;
const STATUS = { pending: "بانتظار الموافقة", confirmed: "مؤكد", completed: "مكتمل", cancelled_by_patient: "ملغى من المراجع", cancelled_by_student: "ملغى من الطالب", rejected: "مرفوض", no_show: "لم يحضر" };
const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const LOADERR = msg("تعذر تحميل البيانات. تحقق من الاتصال ثم أعد المحاولة.");
const configured = () => CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY;

// ===== التوجيه =====
const routes = { "": home, book: bookView, staff: staffView, faq, privacy: () => legal("الخصوصية", "نجمع الحد الأدنى من بياناتك (الاسم والهاتف) لإدارة الحجز فقط، ولا نطلب معلومات طبية. لا تُعرض بياناتك علناً، ويطّلع عليها الطالب المعني والإدارة فقط. يمكنك طلب حذف بياناتك عبر التواصل مع الإدارة. (نص مبدئي: يلزم مراجعته قانونياً قبل الإطلاق.)"), terms: () => legal("الشروط", "الحجز طلب موعد يخضع لموافقة الطالب أو الإدارة. قد يُلغى الموعد أو يُعدّل. لا تضمن المنصة إجراء أي علاج. (نص مبدئي: يلزم مراجعته قانونياً.)"), disclaimer: () => legal("الإخلاء الطبي", "يقدّم الخدمة طلاب طب أسنان ضمن تدريب سريري وإشراف. لا يُؤكَّد ملاءمة أي علاج قبل الفحص السريري. للطوارئ توجه إلى الرعاية العاجلة. لا تكتب معلومات طبية حساسة في الملاحظات.") };
function route() { const r = location.hash.replace(/^#\/?/, "").split("?")[0]; (routes[r] || home)(); V.focus(); window.scrollTo(0, 0); }
window.addEventListener("hashchange", route); route();
function legal(t, body) { V.innerHTML = `<h1>${t}</h1><p>${esc(body)}</p>`; }
function faq() { V.innerHTML = `<h1>أسئلة شائعة</h1><div class="card"><b>من يعالجني؟</b><p>طلاب طب أسنان معتمدون من الإدارة، ضمن التدريب السريري وتحت الإشراف المطلوب.</p></div><div class="card"><b>هل الحجز يضمن العلاج؟</b><p>لا. يُقرَّر العلاج بعد الفحص السريري.</p></div><div class="card"><b>كم الرسوم؟</b><p>تظهر الرسوم لكل خدمة قبل التأكيد، وقد تكون مجانية أو محددة أو غير محددة بعد. لا يوجد دفع إلكتروني.</p></div>`; }

// ===== الرئيسية =====
async function home() {
  V.innerHTML = `<h1>احجز موعد أسنانك لدى طلاب طب الأسنان المشاركين</h1><a class="cta" href="#/book">احجز موعدك</a>${configured() ? "" : msg("لم تُضبط إعدادات Supabase في app.js بعد.")}<h2>خدمات الأسنان</h2><div id="sv" class="grid"></div><h2>الطلاب المشاركون</h2><div id="st" class="grid"></div><h2>خطوات الحجز</h2><ol><li>اختر الخدمة والطالب</li><li>اختر التاريخ والوقت المتاح</li><li>أدخل بياناتك وأكّد الطلب</li><li>انتظر موافقة الطالب أو الإدارة</li></ol>`;
  const [s, t] = await Promise.all([db.from("services").select("*").eq("is_active", true), db.from("student_public").select("*")]);
  document.getElementById("sv").innerHTML = s.error ? LOADERR : s.data.length ? s.data.map(x => `<div class="card"><b>${esc(x.name_ar)}</b> <small>${esc(x.name_en)}</small><p>${esc(x.description)}</p><small>${x.duration_min} دقيقة — ${feeTxt(x)}</small>${x.requirements ? `<p><small>قبل الموعد: ${esc(x.requirements)}</small></p>` : ""}</div>`).join("") : '<p class="empty">لا توجد خدمات منشورة بعد.</p>';
  document.getElementById("st").innerHTML = t.error ? LOADERR : t.data.length ? t.data.map(x => `<div class="card"><b>${esc(x.display_name)}</b><br><small>${esc(x.level)} ${esc(x.college)}</small><p>${esc(x.bio)}</p><small>${x.reviews_count ? `${x.avg_rating}/5 (${x.reviews_count} تقييم)` : "لا تقييمات بعد"}<br>طلبات: ${x.requests_count} · مؤكدة: ${x.confirmed_count} · مكتملة: ${x.completed_count} · ملغاة: ${x.cancelled_count} · لم يحضر: ${x.no_show_count}</small></div>`).join("") : '<p class="empty">لا يوجد طلاب معتمدون بعد.</p>';
}

// ===== الحجز =====
let B = { step: 1 };
async function bookView() {
  const s = B.step; V.innerHTML = `<h1>حجز موعد</h1><p><small>الخطوة ${s} من 6</small></p><div id="st"></div>`;
  const el = document.getElementById("st"); const pick = (sel, fn) => el.onclick = e => { const b = e.target.closest(sel); if (b) fn(b.dataset); };
  const back = () => s > 1 ? `<p><button class="btn alt" id="back">رجوع</button></p>` : "";
  if (s === 1) {
    const { data, error } = await db.from("cities").select("*").eq("is_active", true);
    if (error) return el.innerHTML = LOADERR;
    if (!data.length) return el.innerHTML = '<p class="empty">لا توجد مدن مفعلة بعد.</p>';
    el.innerHTML = "<h2>اختر المدينة</h2>" + data.map(c => `<button class="opt" data-id="${c.id}">${esc(c.name_ar)}</button>`).join("");
    pick("[data-id]", d => { B.city = d.id; B.step = 2; bookView(); });
  } else if (s === 2) {
    const { data, error } = await db.from("services").select("*").eq("is_active", true);
    if (error) return el.innerHTML = LOADERR + back();
    el.innerHTML = "<h2>اختر الخدمة</h2>" + (data.length ? data.map(x => `<button class="opt" data-id="${x.id}"><b>${esc(x.name_ar)}</b><br><small>${x.duration_min} دقيقة — ${feeTxt(x)}</small></button>`).join("") : '<p class="empty">لا توجد خدمات.</p>') + back();
    B.svc = Object.fromEntries((data || []).map(x => [x.id, x]));
    pick("[data-id]", d => { B.service = d.id; B.step = 3; bookView(); });
  } else if (s === 3) {
    const a = await db.from("student_services").select("student_id").eq("service_id", B.service);
    const ids = (a.data || []).map(x => x.student_id);
    const b = ids.length ? await db.from("student_public").select("*").in("id", ids).eq("city_id", B.city) : { data: [] };
    if (a.error || b.error) return el.innerHTML = LOADERR + back();
    B.stu = Object.fromEntries(b.data.map(x => [x.id, x]));
    el.innerHTML = "<h2>اختر الطالب</h2>" + (b.data.length ? b.data.map(x => `<button class="opt" data-id="${x.id}"><b>${esc(x.display_name)}</b><br><small>${esc(x.level)} — ${x.reviews_count ? x.avg_rating + "/5" : "لا تقييمات بعد"}</small></button>`).join("") : '<p class="empty">لا يوجد طالب متاح لهذه الخدمة في هذه المدينة حالياً.</p>') + back();
    pick("[data-id]", d => { B.student = d.id; B.step = 4; bookView(); });
  } else if (s === 4) {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
    el.innerHTML = `<h2>اختر التاريخ</h2><label for="d">التاريخ</label><input id="d" type="date" min="${today}" value="${B.date || ""}"><p><button class="btn" id="go">عرض الأوقات المتاحة</button></p>${back()}`;
    document.getElementById("go").onclick = () => { const v = document.getElementById("d").value; if (v) { B.date = v; B.step = 5; bookView(); } };
  } else if (s === 5) {
    const { data, error } = await db.rpc("available_slots", { p_student: B.student, p_service: B.service, p_date: B.date });
    if (error) return el.innerHTML = LOADERR + back();
    el.innerHTML = `<h2>الأوقات المتاحة</h2>` + (data.length ? `<div class="slots">${data.map(x => `<button class="opt" data-id="${esc(x.slot ?? x)}">${tm(x.slot ?? x)}</button>`).join("")}</div>` : '<p class="empty">لا توجد أوقات متاحة في هذا اليوم. جرّب يوماً آخر.</p>') + back();
    pick("[data-id]", d => { B.slot = d.id; B.step = 6; bookView(); });
  } else {
    const sv = B.svc[B.service], st = B.stu[B.student];
    el.innerHTML = `<h2>بياناتك وتأكيد الطلب</h2><div class="card"><b>${esc(sv.name_ar)}</b> مع ${esc(st.display_name)}<br>${dt(B.slot)}<br>الرسوم: ${feeTxt(sv)}</div>
    <label for="n">الاسم الكامل</label><input id="n" autocomplete="name" maxlength="80">
    <label for="p">رقم الهاتف العراقي</label><input id="p" type="tel" inputmode="tel" placeholder="07XXXXXXXXX أو +964…" autocomplete="tel">
    <label for="a">الفئة العمرية (اختياري)</label><select id="a"><option value="">—</option><option>أقل من 18</option><option>18–40</option><option>أكثر من 40</option></select>
    <label for="o">ملاحظات (اختياري، بلا معلومات طبية حساسة)</label><textarea id="o" maxlength="200" rows="2"></textarea>
    <label><input type="checkbox" id="c1">أوافق على <a href="#/terms">الشروط</a> و<a href="#/privacy">الخصوصية</a></label>
    <label><input type="checkbox" id="c2">أُقرّ بأن الحجز لا يضمن ملاءمة العلاج وأن الخدمة ضمن تدريب سريري</label>
    <p id="err"></p><p><button class="btn" id="send">تأكيد طلب الحجز</button></p>${back()}`;
    document.getElementById("send").onclick = submitBooking;
  }
  const bk = document.getElementById("back"); if (bk) bk.onclick = () => { B.step--; bookView(); };
}
async function submitBooking() {
  const g = i => document.getElementById(i), err = g("err"), btn = g("send");
  if (g("n").value.trim().length < 3 || !g("p").value.trim()) return err.innerHTML = msg("أدخل الاسم ورقم الهاتف.");
  if (!g("c1").checked || !g("c2").checked) return err.innerHTML = msg("يجب الموافقة على الشروط والإقرار.");
  btn.disabled = true; err.innerHTML = "";
  const { data, error } = await db.rpc("request_booking", { p_service: B.service, p_student: B.student, p_start: B.slot, p_name: g("n").value.trim(), p_phone: g("p").value, p_age: g("a").value || null, p_note: g("o").value.trim() || null });
  if (error) {
    const m = error.message || "";
    btn.disabled = false;
    if (error.code === "23P01" || m.includes("slot_unavailable")) { err.innerHTML = msg("هذا الوقت لم يعد متاحاً. اختر وقتاً آخر."); B.step = 5; return setTimeout(bookView, 1200); }
    err.innerHTML = msg(m.includes("invalid_phone") ? "رقم الهاتف غير صحيح." : m.includes("rate_limited") ? "عدد كبير من المحاولات. حاول بعد ساعة." : m.includes("too_many_active") ? "لديك حجوزات قادمة كثيرة بهذا الرقم." : "تعذر إرسال الطلب. تحقق من الاتصال وحاول لاحقاً.");
    return;
  }
  const r = Array.isArray(data) ? data[0] : data, sv = B.svc[B.service], st = B.stu[B.student];
  V.innerHTML = `<h1>تم استلام طلبك</h1><div class="card"><p>رقم الحجز: <b dir="ltr">${esc(r.out_ref)}</b></p><p>${esc(sv.name_ar)} — ${esc(st.display_name)}<br>${dt(B.slot)}<br>الرسوم: ${feeTxt(sv)}</p><p>الحالة: <span class="tag">${STATUS[r.out_status] || ""}</span> — بانتظار موافقة الطالب أو الإدارة.</p></div><p class="notice">احتفظ برقم الحجز. للاستعلام أو الإلغاء تواصل مع الإدارة.</p>`;
  B = { step: 1 };
}

// ===== الدخول =====
async function staffView() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    V.innerHTML = `<h1>دخول الطلاب والإدارة</h1><label for="e">البريد الإلكتروني</label><input id="e" type="email" autocomplete="username"><label for="pw">كلمة المرور</label><input id="pw" type="password" autocomplete="current-password"><p id="err"></p><button class="btn" id="in">دخول</button>`;
    document.getElementById("in").onclick = async () => { const { error } = await db.auth.signInWithPassword({ email: e.value, password: pw.value }); if (error) err.innerHTML = msg("بيانات الدخول غير صحيحة."); else staffView(); };
    return;
  }
  const { data: p } = await db.from("profiles").select("role,full_name").eq("id", session.user.id).maybeSingle();
  const out = `<p><button class="btn alt" id="out">خروج</button></p>`;
  if (!p) { V.innerHTML = msg("لا يوجد ملف لهذا الحساب. اطلب من الإدارة تفعيله.") + out; }
  else if (p.role === "admin") await adminPanel(session, p, out); else await studentPanel(session, p, out);
  const o = document.getElementById("out"); if (o) o.onclick = async () => { await db.auth.signOut(); staffView(); };
}
const audit = (action, entity, id, details) => db.from("audit_logs").insert({ action, entity, entity_id: id, details });

// ===== إجراءات الحجز (مشتركة) =====
function bookingCard(b, uid, showStudent) {
  const a = [];
  if (b.status === "pending") a.push(["confirmed", "قبول", ""], ["rejected", "رفض", "alt"]);
  if (b.status === "confirmed") a.push(["completed", "تأكيد اكتمال الحالة", ""], ["no_show", "لم يحضر", "alt"]);
  if (["pending", "confirmed"].includes(b.status)) a.push(["cancelled_by_student", "إلغاء", "bad"]);
  return `<div class="card"><b>${esc(b.services?.name_ar)}</b> <span class="tag">${STATUS[b.status]}</span><br>${dt(b.start_at)}${showStudent ? `<br><small>الطالب: ${esc(b.student_profiles?.display_name)}</small>` : ""}<br><small>${esc(b.patient_name)} — <span dir="ltr">${esc(b.patient_phone)}</span> ${b.phone_verified_at ? "" : "(غير موثّق)"}</small>${b.patient_note ? `<br><small>ملاحظة: ${esc(b.patient_note)}</small>` : ""}<br><small>رقم: ${esc(b.ref_code)} — ${feeTxt(b)}</small><div class="row">${a.map(x => `<button class="btn ${x[2]}" data-act="${x[0]}" data-id="${b.id}">${x[1]}</button>`).join("")}</div></div>`;
}
function bindActions(root, uid, reload) {
  root.onclick = async e => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const st = b.dataset.act, patch = { status: st };
    if (["confirmed", "rejected"].includes(st)) { patch.decided_by = uid; patch.decided_at = new Date().toISOString(); if (st === "rejected") { const r = prompt("سبب الرفض:"); if (!r) return; patch.reject_reason = r; } }
    if (st === "completed") { if (!confirm("تأكيد أن الحالة اكتملت؟")) return; patch.completed_by = uid; patch.completed_at = new Date().toISOString(); }
    if (st === "cancelled_by_student" && !confirm("إلغاء هذا الموعد؟")) return;
    const { error } = await db.from("bookings").update(patch).eq("id", b.dataset.id);
    if (error) alert("تعذر تنفيذ الإجراء."); else { audit("booking_" + st, "bookings", b.dataset.id); reload(); }
  };
}

// ===== لوحة الطالب =====
async function studentPanel(session, p, out) {
  V.innerHTML = `<h1>لوحة الطالب — ${esc(p.full_name)}</h1><div id="l"><p class="empty">جارٍ التحميل…</p></div>${out}`;
  const load = async () => {
    const { data, error } = await db.from("bookings").select("*,services(name_ar)").eq("student_id", session.user.id).order("start_at");
    const l = document.getElementById("l"); if (error) return l.innerHTML = LOADERR;
    const now = Date.now(), up = data.filter(b => ["pending", "confirmed"].includes(b.status)), hist = data.filter(b => !up.includes(b));
    const c = k => data.filter(b => b.status === k).length;
    l.innerHTML = `<p><small>مكتملة: ${c("completed")} · ملغاة: ${c("cancelled_by_student") + c("cancelled_by_patient")} · لم يحضر: ${c("no_show")} (تُحسب تلقائياً ولا يمكن تعديلها)</small></p><h2>الطلبات والمواعيد القادمة</h2>${up.map(b => bookingCard(b, session.user.id)).join("") || '<p class="empty">لا توجد طلبات.</p>'}<h2>السجل</h2>${hist.map(b => bookingCard(b, session.user.id)).join("") || '<p class="empty">لا يوجد سجل.</p>'}`;
    bindActions(l, session.user.id, load);
  }; load();
}

// ===== لوحة الإدارة =====
async function adminPanel(session, p, out) {
  V.innerHTML = `<h1>لوحة الإدارة</h1><div class="tabs">${[["b", "الحجوزات"], ["s", "الخدمات"], ["t", "الطلاب"], ["u", "الإعداد"], ["r", "التقييمات"], ["x", "الإحصائيات"]].map(t => `<button class="btn alt" data-t="${t[0]}">${t[1]}</button>`).join("")}</div><div id="tab"></div>${out}`;
  const tab = document.getElementById("tab"), uid = session.user.id;
  const tabs = {
    async b() {
      const f = tab.dataset.f || "";
      let q = db.from("bookings").select("*,services(name_ar),student_profiles(display_name)").order("start_at", { ascending: false }).limit(100); if (f) q = q.eq("status", f);
      const { data, error } = await q; if (error) return tab.innerHTML = LOADERR;
      tab.innerHTML = `<label for="f">تصفية بالحالة</label><select id="f"><option value="">الكل</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${f === k ? "selected" : ""}>${v}</option>`).join("")}</select><div id="bl">${data.map(b => bookingCard(b, uid, true)).join("") || '<p class="empty">لا توجد حجوزات.</p>'}</div>`;
      document.getElementById("f").onchange = e => { tab.dataset.f = e.target.value; tabs.b(); };
      bindActions(document.getElementById("bl"), uid, tabs.b);
    },
    async s() {
      const { data, error } = await db.from("services").select("*").order("name_ar"); if (error) return tab.innerHTML = LOADERR;
      tab.innerHTML = data.map(x => `<div class="card row"><b>${esc(x.name_ar)}</b> <small>${esc(x.name_en)} — ${x.duration_min}د — ${feeTxt(x)}</small> <span class="tag">${x.is_active ? "ظاهرة" : "مخفية"}</span><button class="btn alt" data-tog="${x.id}" data-v="${x.is_active}">${x.is_active ? "إخفاء" : "إظهار"}</button></div>`).join("") + `<h3>إضافة خدمة</h3><form id="fm"><label>الاسم بالعربية</label><input name="name_ar" required><label>الاسم بالإنجليزية</label><input name="name_en" required><label>الوصف</label><input name="description"><label>المدة (دقيقة)</label><input name="duration_min" type="number" value="30" min="10" max="240"><label>الرسوم</label><select name="fee"><option value="undetermined">غير محددة بعد</option><option value="free">مجانية</option><option value="fixed">محددة</option></select><label>السعر (IQD، عند التحديد)</label><input name="price_iqd" type="number" min="0"><label>متطلبات قبل الموعد</label><input name="requirements"><p><button class="btn">إضافة</button></p></form><p id="m"></p>`;
      tab.onclick = async e => { const b = e.target.closest("[data-tog]"); if (b) { await db.from("services").update({ is_active: b.dataset.v !== "true" }).eq("id", b.dataset.tog); audit("service_toggle", "services", b.dataset.tog); tabs.s(); } };
      document.getElementById("fm").onsubmit = async e => { e.preventDefault(); const o = Object.fromEntries(new FormData(e.target)); o.price_iqd = o.fee === "fixed" ? Number(o.price_iqd) : null; o.duration_min = Number(o.duration_min); const { error, data } = await db.from("services").insert(o).select().single(); if (error) return m.innerHTML = msg("تعذر الحفظ: تأكد من السعر عند اختيار «محددة»."); audit("service_add", "services", data.id); tabs.s(); };
    },
    async t() {
      const [s, c] = await Promise.all([db.from("student_profiles").select("*").order("display_name"), db.from("cities").select("*")]); if (s.error || c.error) return tab.innerHTML = LOADERR;
      tab.innerHTML = s.data.map(x => `<div class="card row"><b>${esc(x.display_name)}</b> <span class="tag">${x.status === "approved" ? "معتمد" : x.status === "pending" ? "بانتظار الاعتماد" : "موقوف"}</span>${["approved", "suspended"].filter(k => k !== x.status).concat(x.status === "pending" ? [] : []).map(k => `<button class="btn alt" data-id="${x.id}" data-s="${k}">${k === "approved" ? "اعتماد/تفعيل" : "إيقاف"}</button>`).join("")}</div>`).join("") || '<p class="empty">لا يوجد طلاب.</p>';
      tab.innerHTML += `<h3>إضافة طالب</h3><p><small>أنشئ المستخدم أولاً من Supabase → Authentication، ثم انسخ معرّفه (UUID) هنا بعد التحقق من صفته كطالب.</small></p><form id="fm"><label>UUID</label><input name="id" required dir="ltr"><label>الاسم الكامل</label><input name="full_name" required><label>الاسم المعروض</label><input name="display_name" required><label>المدينة</label><select name="city_id">${c.data.map(x => `<option value="${x.id}">${esc(x.name_ar)}</option>`).join("")}</select><label>الكلية</label><input name="college"><label>المرحلة</label><input name="level"><p><button class="btn">إضافة (معتمد)</button></p></form><p id="m"></p>`;
      tab.onclick = async e => { const b = e.target.closest("[data-s]"); if (b) { await db.from("student_profiles").update({ status: b.dataset.s, verified_at: new Date().toISOString(), verified_by: uid }).eq("id", b.dataset.id); audit("student_" + b.dataset.s, "student_profiles", b.dataset.id); tabs.t(); } };
      document.getElementById("fm").onsubmit = async e => { e.preventDefault(); const o = Object.fromEntries(new FormData(e.target)); const a = await db.from("profiles").insert({ id: o.id, role: "student", full_name: o.full_name }); if (a.error) return m.innerHTML = msg("تعذر إنشاء الملف."); const b = await db.from("student_profiles").insert({ id: o.id, city_id: o.city_id, display_name: o.display_name, college: o.college, level: o.level, status: "approved", verified_at: new Date().toISOString(), verified_by: uid }); if (b.error) return m.innerHTML = msg("تعذر حفظ الطالب."); audit("student_add", "student_profiles", o.id); tabs.t(); };
    },
    async u() {
      const [c, cl, s, sv] = await Promise.all([db.from("cities").select("*"), db.from("clinics").select("*"), db.from("student_profiles").select("id,display_name"), db.from("services").select("id,name_ar")]);
      const opt = (r, k) => (r.data || []).map(x => `<option value="${x.id}">${esc(x[k])}</option>`).join("");
      tab.innerHTML = `<h3>إضافة عيادة</h3><form data-f="clinics"><label>المدينة</label><select name="city_id">${opt(c, "name_ar")}</select><label>اسم العيادة</label><input name="name_ar" required><label>الكلية</label><input name="college"><p><button class="btn">إضافة</button></p></form>
      <h3>تخويل طالب بخدمة</h3><form data-f="student_services"><label>الطالب</label><select name="student_id">${opt(s, "display_name")}</select><label>الخدمة</label><select name="service_id">${opt(sv, "name_ar")}</select><label>العيادة</label><select name="clinic_id">${opt(cl, "name_ar")}</select><p><button class="btn">تخويل</button></p></form>
      <h3>ساعات عمل الطالب</h3><form data-f="availability_rules"><label>الطالب</label><select name="student_id">${opt(s, "display_name")}</select><label>العيادة</label><select name="clinic_id">${opt(cl, "name_ar")}</select><label>اليوم</label><select name="weekday">${DAYS.map((d, i) => `<option value="${i}">${d}</option>`).join("")}</select><label>من</label><input name="start_time" type="time" value="09:00"><label>إلى</label><input name="end_time" type="time" value="13:00"><p><button class="btn">إضافة</button></p></form>
      <h3>عطلة</h3><form data-f="availability_exceptions"><label>التاريخ</label><input name="on_date" type="date" required><label>السبب</label><input name="reason"><p><small>تُطبّق على كل الطلاب.</small></p><button class="btn">إضافة عطلة</button></form><p id="m"></p>`;
      tab.onsubmit = async e => { e.preventDefault(); const f = e.target.dataset.f, o = Object.fromEntries(new FormData(e.target)); if (f === "availability_rules") o.weekday = Number(o.weekday); const { error } = await db.from(f).insert(o); m.innerHTML = error ? msg("تعذر الحفظ (قد يكون مكرراً أو غير صالح).") : msg("تم الحفظ.", "ok"); if (!error) audit("add_" + f, f, null, o); };
    },
    async r() {
      const { data, error } = await db.from("reviews").select("*").order("created_at", { ascending: false }).limit(50); if (error) return tab.innerHTML = LOADERR;
      tab.innerHTML = data.map(x => `<div class="card">${"★".repeat(x.rating)} ${x.reported ? '<span class="tag">مُبلَّغ</span>' : ""} ${x.is_hidden ? '<span class="tag">مخفي</span>' : ""}<p>${esc(x.comment)}</p><button class="btn alt" data-h="${x.id}" data-v="${x.is_hidden}">${x.is_hidden ? "إظهار" : "إخفاء"}</button></div>`).join("") || '<p class="empty">لا توجد تقييمات.</p>';
      tab.onclick = async e => { const b = e.target.closest("[data-h]"); if (b) { await db.from("reviews").update({ is_hidden: b.dataset.v !== "true" }).eq("id", b.dataset.h); audit("review_moderate", "reviews", b.dataset.h); tabs.r(); } };
    },
    async x() {
      const { data, error } = await db.from("bookings").select("status,student_id,service_id,services(name_ar),student_profiles(display_name)"); if (error) return tab.innerHTML = LOADERR;
      const cnt = (k, f) => data.reduce((m, b) => (m[f(b)] = (m[f(b)] || 0) + 1, m), {});
      const by = (f) => Object.entries(cnt(0, f)).map(([k, v]) => `<li>${esc(k)}: ${v}</li>`).join("") || "<li>لا بيانات</li>";
      tab.innerHTML = `<div class="card"><b>إجمالي الحجوزات: ${data.length}</b><ul>${Object.entries(cnt(0, b => STATUS[b.status])).map(([k, v]) => `<li>${k}: ${v}</li>`).join("")}</ul></div><div class="card"><b>حسب الطالب</b><ul>${by(b => b.student_profiles?.display_name)}</ul></div><div class="card"><b>حسب الخدمة</b><ul>${by(b => b.services?.name_ar)}</ul></div>`;
    },
  };
  V.onclick = e => { const b = e.target.closest("[data-t]"); if (b) { tab.onclick = null; tab.onsubmit = null; tabs[b.dataset.t](); } };
  tabs.b();
}

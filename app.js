/**
 * ============================================================
 * app.js - 智能比價管家系統 (終極全功能完整版)
 * 包含：認證、智慧偵測、比價分析、圖表渲染、歷史管理、分類設定
 * ============================================================
 */

// [1. 系統診斷與全局監控]
window.onerror = function(msg, url, line) {
    console.error("Critical Error Detected:", msg, "at", url, "line:", line);
};

// 安全環境檢查：防止 file:// 導致的連線失敗
if (window.location.protocol === 'file:') {
    alert("⚠️ 環境警告：\n偵測到您直接開啟本地檔案。這會觸發瀏覽器安全限制 (CORS)，\n導致您無法登入或儲存數據。請務必使用 GitHub Pages 網址開啟網站。");
}

// [2. Supabase 設定與初始化]
const SUPABASE_URL = 'https://fugdnxzywuypxfsetsmo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Z2RueHp5d3V5cHhmc2V0c21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MDI1NTMsImV4cCI6MjA4NzI3ODU1M30.L6ON4ZcBM_3eqbQve4S8BJBpyzfAH4KtHw6EfgtCoF8';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// [3. 全局變數管理]
let currentUser = null;
let userHistory = [];
let currentAnalyzedItem = null;
let priceChartInstance = null;
let editingRecordId = null;
let activeCategory = null;

// [4. 核心數據結構：分類與關鍵字字典]
let categoryMap = {
    "飲品與乳品": ["鮮奶/保久乳", "茶葉/茶包", "沖泡咖啡", "果汁", "碳酸飲料", "瓶裝水"],
    "生鮮與食品": ["生鮮肉品", "海鮮/水產", "蔬菜水果", "冷凍食品", "零食餅乾", "泡麵罐頭", "米油鹽/調味"],
    "個人護理": ["洗沐用品", "牙膏/牙刷", "生理用品", "刮鬍用品"],
    "美妝保養": ["護膚保養", "彩妝/卸妝", "美容工具"],
    "居家清潔": ["衛生紙/紙巾", "清潔劑/洗衣精", "廚房耗材(保鮮膜/垃圾袋)"],
    "母嬰用品": ["嬰幼兒尿布", "奶粉/副食品", "哺育/洗沐用品"],
    "寵物用品": ["寵物飼料", "寵物罐頭/零食", "寵物貓砂/尿布墊"],
    "文具用品": ["筆/螢光筆", "筆記本/紙張", "辦公小物"],
    "3C 與家電": ["線材/充電", "電腦周邊", "手機配件", "小家電"],
    "其他": ["五金修繕", "汽機車用品", "雜項"]
};

const keywordDict = {
    "乳": { cat: "飲品與乳品", tag: "鮮奶/保久乳" }, "奶": { cat: "飲品與乳品", tag: "鮮奶/保久乳" },
    "茶": { cat: "飲品與乳品", tag: "茶葉/茶包" }, "咖啡": { cat: "飲品與乳品", tag: "沖泡咖啡" },
    "汁": { cat: "飲品與乳品", tag: "果汁" }, "水": { cat: "飲品與乳品", tag: "瓶裝水" },
    "汽水": { cat: "飲品與乳品", tag: "碳酸飲料" }, "可樂": { cat: "飲品與乳品", tag: "碳酸飲料" },
    "肉": { cat: "生鮮與食品", tag: "生鮮肉品" }, "魚": { cat: "生鮮與食品", tag: "海鮮/水產" },
    "餅乾": { cat: "生鮮與食品", tag: "零食餅乾" }, "麵": { cat: "生鮮與食品", tag: "泡麵罐頭" },
    "紙": { cat: "居家清潔", tag: "衛生紙/紙巾" }, "洗": { cat: "居家清潔", tag: "清潔劑/洗衣精" },
    "尿布": { cat: "母嬰用品", tag: "嬰幼兒尿布" }, "貓": { cat: "寵物用品", tag: "寵物飼料" },
    "狗": { cat: "寵物用品", tag: "寵物飼料" }, "筆": { cat: "文具用品", tag: "筆/螢光筆" }
};

// [5. 工具函式]
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t] || t));
}

function getLocalDateString() {
    const today = new Date();
    return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
}

function getRatingEmoji(v) { 
    return v === 'good' ? '😍' : (v === 'bad' ? '🤢' : '😐'); 
}

// [6. 視圖與介面管理]
const views = {
    input: document.getElementById('viewInput'),
    history: document.getElementById('viewHistory'),
    settings: document.getElementById('viewSettings'),
    edit: document.getElementById('viewEditRecord')
};

const tabs = {
    input: document.getElementById('tabInput'),
    history: document.getElementById('tabHistory'),
    settings: document.getElementById('tabSettings')
};

function switchView(viewName) {
    Object.values(views).forEach(v => { if(v) v.classList.add('hidden'); });
    if(views[viewName]) views[viewName].classList.remove('hidden');

    Object.keys(tabs).forEach(k => {
        if(tabs[k]) {
            tabs[k].className = (k === viewName) 
                ? "px-6 py-2.5 bg-white text-slate-800 font-bold rounded-xl shadow-clay transition-all text-sm"
                : "px-6 py-2.5 text-slate-500 font-bold rounded-xl transition-all text-sm";
        }
    });

    if (viewName === 'input') {
        document.getElementById('itemDate').value = getLocalDateString();
    } else if (viewName === 'history') {
        renderHistoryTable();
    } else if (viewName === 'settings') {
        renderSettings();
    }
}

Object.keys(tabs).forEach(k => { if(tabs[k]) tabs[k].onclick = () => switchView(k); });

// [7. 🔐 身份認證模組]

// 登入
document.getElementById('btnLogin').onclick = async () => {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const btn = document.getElementById('btnLogin');
    if (!email || !password) return alert("請輸入信箱與密碼");
    
    btn.disabled = true; btn.textContent = "登入中...";
    try {
        const { error } = await Promise.race([
            supabaseClient.auth.signInWithPassword({ email, password }),
            new Promise((_, r) => setTimeout(() => r(new Error("連線超時")), 5000))
        ]);
        if (error) throw error;
    } catch (err) { alert("登入失敗：" + err.message); }
    finally { btn.disabled = false; btn.textContent = "登入"; }
};

// 註冊
document.getElementById('btnRegister').onclick = async () => {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const btn = document.getElementById('btnRegister');
    if (password.length < 6) return alert("密碼需至少6碼");
    
    btn.disabled = true; btn.textContent = "處理中...";
    try {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        alert("註冊成功，請直接登入！");
    } catch (err) { alert("註冊失敗：" + err.message); }
    finally { btn.disabled = false; btn.textContent = "註冊帳號"; }
};

// 登出 (強力防護)
document.getElementById('btnLogout').onclick = async () => {
    const btn = document.getElementById('btnLogout');
    btn.disabled = true; btn.textContent = "登出中...";
    try {
        await supabaseClient.auth.signOut();
    } finally {
        currentUser = null;
        userHistory = [];
        window.location.reload(); // 強制重新整理
    }
};

// 忘記密碼 UI 切換
document.getElementById('btnShowForgot').onclick = () => {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('forgotSection').classList.remove('hidden');
};
document.getElementById('btnBackToLogin').onclick = () => {
    document.getElementById('forgotSection').classList.add('hidden');
    document.getElementById('authSection').classList.remove('hidden');
};

// 監聽狀態
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        currentUser = session.user;
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appScreen').classList.remove('hidden');
        await loadCloudHistory();
        initCategoryDropdowns();
    } else {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('appScreen').classList.add('hidden');
    }
});

// [8. 🛍️ 比價輸入模組：智慧偵測與聯動]

function initCategoryDropdowns() {
    const catList = document.getElementById('categoryList');
    catList.innerHTML = Object.keys(categoryMap).map(c => `<option value="${c}">`).join('');
    
    const catInput = document.getElementById('itemCategory');
    const tagInput = document.getElementById('itemTag');

    catInput.onchange = (e) => updateTagOptions(e.target.value);

    // [智慧偵測：種類反向填入主分類]
    tagInput.onchange = (e) => {
        const val = e.target.value.trim();
        for (const [cat, tags] of Object.entries(categoryMap)) {
            if (tags.includes(val)) {
                catInput.value = cat;
                updateTagOptions(cat);
                break;
            }
        }
    };
}

function updateTagOptions(cat) {
    const tagList = document.getElementById('tagList');
    if (!cat || !categoryMap[cat]) return tagList.innerHTML = '';
    tagList.innerHTML = categoryMap[cat].map(t => `<option value="${t}">`).join('');
}

// [智慧偵測：商品名稱智慧聯動]
document.getElementById('itemName').onchange = (e) => {
    const name = e.target.value.trim();
    if (!name) return;
    
    const past = userHistory.find(h => h.name === name);
    if (past) {
        document.getElementById('itemCategory').value = past.category;
        updateTagOptions(past.category);
        document.getElementById('itemTag').value = past.tag;
        document.getElementById('itemBrand').value = past.brand || '';
        document.getElementById('itemUnit').value = past.unit || 'g';
    } else {
        for (const key in keywordDict) {
            if (name.includes(key)) {
                document.getElementById('itemCategory').value = keywordDict[key].cat;
                updateTagOptions(keywordDict[key].cat);
                document.getElementById('itemTag').value = keywordDict[key].tag;
                break;
            }
        }
    }
};

// [9. 📊 分析核心：單價計算與結論]

document.getElementById('priceForm').onsubmit = (e) => {
    e.preventDefault();
    const qty = parseFloat(document.getElementById('itemQty').value);
    const unit = document.getElementById('itemUnit').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    
    let sQty = qty, sUnit = unit;
    if (unit === 'kg' || unit === 'L') { sQty *= 1000; sUnit = (unit === 'kg' ? 'g' : 'ml'); }
    const unitPrice = parseFloat((price / sQty).toFixed(4));

    currentAnalyzedItem = {
        user_id: currentUser.id,
        category: document.getElementById('itemCategory').value.trim(),
        tag: document.getElementById('itemTag').value.trim(),
        name: document.getElementById('itemName').value.trim(),
        brand: document.getElementById('itemBrand').value.trim(),
        store: document.getElementById('itemStore').value.trim(),
        qty, unit, price,
        currency: document.getElementById('itemCurrency').value,
        date: document.getElementById('itemDate').value,
        std_qty: sQty, std_unit: sUnit, unit_price: unitPrice,
        rating: 'ok', notes: ''
    };

    renderAnalysisReport(currentAnalyzedItem);
    renderPriceChart(currentAnalyzedItem.tag);
};

function renderAnalysisReport(item) {
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('resultsArea').classList.remove('hidden');
    document.getElementById('resNameBrand').textContent = `${item.brand} ${item.name}`;
    document.getElementById('resBaseName').textContent = `分類：${item.category} > ${item.tag}`;
    document.getElementById('resUnitPrice').textContent = `${item.unit_price} ${item.currency}/${item.std_unit}`;
    
    const tagHistory = userHistory.filter(h => h.tag === item.tag && h.std_unit === item.std_unit);
    if (tagHistory.length > 0) {
        const avg = (tagHistory.reduce((a, b) => a + b.unit_price, 0) / tagHistory.length).toFixed(4);
        let reportHTML = '';
        if (item.unit_price < avg) {
            reportHTML = `<p class="font-bold text-green-600">✅ 划算！本次價格低於歷史平均 (${avg})。</p>`;
        } else if (item.unit_price === parseFloat(avg)) {
            reportHTML = `<p class="font-bold text-blue-500">⚖️ 持平。本次價格與平均值相同。</p>`;
        } else {
            reportHTML = `<p class="font-bold text-orange-500">👀 稍貴。本次價格高於歷史平均 (${avg})。</p>`;
        }
        document.getElementById('reportContent').innerHTML = reportHTML;
    } else {
        document.getElementById('reportContent').textContent = "這是新種類的第一筆紀錄，將作為比價基準。";
    }
}

// [10. 📈 圖表模組]
function renderPriceChart(tag) {
    const ctx = document.getElementById('priceChart');
    if (!ctx) return;
    const chartData = userHistory.filter(h => h.tag === tag).slice(0, 7).reverse();
    if (chartData.length < 2) {
        document.getElementById('chartContainer').classList.add('hidden');
        return;
    }
    document.getElementById('chartContainer').classList.remove('hidden');
    if (priceChartInstance) priceChartInstance.destroy();
    priceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.date),
            datasets: [{ label: '單價走勢', data: chartData.map(d => d.unit_price), borderColor: '#3b82f6', fill: false }]
        }
    });
}

// [11. 💾 儲存與彈窗]

document.getElementById('btnSave').onclick = async () => {
    const btn = document.getElementById('btnSave');
    btn.disabled = true; btn.textContent = "儲存中...";
    try {
        const { data, error } = await Promise.race([
            supabaseClient.from('purchases').insert([currentAnalyzedItem]).select(),
            new Promise((_, r) => setTimeout(() => r(new Error("Timeout")), 8000))
        ]);
        if (error) throw error;
        if (data) {
            userHistory.unshift(data[0]);
            document.getElementById('successModal').classList.remove('hidden');
        }
    } catch (err) { alert("儲存失敗：" + err.message); }
    finally { btn.disabled = false; btn.textContent = "加入購物紀錄"; }
};

function clearForm() {
    document.getElementById('priceForm').reset();
    document.getElementById('itemDate').value = getLocalDateString();
    document.getElementById('resultsArea').classList.add('hidden');
    document.getElementById('emptyState').classList.remove('hidden');
}

document.getElementById('btnModalContinue').onclick = () => {
    document.getElementById('successModal').classList.add('hidden');
    clearForm();
};

document.getElementById('btnModalGoHistory').onclick = () => {
    document.getElementById('successModal').classList.add('hidden');
    clearForm();
    switchView('history');
};

document.getElementById('btnNew').onclick = clearForm;

// [12. 📜 歷史管理：過濾、排序、CRUD]

async function loadCloudHistory() {
    const { data } = await supabaseClient.from('purchases').select('*').order('date', { ascending: false });
    if (data) {
        userHistory = data;
        document.getElementById('nameList').innerHTML = [...new Set(userHistory.map(i => i.name))].map(v => `<option value="${escapeHTML(v)}">`).join('');
    }
}

function renderHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    const search = document.getElementById('historySearch').value.toLowerCase();
    const dateFilter = document.getElementById('historyDateFilter').value;
    const sortVal = document.getElementById('historySort').value;

    let filtered = userHistory.filter(h => (h.name + h.tag).toLowerCase().includes(search));
    if (dateFilter) filtered = filtered.filter(h => h.date === dateFilter);

    if (sortVal === 'dateAsc') filtered.sort((a,b) => new Date(a.date) - new Date(b.date));
    else if (sortVal === 'tagAsc') filtered.sort((a,b) => a.tag.localeCompare(b.tag));

    tbody.innerHTML = filtered.map(item => `
        <tr class="hover-clay border-b border-slate-100 transition-all">
            <td class="p-4"><span class="text-slate-400 block text-xs">${item.date}</span><span class="text-2xl mt-1 block">${getRatingEmoji(item.rating)}</span></td>
            <td class="p-4"><span class="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">${escapeHTML(item.category)} > ${escapeHTML(item.tag)}</span><div class="font-bold text-slate-800 mt-1">${escapeHTML(item.name)}</div></td>
            <td class="p-4 text-xs text-slate-500">${escapeHTML(item.store || '-')}${item.notes ? `<div class="text-blue-400 mt-1 truncate w-24">📝 筆記中...</div>` : ''}</td>
            <td class="p-4 text-sm">${item.qty}${item.unit} | ${item.price} ${item.currency}</td>
            <td class="p-4 font-black text-blue-600">${item.unit_price}/${item.std_unit}</td>
            <td class="p-4 text-center">
                <button onclick="openEditMode('${item.id}')" class="text-xs font-bold text-blue-500 hover:underline">編輯</button>
                <button onclick="deleteRecord('${item.id}')" class="ml-2 text-xs font-bold text-red-300 hover:text-red-500">刪除</button>
            </td>
        </tr>
    `).join('');
    document.getElementById('historyEmpty').className = filtered.length ? "hidden" : "text-center py-20 text-slate-400 font-bold";
}

document.getElementById('historySearch').oninput = renderHistoryTable;
document.getElementById('historyDateFilter').onchange = renderHistoryTable;
document.getElementById('historySort').onchange = renderHistoryTable;

window.deleteRecord = async (id) => {
    if (!confirm("確定刪除？")) return;
    const { error } = await supabaseClient.from('purchases').delete().eq('id', id);
    if (!error) { userHistory = userHistory.filter(h => h.id !== id); renderHistoryTable(); }
};

window.openEditMode = (id) => {
    const item = userHistory.find(h => h.id === id);
    if (!item) return;
    editingRecordId = id; switchView('edit');
    document.getElementById('editInfoDisplay').innerHTML = `<p class="font-bold">${escapeHTML(item.name)}</p><p class="text-xs">${item.date}</p>`;
    document.getElementById('editNotes').value = item.notes || '';
    const rs = document.getElementsByName('editRating');
    rs.forEach(r => { if(r.value === (item.rating || 'ok')) r.checked = true; });
};

document.getElementById('btnCancelEditMode').onclick = () => switchView('history');

document.getElementById('editForm').onsubmit = async (e) => {
    e.preventDefault();
    const rating = document.querySelector('input[name="editRating"]:checked').value;
    const notes = document.getElementById('editNotes').value.trim();
    const { error } = await supabaseClient.from('purchases').update({ rating, notes }).eq('id', editingRecordId);
    if (!error) { 
        const i = userHistory.findIndex(h => h.id === editingRecordId);
        userHistory[i].rating = rating; userHistory[i].notes = notes;
        switchView('history'); 
    }
};

// [13. ⚙️ 分類管理完整功能]

function renderSettings() {
    const list = document.getElementById('categoryManagerList');
    list.innerHTML = Object.keys(categoryMap).map(cat => {
        const isActive = (activeCategory === cat);
        return `<li class="flex justify-between items-center bg-white p-3 rounded-xl shadow-clay mb-2 cursor-pointer border-l-4 ${isActive ? 'border-blue-500 bg-blue-50' : 'border-transparent'}" onclick="selectCategoryForTags('${cat}')">
            <span class="font-bold ${isActive ? 'text-blue-600' : ''}">${cat}</span>
            <button onclick="removeCategory('${cat}')" class="text-red-300 hover:text-red-500 text-xs px-2">刪</button>
        </li>`;
    }).join('');
    renderTagsForActiveCategory();
}

window.selectCategoryForTags = (cat) => { activeCategory = cat; renderSettings(); };

function renderTagsForActiveCategory() {
    const list = document.getElementById('tagManagerList');
    if (!activeCategory) return list.innerHTML = '<li class="text-xs text-slate-400 p-2">請先點擊主分類</li>';
    const tags = categoryMap[activeCategory] || [];
    list.innerHTML = tags.map(tag => `<li class="flex justify-between p-2 border-b border-slate-50 text-sm">
        <span>${tag}</span><button onclick="removeTag('${tag}')" class="text-red-300 hover:text-red-500">x</button>
    </li>`).join('');
}

document.getElementById('btnAddCategory').onclick = () => {
    const val = document.getElementById('newCategoryInput').value.trim();
    if (val && !categoryMap[val]) { categoryMap[val] = []; renderSettings(); document.getElementById('newCategoryInput').value = ''; }
};

document.getElementById('btnAddTag').onclick = () => {
    const val = document.getElementById('newTagInput').value.trim();
    if (val && activeCategory && !categoryMap[activeCategory].includes(val)) {
        categoryMap[activeCategory].push(val); renderSettings(); document.getElementById('newTagInput').value = '';
    }
};

window.removeCategory = (cat) => { if(confirm(`刪除 ${cat}？`)) { delete categoryMap[cat]; activeCategory = null; renderSettings(); } };
window.removeTag = (tag) => { categoryMap[activeCategory] = categoryMap[activeCategory].filter(t => t !== tag); renderSettings(); };

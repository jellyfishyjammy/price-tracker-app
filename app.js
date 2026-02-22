// app.js
window.onerror = function(msg, url, line) {
    alert("網頁發生錯誤：" + msg + "\n(請檢查網路或 F12 Console)");
};

// [🚨 終極防呆：環境偵測警告]
if (window.location.protocol === 'file:') {
    alert("⚠️ 系統偵測提示：\n您目前是直接點擊檔案 (file://) 開啟網頁。\n\n基於瀏覽器的嚴格安全防護，這種方式會阻擋網頁與資料庫的連線。這就是為什麼您的「登入」、「登出」和「儲存」會完全沒反應或超時卡死！\n\n請將檔案上傳後，改用 GitHub Pages 網址 (https://...) 開啟，所有功能就會瞬間恢復正常囉！");
}

const SUPABASE_URL = 'https://fugdnxzywuypxfsetsmo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Z2RueHp5d3V5cHhmc2V0c21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MDI1NTMsImV4cCI6MjA4NzI3ODU1M30.L6ON4ZcBM_3eqbQve4S8BJBpyzfAH4KtHw6EfgtCoF8';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let userHistory = [];
let currentAnalyzedItem = null;
let priceChartInstance = null;
let editingRecordId = null;
let activeCategory = null;

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
    "蝦": { cat: "生鮮與食品", tag: "海鮮/水產" }, "菜": { cat: "生鮮與食品", tag: "蔬菜水果" },
    "果": { cat: "生鮮與食品", tag: "蔬菜水果" }, "冰": { cat: "生鮮與食品", tag: "冷凍食品" },
    "餅乾": { cat: "生鮮與食品", tag: "零食餅乾" }, "麵": { cat: "生鮮與食品", tag: "泡麵罐頭" },
    "罐": { cat: "生鮮與食品", tag: "泡麵罐頭" }, "鹽": { cat: "生鮮與食品", tag: "米油鹽/調味" },
    "糖": { cat: "生鮮與食品", tag: "米油鹽/調味" },
    "沐浴": { cat: "個人護理", tag: "洗沐用品" }, "洗髮": { cat: "個人護理", tag: "洗沐用品" },
    "牙": { cat: "個人護理", tag: "牙膏/牙刷" }, "衛生棉": { cat: "個人護理", tag: "生理用品" },
    "刮鬍": { cat: "個人護理", tag: "刮鬍用品" },
    "乳液": { cat: "美妝保養", tag: "護膚保養" }, "面膜": { cat: "美妝保養", tag: "護膚保養" },
    "妝": { cat: "美妝保養", tag: "彩妝/卸妝" }, "卸": { cat: "美妝保養", tag: "彩妝/卸妝" },
    "紙": { cat: "居家清潔", tag: "衛生紙/紙巾" }, "濕巾": { cat: "居家清潔", tag: "衛生紙/紙巾" },
    "洗": { cat: "居家清潔", tag: "清潔劑/洗衣精" }, "潔": { cat: "居家清潔", tag: "清潔劑/洗衣精" },
    "柔軟精": { cat: "居家清潔", tag: "清潔劑/洗衣精" }, "垃圾袋": { cat: "居家清潔", tag: "廚房耗材(保鮮膜/垃圾袋)" },
    "尿布": { cat: "母嬰用品", tag: "嬰幼兒尿布" }, "奶粉": { cat: "母嬰用品", tag: "奶粉/副食品" },
    "嬰": { cat: "母嬰用品", tag: "哺育/洗沐用品" },
    "狗": { cat: "寵物用品", tag: "寵物飼料" }, "貓": { cat: "寵物用品", tag: "寵物飼料" },
    "飼料": { cat: "寵物用品", tag: "寵物飼料" }, "砂": { cat: "寵物用品", tag: "寵物貓砂/尿布墊" },
    "筆": { cat: "文具用品", tag: "筆/螢光筆" }, "尺": { cat: "文具用品", tag: "辦公小物" },
    "膠帶": { cat: "文具用品", tag: "辦公小物" },
    "線": { cat: "3C 與家電", tag: "線材/充電" }, "充": { cat: "3C 與家電", tag: "線材/充電" },
    "滑鼠": { cat: "3C 與家電", tag: "電腦周邊" }, "鍵盤": { cat: "3C 與家電", tag: "電腦周邊" },
    "鍋": { cat: "3C 與家電", tag: "小家電" }, "吹風機": { cat: "3C 與家電", tag: "小家電" },
    "螺絲": { cat: "其他", tag: "五金修繕" }, "機油": { cat: "其他", tag: "汽機車用品" }
};

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}

function getLocalDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

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
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName].classList.remove('hidden');

    Object.keys(tabs).forEach(k => {
        if (k === viewName) {
            tabs[k].className = "px-6 py-2.5 bg-white text-slate-800 font-bold rounded-xl shadow-clay transition-all text-sm";
        } else {
            tabs[k].className = "px-6 py-2.5 text-slate-500 font-bold rounded-xl transition-all text-sm";
        }
    });

    if (viewName === 'input') document.getElementById('itemDate').value = getLocalDateString();
    if (viewName === 'history') renderHistoryTable();
    if (viewName === 'settings') renderSettings();
}

tabs.input.addEventListener('click', () => switchView('input'));
tabs.history.addEventListener('click', () => switchView('history'));
tabs.settings.addEventListener('click', () => switchView('settings'));

// --- [🛡️ 登入功能裝甲升級] ---
document.getElementById('btnLogin').addEventListener('click', async () => {
    const btn = document.getElementById('btnLogin');
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    
    if (!email || !password) return alert("請輸入信箱與密碼！");
    
    btn.disabled = true;
    btn.textContent = "登入中...";
    
    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
    } catch (err) {
        console.error("登入錯誤:", err);
        alert("登入失敗：" + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "登入";
    }
});

// --- [🛡️ 註冊功能裝甲升級] ---
document.getElementById('btnRegister').addEventListener('click', async () => {
    const btn = document.getElementById('btnRegister');
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    
    if (!email || password.length < 6) return alert("請輸入有效的信箱與至少6碼密碼！");
    
    btn.disabled = true;
    btn.textContent = "註冊中...";
    
    try {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        alert("🎉 註冊成功！請直接點擊登入。");
    } catch (err) {
        console.error("註冊錯誤:", err);
        alert("註冊失敗：" + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "註冊帳號";
    }
});

// --- [🛡️ 登出功能裝甲升級] ---
document.getElementById('btnLogout').addEventListener('click', async () => {
    const btn = document.getElementById('btnLogout');
    btn.disabled = true;
    btn.textContent = "登出中...";
    
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
    } catch (err) {
        console.error("登出發生錯誤:", err);
        alert("與伺服器斷線，已為您強制登出畫面。(" + err.message + ")");
    } finally {
        // 無論伺服器有沒有回應，都強制清空本地畫面，絕對不卡死！
        currentUser = null;
        document.getElementById('appScreen').classList.add('hidden');
        document.getElementById('loginScreen').classList.remove('hidden');
        btn.disabled = false;
        btn.textContent = "登出";
    }
});

document.getElementById('btnShowForgot').addEventListener('click', () => {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('forgotSection').classList.remove('hidden');
});
document.getElementById('btnBackToLogin').addEventListener('click', () => {
    document.getElementById('forgotSection').classList.add('hidden');
    document.getElementById('authSection').classList.remove('hidden');
});

supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session) { 
        currentUser = session.user; 
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appScreen').classList.remove('hidden');
        document.getElementById('itemDate').value = getLocalDateString();
        await loadCloudHistory();
        initCategoryDropdowns();
    } else {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('appScreen').classList.add('hidden');
    }
});

function initCategoryDropdowns() {
    const catList = document.getElementById('categoryList');
    catList.innerHTML = Object.keys(categoryMap).map(c => `<option value="${c}">`).join('');
    
    const catInput = document.getElementById('itemCategory');
    const tagInput = document.getElementById('itemTag');

    catInput.addEventListener('change', (e) => updateTagOptions(e.target.value));

    tagInput.addEventListener('change', (e) => {
        const selectedTag = e.target.value.trim();
        if(!selectedTag) return;
        for (const [cat, tags] of Object.entries(categoryMap)) {
            if (tags.includes(selectedTag)) {
                if (catInput.value !== cat) {
                    catInput.value = cat;
                    updateTagOptions(cat);
                }
                break;
            }
        }
    });
}

function updateTagOptions(cat) {
    const tagList = document.getElementById('tagList');
    if (!cat || !categoryMap[cat]) {
        tagList.innerHTML = '';
        return;
    }
    tagList.innerHTML = categoryMap[cat].map(t => `<option value="${t}">`).join('');
}

document.getElementById('itemName').addEventListener('change', (e) => {
    const name = e.target.value.trim();
    if(!name) return;

    const past = userHistory.find(h => h.name === name);
    if (past) {
        document.getElementById('itemCategory').value = past.category;
        updateTagOptions(past.category);
        document.getElementById('itemTag').value = past.tag;
        document.getElementById('itemBrand').value = past.brand || '';
        document.getElementById('itemStore').value = past.store || '';
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
});

async function loadCloudHistory() {
    const { data, error } = await supabaseClient.from('purchases').select('*').order('date', { ascending: false });
    if (!error) {
        userHistory = data || [];
        document.getElementById('nameList').innerHTML = [...new Set(userHistory.map(i => i.name))].map(v => `<option value="${escapeHTML(v)}">`).join('');
    }
}

function renderHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    const search = document.getElementById('historySearch').value.toLowerCase();
    
    let filtered = userHistory.filter(h => 
        (h.name + h.tag + h.brand).toLowerCase().includes(search)
    );

    tbody.innerHTML = filtered.map(item => `
        <tr class="hover-clay border-b border-slate-100 transition-all">
            <td class="p-4">
                <span class="text-slate-400 block text-xs">${item.date}</span>
                <span class="text-2xl mt-1 block">${getRatingEmoji(item.rating)}</span>
            </td>
            <td class="p-4">
                <span class="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">${escapeHTML(item.category)} > ${escapeHTML(item.tag)}</span>
                <div class="font-bold text-slate-800 mt-1">${escapeHTML(item.name)} <span class="text-slate-400 font-normal text-xs">${escapeHTML(item.brand||'')}</span></div>
            </td>
            <td class="p-4 text-xs text-slate-500">
                ${escapeHTML(item.store || '-')}
                ${item.notes ? `<div class="text-blue-400 mt-1 truncate w-24">📝 筆記中...</div>` : ''}
            </td>
            <td class="p-4 text-sm">
                <span class="text-slate-400">${item.qty}${item.unit}</span><br>
                <span class="font-bold">${item.price} ${item.currency}</span>
            </td>
            <td class="p-4 font-black text-blue-600">${item.unit_price}/${item.std_unit}</td>
            <td class="p-4 text-center">
                <button onclick="openEditMode('${item.id}')" class="text-xs font-bold text-blue-500 hover:underline">編輯評價</button>
                <button onclick="deleteRecord('${item.id}')" class="ml-2 text-xs font-bold text-red-300 hover:text-red-500">刪除</button>
            </td>
        </tr>
    `).join('');
    
    document.getElementById('historyEmpty').className = filtered.length ? "hidden" : "text-center py-20 text-slate-400 font-bold";
}

function getRatingEmoji(val) { return val === 'good' ? '😍' : (val === 'bad' ? '🤢' : '😐'); }

window.deleteRecord = async (id) => {
    if (!confirm("確定要刪除這筆紀錄嗎？")) return;
    const { error } = await supabaseClient.from('purchases').delete().eq('id', id);
    if (!error) {
        userHistory = userHistory.filter(h => h.id !== id);
        renderHistoryTable();
    } else { alert("刪除失敗：" + error.message); }
};

window.openEditMode = (id) => {
    const item = userHistory.find(h => h.id === id);
    if (!item) return;
    
    editingRecordId = id;
    switchView('edit');
    
    document.getElementById('editInfoDisplay').innerHTML = `
        <div class="text-sm">
            <p class="font-bold text-slate-800">${escapeHTML(item.name)}</p>
            <p class="text-slate-500 text-xs">${item.date} | ${item.price} ${item.currency} (${item.qty}${item.unit})</p>
        </div>
    `;
    
    document.getElementById('editNotes').value = item.notes || '';
    const radios = document.getElementsByName('editRating');
    radios.forEach(r => { if(r.value === (item.rating || 'ok')) r.checked = true; });
};

document.getElementById('btnCancelEditMode').addEventListener('click', () => switchView('history'));

document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnUpdateRecord');
    btn.disabled = true;
    
    const rating = document.querySelector('input[name="editRating"]:checked').value;
    const notes = document.getElementById('editNotes').value.trim();
    
    const { error } = await supabaseClient.from('purchases').update({ rating, notes }).eq('id', editingRecordId);
    
    if (!error) {
        const idx = userHistory.findIndex(h => h.id === editingRecordId);
        userHistory[idx].rating = rating;
        userHistory[idx].notes = notes;
        switchView('history');
    } else { alert("更新失敗：" + error.message); }
    btn.disabled = false;
});

document.getElementById('priceForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const qty = parseFloat(document.getElementById('itemQty').value);
    const unit = document.getElementById('itemUnit').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    
    let sQty = qty, sUnit = unit;
    if (unit === 'kg' || unit === 'L') { sQty *= 1000; sUnit = unit === 'kg' ? 'g' : 'ml'; }
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
});

function renderAnalysisReport(item) {
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('resultsArea').classList.remove('hidden');
    document.getElementById('resNameBrand').textContent = `${item.brand} ${item.name}`;
    document.getElementById('resBaseName').textContent = `分類：${item.category} > ${item.tag}`;
    document.getElementById('resUnitPrice').textContent = `${item.unit_price} ${item.currency}/${item.std_unit}`;
    
    const tagHistory = userHistory.filter(h => h.tag === item.tag && h.std_unit === item.std_unit);
    if (tagHistory.length > 0) {
        const avg = (tagHistory.reduce((a, b) => a + b.unit_price, 0) / tagHistory.length).toFixed(4);
        const isCheap = item.unit_price <= avg;
        document.getElementById('reportContent').innerHTML = `
            <p class="font-bold ${isCheap ? 'text-green-600' : 'text-orange-500'}">
                ${isCheap ? '✅ 划算！' : '👀 稍貴'} 比歷史平均 (${avg}) ${isCheap ? '低' : '高'}。
            </p>
        `;
    } else {
        document.getElementById('reportContent').textContent = "這是此種類的第一筆紀錄，將作為未來比價基準。";
    }
}

function clearAndResetForm() {
    document.getElementById('priceForm').reset();
    document.getElementById('itemDate').value = getLocalDateString();
    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('resultsArea').classList.add('hidden');
    
    const btnSave = document.getElementById('btnSave');
    btnSave.textContent = "加入購物紀錄";
    btnSave.disabled = false;
}

document.getElementById('btnSave').addEventListener('click', async () => {
    const btn = document.getElementById('btnSave');
    btn.disabled = true;
    btn.textContent = "儲存中...";
    
    try {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("伺服器連線超時 (Timeout 8s)，請求無回應，請重試。")), 8000);
        });

        const { data, error } = await Promise.race([
            supabaseClient.from('purchases').insert([currentAnalyzedItem]).select(),
            timeoutPromise
        ]);
        
        if (error) throw error;

        if (data && data.length > 0) {
            userHistory.unshift(data[0]);
            document.getElementById('nameList').innerHTML = [...new Set(userHistory.map(i => i.name))].map(v => `<option value="${escapeHTML(v)}">`).join('');
            document.getElementById('successModal').classList.remove('hidden');
        } else {
            throw new Error("儲存成功，但未收到資料庫回傳的確認資料。");
        }
    } catch (err) {
        console.error("儲存失敗詳細資訊:", err);
        alert("儲存失敗：" + (err.message || "請檢查網路連線，或確保不是用 file:/// 開啟檔案。"));
    } finally {
        btn.disabled = false;
        btn.textContent = "加入購物紀錄";
    }
});

document.getElementById('btnModalGoHistory').addEventListener('click', () => {
    document.getElementById('successModal').classList.add('hidden');
    clearAndResetForm();
    switchView('history');
});

document.getElementById('btnModalContinue').addEventListener('click', () => {
    document.getElementById('successModal').classList.add('hidden');
    clearAndResetForm();
});

document.getElementById('btnNew').addEventListener('click', () => {
    clearAndResetForm();
});

function renderSettings() {
    const list = document.getElementById('categoryManagerList');
    list.innerHTML = Object.keys(categoryMap).map(cat => {
        const isActive = (activeCategory === cat);
        const baseClass = "flex justify-between items-center bg-white p-3 rounded-xl shadow-clay mb-2 transition-all cursor-pointer border-l-4";
        const stateClass = isActive ? "border-blue-500 bg-blue-50/50" : "border-transparent hover:bg-slate-50";
        const textClass = isActive ? "text-blue-600" : "text-slate-700";

        return `
            <li class="${baseClass} ${stateClass}" onclick="selectCategoryForTags('${cat}')">
                <span class="font-bold ${textClass}">${cat}</span>
                <span class="text-xs text-blue-500 ${isActive ? 'font-bold' : ''}">${isActive ? '管理中' : '管理子種類'}</span>
            </li>
        `;
    }).join('');

    if (activeCategory) {
        renderTagsForActiveCategory();
    } else {
        document.getElementById('tagManagerList').innerHTML = '<li class="text-sm text-slate-400 p-2">👈 請先點擊左側主分類</li>';
    }
}

window.selectCategoryForTags = (cat) => {
    activeCategory = cat;
    renderSettings();
};

function renderTagsForActiveCategory() {
    const list = document.getElementById('tagManagerList');
    const tags = categoryMap[activeCategory];
    
    if (!tags || tags.length === 0) {
        list.innerHTML = '<li class="text-sm text-slate-400 p-2">此分類尚無種類</li>';
    } else {
        list.innerHTML = tags.map(tag => `
            <li class="flex justify-between p-2 border-b border-slate-50 text-sm items-center">
                <span>${tag}</span>
                <button class="text-red-300 hover:text-red-500 font-bold px-2">x</button>
            </li>
        `).join('');
    }
}

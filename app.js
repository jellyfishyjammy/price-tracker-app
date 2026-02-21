// app.js

window.onerror = function(msg, url, line) {
    alert("網頁發生錯誤：" + msg + "\n(請檢查網路或 F12 Console)");
};

const SUPABASE_URL = 'https://fugdnxzywuypxfsetsmo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1Z2RueHp5d3V5cHhmc2V0c21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MDI1NTMsImV4cCI6MjA4NzI3ODU1M30.L6ON4ZcBM_3eqbQve4S8BJBpyzfAH4KtHw6EfgtCoF8';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let userHistory = [];
let currentAnalyzedItem = null;
let isRecoveringPassword = false;
let priceChartInstance = null;
let editModeId = null;

document.getElementById('itemDate').valueAsDate = new Date();

// 介面切換邏輯
const tabInput = document.getElementById('tabInput');
const tabHistory = document.getElementById('tabHistory');
const viewInput = document.getElementById('viewInput');
const viewHistory = document.getElementById('viewHistory');

tabInput.addEventListener('click', () => {
    tabInput.className = "px-6 py-2.5 bg-white text-slate-800 font-semibold rounded-md shadow-sm transition-all text-sm";
    tabHistory.className = "px-6 py-2.5 text-slate-500 hover:text-slate-700 font-medium rounded-md transition-all text-sm";
    viewInput.classList.remove('hidden');
    viewHistory.classList.add('hidden');
});

tabHistory.addEventListener('click', () => {
    tabHistory.className = "px-6 py-2.5 bg-white text-slate-800 font-semibold rounded-md shadow-sm transition-all text-sm";
    tabInput.className = "px-6 py-2.5 text-slate-500 hover:text-slate-700 font-medium rounded-md transition-all text-sm";
    viewInput.classList.add('hidden');
    viewHistory.classList.remove('hidden');
    renderHistoryTable();
});

// 認證邏輯
function showAuthSection() { document.getElementById('loginScreen').classList.remove('hidden'); document.getElementById('appScreen').classList.add('hidden'); }
async function showApp() { document.getElementById('loginScreen').classList.add('hidden'); document.getElementById('appScreen').classList.remove('hidden'); await loadCloudHistory(); }

supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session && !isRecoveringPassword) { currentUser = session.user; showApp(); } 
    else if (!session) { currentUser = null; showAuthSection(); }
});

document.getElementById('btnRegister').addEventListener('click', async () => {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    if (!email || !email.includes('@')) { alert("❌ 請輸入正確的電子信箱！"); return; }
    if (password.length < 6) { alert("❌ 密碼太短，請至少輸入 6 個字元！"); return; }
    document.getElementById('btnRegister').disabled = true;
    try {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) alert("註冊失敗：" + error.message); else alert("🎉 註冊成功！系統已為您登入。");
    } catch (err) {} finally { document.getElementById('btnRegister').disabled = false; }
});

document.getElementById('btnLogin').addEventListener('click', async () => {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    if (!email || !password) { alert("❌ 請完整輸入信箱與密碼！"); return; }
    document.getElementById('btnLogin').disabled = true;
    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) alert("登入失敗：" + error.message);
    } catch (err) {} finally { document.getElementById('btnLogin').disabled = false; }
});

document.getElementById('btnLogout').addEventListener('click', async () => await supabaseClient.auth.signOut());

document.getElementById('btnShowForgot').addEventListener('click', () => {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('forgotSection').classList.remove('hidden');
});
document.getElementById('btnBackToLogin').addEventListener('click', () => {
    document.getElementById('forgotSection').classList.add('hidden');
    document.getElementById('authSection').classList.remove('hidden');
});

document.getElementById('btnSendReset').addEventListener('click', async () => {
    const email = document.getElementById('forgotEmailInput').value;
    if (!email) { alert("❌ 請輸入電子信箱！"); return; }
    document.getElementById('btnSendReset').textContent = "發送中...";
    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
        if (error) alert("發送失敗：" + error.message);
        else alert("✅ 重設信件已發送！請去信箱點擊連結。");
    } catch(err) { alert("系統異常：" + err.message); } 
    finally { document.getElementById('btnSendReset').textContent = "發送連結"; }
});

document.getElementById('btnUpdatePwd').addEventListener('click', async () => {
    const newPassword = document.getElementById('newPasswordInput').value;
    if (newPassword.length < 6) { alert("❌ 密碼至少需要 6 碼！"); return; }
    document.getElementById('btnUpdatePwd').textContent = "更新中...";
    try {
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) alert("更新失敗：" + error.message);
        else {
            alert("✅ 密碼修改成功！正在進入系統...");
            isRecoveringPassword = false;
            setTimeout(() => showApp(), 1500);
        }
    } catch(err) { alert("系統異常：" + err.message); } 
    finally { document.getElementById('btnUpdatePwd').textContent = "確認修改並登入"; }
});


// 核心資料與智能帶入
async function loadCloudHistory() {
    const { data, error } = await supabaseClient.from('purchases').select('*').order('created_at', { ascending: false });
    if (!error) { userHistory = data || []; populateDatalists(); }
}

function populateDatalists() {
    document.getElementById('nameList').innerHTML = [...new Set(userHistory.map(i => i.name))].map(v => `<option value="${v}">`).join('');
    document.getElementById('categoryList').innerHTML = [...new Set(userHistory.map(i => i.category).filter(Boolean))].map(v => `<option value="${v}">`).join('');
    document.getElementById('tagList').innerHTML = [...new Set(userHistory.map(i => i.tag).filter(Boolean))].map(v => `<option value="${v}">`).join('');
    document.getElementById('brandList').innerHTML = [...new Set(userHistory.map(i => i.brand).filter(Boolean))].map(v => `<option value="${v}">`).join('');
    document.getElementById('storeList').innerHTML = [...new Set(userHistory.map(i => i.store).filter(Boolean))].map(v => `<option value="${v}">`).join('');
}

// 智慧帶入功能 (基於「具體商品名稱」自動記憶填寫其他欄位)
document.getElementById('itemName').addEventListener('change', (e) => {
    const inputName = e.target.value.trim();
    if(!inputName) return;
    const pastItem = userHistory.find(h => h.name === inputName);
    if(pastItem) {
        if(!document.getElementById('itemCategory').value) document.getElementById('itemCategory').value = pastItem.category || '';
        if(!document.getElementById('itemTag').value) document.getElementById('itemTag').value = pastItem.tag || '';
        if(!document.getElementById('itemBrand').value) document.getElementById('itemBrand').value = pastItem.brand || '';
        if(!document.getElementById('itemStore').value) document.getElementById('itemStore').value = pastItem.store || '';
        document.getElementById('itemUnit').value = pastItem.unit || 'g';
    }
});

function getStandardizedData(qty, unit, price) {
    let sQty = parseFloat(qty);
    let sUnit = unit;
    if (unit === 'kg') { sQty = sQty * 1000; sUnit = 'g'; }
    if (unit === 'L') { sQty = sQty * 1000; sUnit = 'ml'; }
    return { sQty, sUnit, unitPrice: parseFloat((price / sQty).toFixed(4)) };
}

function getRatingEmoji(val) {
    if(val === 'good') return '😍';
    if(val === 'bad') return '🤢';
    return '😐';
}

// 表單提交 (分析)
document.getElementById('priceForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnAnalyze');
    btn.innerHTML = "🧠 智能分析中..."; btn.disabled = true;

    setTimeout(() => {
        const stdData = getStandardizedData(
            document.getElementById('itemQty').value,
            document.getElementById('itemUnit').value,
            document.getElementById('itemPrice').value
        );
        
        // 預設為 ok(😐)，只有在編輯模式下才有機會被使用者修改
        let selectedRating = 'ok';
        const ratingNode = document.querySelector('input[name="itemRating"]:checked');
        if(ratingNode) selectedRating = ratingNode.value;

        currentAnalyzedItem = {
            user_id: currentUser.id,
            category: document.getElementById('itemCategory').value.trim(),
            tag: document.getElementById('itemTag').value.trim(),
            name: document.getElementById('itemName').value.trim(),
            brand: document.getElementById('itemBrand').value.trim(),
            store: document.getElementById('itemStore').value.trim(),
            qty: parseFloat(document.getElementById('itemQty').value),
            unit: document.getElementById('itemUnit').value,
            price: parseFloat(document.getElementById('itemPrice').value),
            currency: document.getElementById('itemCurrency').value,
            date: document.getElementById('itemDate').value,
            rating: selectedRating,
            notes: document.getElementById('itemNotes').value.trim(),
            std_qty: stdData.sQty,
            std_unit: stdData.sUnit,
            unit_price: stdData.unitPrice
        };

        if(editModeId) currentAnalyzedItem.id = editModeId;

        generateReport(currentAnalyzedItem);
        btn.innerHTML = "分析並比對歷史價格"; btn.disabled = false;
    }, 400); 
});

// 分析報告生成
function generateReport(currentItem) {
    const currentTag = currentItem.tag;
    
    // 依據「商品種類 (Tag)」做大盤比對
    const tagHistory = userHistory.filter(h => h.tag === currentTag && h.std_unit === currentItem.std_unit && h.id !== editModeId);
    tagHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 依據「具體商品 + 品牌」做情感比對
    const exactHistory = userHistory.filter(h => h.name === currentItem.name && h.brand === currentItem.brand && h.id !== editModeId);
    exactHistory.sort((a, b) => new Date(b.date) - new Date(a.date)); 

    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('resultsArea').classList.remove('hidden');
    document.getElementById('resNameBrand').textContent = `${currentItem.brand} ${currentItem.name}`;
    document.getElementById('resBaseName').textContent = `分類：${currentItem.category} > ${currentItem.tag}`;
    document.getElementById('resUnitPrice').textContent = `${currentItem.unit_price} ${currentItem.currency}/${currentItem.std_unit}`;

    const reportCard = document.getElementById('reportCard');
    const reportContent = document.getElementById('reportContent');
    const extendedReport = document.getElementById('extendedReport');
    const chartContainer = document.getElementById('chartContainer');

    // 1. 市場比較文案修復 (不再說市場平均，改稱歷史平均)
    let marketAnalysisHtml = "";
    let tagAvgPrice = currentItem.unit_price;
    let isCheaperThanAvg = false;

    if (tagHistory.length > 0) {
        const prices = tagHistory.map(h => h.unit_price);
        tagAvgPrice = (prices.reduce((a,b) => a+b, 0) / prices.length).toFixed(4);
        isCheaperThanAvg = currentItem.unit_price < tagAvgPrice;

        if (isCheaperThanAvg) {
            marketAnalysisHtml = `<p>💰 價格分析：目前單價 <strong>低於</strong> 您過去購買「${currentTag}」的歷史平均價 (${tagAvgPrice})。</p>`;
        } else {
            marketAnalysisHtml = `<p>💰 價格分析：目前單價 <strong>高於</strong> 您過去購買「${currentTag}」的歷史平均價 (${tagAvgPrice})。</p>`;
        }
    } else {
        marketAnalysisHtml = `<p>💰 價格分析：這是您第一次記錄「${currentTag}」種類的商品。</p>`;
    }

    // 2. 情感推薦邏輯
    let recommendationHtml = "";
    let cardColor = "border-blue-500";

    if (exactHistory.length > 0) {
        const lastExact = exactHistory[0];
        const lastRating = lastExact.rating;
        
        if(lastRating === 'good') {
            cardColor = isCheaperThanAvg ? "border-green-500" : "border-blue-500";
            recommendationHtml = isCheaperThanAvg 
                ? `<p class="font-bold text-green-700 text-lg mb-2">✅ 極力推薦購買！</p><p>這是您滿意度很高的愛用品，而且現在買很划算！快囤貨！</p>`
                : `<p class="font-bold text-blue-700 text-lg mb-2">👌 可以考慮購買</p><p>雖然價格偏高，但這是您的愛用品，若有急需仍可入手。</p>`;
        } else if(lastRating === 'bad') {
            cardColor = "border-red-500";
            recommendationHtml = isCheaperThanAvg
                ? `<p class="font-bold text-red-700 text-lg mb-2">⛔ 警告：請三思！</p><p>雖然現在很便宜，但您上次購買此商品的體驗極差 (🤢)，不建議購買。</p>`
                : `<p class="font-bold text-red-700 text-lg mb-2">❌ 絕對不要買！</p><p>價格貴，且您上次體驗極差 (🤢)！</p>`;
        } else {
            cardColor = isCheaperThanAvg ? "border-green-500" : "border-slate-500";
            recommendationHtml = `<p class="font-bold text-slate-700 text-lg mb-2">💡 參考建議</p><p>您過去覺得此商品普普通通，可根據當下預算決定。</p>`;
        }
        
        if(lastExact.qty === currentItem.qty) {
            const diff = currentItem.price - lastExact.price;
            if(diff > 0) recommendationHtml += `<p class="text-red-600 mt-2 text-sm font-medium">📈 同規格總價比上次貴了 ${diff.toFixed(2)} ${currentItem.currency}</p>`;
            else if(diff < 0) recommendationHtml += `<p class="text-green-600 mt-2 text-sm font-medium">📉 同規格總價比上次便宜 ${Math.abs(diff).toFixed(2)} ${currentItem.currency}</p>`;
        }

        document.getElementById('recentRecord').innerHTML = `${lastExact.date} ${getRatingEmoji(lastExact.rating)}<br><span class="text-blue-600 font-bold">${lastExact.unit_price}</span> /${lastExact.std_unit}<br><span class="text-xs text-slate-500 mt-1 block">總價: ${lastExact.price} ${lastExact.currency}<br>${lastExact.store||''}</span>`;
    } else {
        cardColor = isCheaperThanAvg ? "border-green-500" : "border-slate-400";
        recommendationHtml = isCheaperThanAvg
            ? `<p class="font-bold text-green-700 text-lg mb-2">✅ 推薦嘗鮮</p><p>這款您沒買過，但目前單價低於您購買同種類商品的歷史平均，值得一試！</p>`
            : `<p class="font-bold text-slate-700 text-lg mb-2">👀 建議觀望</p><p>這是您沒買過的新款，且目前單價高於您過去購買『同種類』商品的歷史平均價。</p>`;
        document.getElementById('recentRecord').innerHTML = `<span class="text-slate-400">尚無同款商品紀錄</span>`;
    }

    reportCard.className = `glass-panel rounded-2xl shadow-xl p-6 border-l-4 ${cardColor}`;
    reportContent.innerHTML = recommendationHtml + `<hr class="my-3 border-slate-200">` + marketAnalysisHtml;

    if(tagHistory.length > 0) {
        let cheapest = tagHistory[0];
        tagHistory.forEach(h => { if(h.unit_price < cheapest.unit_price) cheapest = h; });
        document.getElementById('cheapestRecord').innerHTML = `${cheapest.date}<br><span class="text-green-600 font-bold">${cheapest.unit_price}</span> /${cheapest.std_unit}<br><span class="text-xs text-slate-500 mt-1 block">總價: ${cheapest.price} ${cheapest.currency}<br>${cheapest.name} ${cheapest.brand ? '('+cheapest.brand+')' : ''}</span>`;
        
        drawChart(tagHistory, currentItem);
        extendedReport.classList.remove('hidden');
        chartContainer.classList.remove('hidden');
    } else {
        document.getElementById('cheapestRecord').innerHTML = `<span class="text-slate-400">無歷史比較基準</span>`;
        extendedReport.classList.remove('hidden');
        chartContainer.classList.add('hidden');
    }
}

function drawChart(historyData, currentItem) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    if (priceChartInstance) priceChartInstance.destroy();

    const labels = historyData.map(h => h.date);
    const dataPoints = historyData.map(h => h.unit_price);
    labels.push(currentItem.date + ' (本次)');
    dataPoints.push(currentItem.unit_price);

    priceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `單位價 (${currentItem.currency}/${currentItem.std_unit})`,
                data: dataPoints,
                borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2, fill: true, tension: 0.3,
                pointBackgroundColor: dataPoints.map((_, i) => i === dataPoints.length - 1 ? '#ef4444' : '#ffffff'),
                pointBorderColor: dataPoints.map((_, i) => i === dataPoints.length - 1 ? '#ef4444' : '#3b82f6'),
                pointRadius: dataPoints.map((_, i) => i === dataPoints.length - 1 ? 6 : 4),
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// 儲存邏輯 (更改按鈕文字為 加入購物紀錄)
document.getElementById('btnSave').addEventListener('click', async function() {
    if (!currentAnalyzedItem) return;
    const btn = this; btn.disabled = true; btn.textContent = "上傳中...";

    try {
        if (editModeId) {
            const { error } = await supabaseClient.from('purchases').update(currentAnalyzedItem).eq('id', editModeId);
            if (error) throw error;
            const index = userHistory.findIndex(h => h.id === editModeId);
            if(index !== -1) userHistory[index] = currentAnalyzedItem;
            alert("✅ 紀錄已成功更新！");
            cancelEditMode();
        } else {
            const { data, error } = await supabaseClient.from('purchases').insert([currentAnalyzedItem]).select();
            if (error) throw error;
            userHistory.unshift(data[0]);
        }
        populateDatalists();
        btn.classList.replace('bg-blue-600', 'bg-green-600');
        btn.textContent = "✅ 已加入購物紀錄";
    } catch(err) { 
        alert("儲存失敗：" + err.message); 
        btn.disabled = false;
        btn.textContent = "加入購物紀錄";
    } 
});

document.getElementById('btnNew').addEventListener('click', function() {
    cancelEditMode();
    document.getElementById('priceForm').reset();
    document.getElementById('itemDate').valueAsDate = new Date();
    currentAnalyzedItem = null;
    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('resultsArea').classList.add('hidden');
    document.getElementById('chartContainer').classList.add('hidden');
    
    // 重設按鈕狀態
    const btnSave = document.getElementById('btnSave');
    btnSave.classList.replace('bg-green-600', 'bg-blue-600');
    btnSave.textContent = "加入購物紀錄";
    btnSave.disabled = false;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// 渲染表格
function renderHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    const searchInput = document.getElementById('historySearch').value.toLowerCase();
    const sortOption = document.getElementById('historySort').value;
    const dateFilter = document.getElementById('historyDateFilter').value;
    
    let filtered = userHistory.filter(h => {
        const tagStr = (h.tag || "").toLowerCase();
        const nameStr = (h.name || "").toLowerCase();
        const brandStr = (h.brand || "").toLowerCase();
        const matchSearch = tagStr.includes(searchInput) || nameStr.includes(searchInput) || brandStr.includes(searchInput);
        const matchDate = dateFilter ? h.date === dateFilter : true;
        return matchSearch && matchDate;
    });

    filtered.sort((a, b) => {
        if (sortOption === 'dateDesc') return new Date(b.date) - new Date(a.date);
        if (sortOption === 'dateAsc') return new Date(a.date) - new Date(b.date);
        if (sortOption === 'tagAsc') return (a.tag||"").localeCompare((b.tag||""), 'zh-TW');
        return 0;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('historyEmpty').classList.remove('hidden');
        return;
    }

    document.getElementById('historyEmpty').classList.add('hidden');
    tbody.innerHTML = filtered.map(item => `
        <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
            <td class="p-3">
                <span class="text-slate-500 whitespace-nowrap block">${item.date}</span>
                <span class="text-xl mt-1 block" title="滿意度">${getRatingEmoji(item.rating)}</span>
            </td>
            <td class="p-3">
                <span class="font-bold text-blue-600 text-xs px-2 py-0.5 bg-blue-50 rounded-full">${item.category||'無分類'} > ${item.tag||'無種類'}</span><br>
                <span class="font-medium text-slate-800 mt-1 block">${item.name}</span>
                <span class="text-xs text-slate-400">${item.brand ? '('+item.brand+')' : ''}</span>
            </td>
            <td class="p-3 text-slate-600">
                <span class="block text-sm">${item.store || '-'}</span>
                ${item.notes ? `<span class="text-xs text-slate-400 mt-1 block max-w-[120px] truncate" title="${item.notes}">📝 ${item.notes}</span>` : ''}
            </td>
            <td class="p-3">
                <span class="text-slate-500 block text-sm">${item.qty} ${item.unit}</span>
                <span class="font-semibold text-slate-700 block">${item.price} ${item.currency}</span>
            </td>
            <td class="p-3 text-blue-600 font-medium whitespace-nowrap">${item.unit_price} /${item.std_unit}</td>
            <td class="p-3 text-center">
                <div class="flex flex-col gap-2">
                    <button onclick="editRecord('${item.id}')" class="text-xs bg-slate-100 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded transition-colors">編輯評價</button>
                    <button onclick="deleteRecord('${item.id}')" class="text-xs bg-slate-100 hover:bg-red-100 text-red-600 px-2 py-1 rounded transition-colors">刪除</button>
                </div>
            </td>
        </tr>
    `).join('');
}

document.getElementById('historySearch').addEventListener('input', renderHistoryTable);
document.getElementById('historySort').addEventListener('change', renderHistoryTable);
document.getElementById('historyDateFilter').addEventListener('change', renderHistoryTable);

window.deleteRecord = async (id) => {
    if(!confirm("確定要刪除這筆紀錄嗎？這無法復原喔！")) return;
    try {
        const { error } = await supabaseClient.from('purchases').delete().eq('id', id);
        if(error) throw error;
        userHistory = userHistory.filter(h => h.id !== id);
        renderHistoryTable();
        populateDatalists();
    } catch(err) { alert("刪除失敗：" + err.message); }
};

window.editRecord = (id) => {
    const item = userHistory.find(h => h.id === id);
    if(!item) return;

    editModeId = id;
    
    document.getElementById('itemCategory').value = item.category || '';
    document.getElementById('itemTag').value = item.tag || '';
    document.getElementById('itemName').value = item.name || '';
    document.getElementById('itemBrand').value = item.brand || '';
    document.getElementById('itemStore').value = item.store || '';
    document.getElementById('itemQty').value = item.qty || '';
    document.getElementById('itemUnit').value = item.unit || 'g';
    document.getElementById('itemPrice').value = item.price || '';
    document.getElementById('itemCurrency').value = item.currency || 'TWD';
    document.getElementById('itemDate').value = item.date || '';
    document.getElementById('itemNotes').value = item.notes || '';
    
    const ratingRadios = document.getElementsByName('itemRating');
    for(let r of ratingRadios) {
        if(r.value === (item.rating || 'ok')) r.checked = true;
    }

    // 進入編輯模式，解開隱藏的評價區塊
    document.getElementById('formTitle').textContent = "✏️ 編輯紀錄與評價";
    document.getElementById('formTopBar').className = "absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-400";
    document.getElementById('btnAnalyze').textContent = "重新分析並準備更新";
    document.getElementById('btnCancelEdit').classList.remove('hidden');
    document.getElementById('ratingSection').classList.remove('hidden');

    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('resultsArea').classList.add('hidden');
    
    tabInput.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function cancelEditMode() {
    editModeId = null;
    document.getElementById('formTitle').textContent = "輸入商品資訊";
    document.getElementById('formTopBar').className = "absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-teal-400";
    document.getElementById('btnAnalyze').textContent = "分析並比對歷史價格";
    document.getElementById('btnCancelEdit').classList.add('hidden');
    document.getElementById('ratingSection').classList.add('hidden');
}

document.getElementById('btnCancelEdit').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('btnNew').click();
});
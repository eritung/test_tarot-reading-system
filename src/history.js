import { loadState, deleteHistoryItem, clearHistory } from './storage.js'
import { supabase } from './supabase-client.js'

const root = document.querySelector('#history-app')
const state = loadState()
let remoteReadings = []
let keyword = ''

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('zh-TW', { hour12: false })
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function readingToSearchText(item, isLocal = false) {
  const cards = isLocal ? (item.drawnCards || []).map((c) => `${c.cardName} ${c.position || ''} ${c.customPosition || ''}`).join(' ') : (item.cards || []).map((c) => `${c.name} ${c.position || ''} ${c.raw_position || ''} ${c.custom_position || ''}`).join(' ')
  const base = isLocal
    ? [item.customerName, item.questionType, item.questionContent, item.aiResult, cards]
    : [item.client_name, item.question_type, item.question, item.ai_result, cards]
  return base.filter(Boolean).join(' ').toLowerCase()
}

function filterReadings(list, isLocal = false) {
  const query = keyword.trim().toLowerCase()
  if (!query) return list
  return list.filter((item) => readingToSearchText(item, isLocal).includes(query))
}

async function loadRemoteReadings() {
  const { data, error } = await supabase
    .from('readings')
    .select('id, client_name, question, question_type, cards, ai_result, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    remoteReadings = []
    return
  }
  remoteReadings = data || []
}

async function deleteRemote(id) {
  if (!confirm('確定要刪除這筆雲端紀錄嗎？')) return
  const { error } = await supabase.from('readings').delete().eq('id', id)
  if (error) return alert(`刪除失敗：${error.message}`)
  await loadRemoteReadings()
  render()
}

function renderSearchBar() {
  return `
    <section class="panel panel-gold" style="margin-bottom:20px;">
      <div class="row" style="justify-content:space-between; align-items:flex-end; gap:16px;">
        <div style="flex:1; min-width:260px;">
          <h2 class="section-title">✦ 搜尋紀錄</h2>
          <div class="divider"></div>
          <label class="label">關鍵字篩選</label>
          <input class="input" id="keywordSearch" placeholder="可搜尋客戶姓名、問題內容、牌名、解牌文字..." value="${escapeHtml(keyword)}">
          <div class="helper" style="margin-top:8px;">目前會同時篩選雲端紀錄與本機備份紀錄。</div>
        </div>
        <div class="row">
          <a class="button btn-ghost" href="./index.html">← 返回主頁</a>
          <button class="button btn-danger" id="clearAllBtn" ${state.history.length ? '' : 'disabled'}>清空本機紀錄</button>
        </div>
      </div>
    </section>
  `
}

function render() {
  const filteredRemote = filterReadings(remoteReadings, false)
  const filteredLocal = filterReadings(state.history, true)

  root.innerHTML = `
    <header class="header">
      <div class="container header-inner">
        <div class="brand">
          <h1>📋 歷史紀錄</h1>
          <small>可用關鍵字快速篩選雲端資料與本機備份。</small>
        </div>
      </div>
    </header>
    <main class="main container">
      ${renderSearchBar()}
      <section class="panel panel-gold" style="margin-bottom:20px;">
        <h2 class="section-title">✦ 雲端紀錄</h2>
        <div class="divider"></div>
        ${remoteReadings.length === 0 ? `<div class="empty"><div style="font-size:30px;">☁️</div><div>目前沒有任何雲端紀錄</div></div>` : filteredRemote.length === 0 ? `<div class="empty"><div style="font-size:30px;">🔎</div><div>找不到符合關鍵字的雲端紀錄</div></div>` : `
          <div class="history-list">
            ${filteredRemote.map((item) => `
              <article class="history-item">
                <div class="row" style="justify-content:space-between; align-items:flex-start;">
                  <div>
                    <h3>${escapeHtml(item.client_name || '未命名客戶')}</h3>
                    <div class="helper">建立時間：${formatDate(item.created_at)}</div>
                  </div>
                  <button class="button btn-danger" data-delete-remote="${item.id}">刪除</button>
                </div>
                <div class="divider"></div>
                <div class="kv">
                  <div class="helper">問題類型</div><div>${escapeHtml(item.question_type || '—')}</div>
                  <div class="helper">提問內容</div><div>${escapeHtml(item.question || '—')}</div>
                  <div class="helper">抽牌張數</div><div>${item.cards?.length || 0} 張</div>
                  <div class="helper">抽到的牌</div><div>${escapeHtml((item.cards || []).map((c) => `${c.name}${c.reversed ? '（逆位）' : ''}`).join('、') || '—')}</div>
                  <div class="helper">解牌結果</div><div>${item.ai_result ? escapeHtml(item.ai_result).replace(/\n/g, '<br>') : '尚未生成'}</div>
                </div>
              </article>
            `).join('')}
          </div>`}
      </section>

      <section class="panel panel-gold">
        <h2 class="section-title">✦ 本機備份紀錄</h2>
        <div class="divider"></div>
        ${state.history.length === 0 ? `<div class="empty"><div style="font-size:30px;">🗂️</div><div>目前沒有任何本機紀錄</div></div>` : filteredLocal.length === 0 ? `<div class="empty"><div style="font-size:30px;">🔎</div><div>找不到符合關鍵字的本機紀錄</div></div>` : `
          <div class="history-list">
            ${filteredLocal.map((item) => `
              <article class="history-item">
                <div class="row" style="justify-content:space-between; align-items:flex-start;">
                  <div>
                    <h3>${escapeHtml(item.customerName || '未命名客戶')}</h3>
                    <div class="helper">更新時間：${formatDate(item.updatedAt)}</div>
                  </div>
                  <button class="button btn-danger" data-delete-local="${item.id}">刪除</button>
                </div>
                <div class="divider"></div>
                <div class="kv">
                  <div class="helper">問題類型</div><div>${escapeHtml(item.questionType || '—')}</div>
                  <div class="helper">提問內容</div><div>${escapeHtml(item.questionContent || '—')}</div>
                  <div class="helper">抽牌張數</div><div>${item.drawnCards?.length || 0} 張</div>
                  <div class="helper">抽到的牌</div><div>${escapeHtml((item.drawnCards || []).map((c) => `${c.cardName}${c.isReversed ? '（逆位）' : ''}`).join('、') || '—')}</div>
                  <div class="helper">解牌結果</div><div>${item.aiResult ? escapeHtml(item.aiResult).replace(/\n/g, '<br>') : '尚未生成'}</div>
                </div>
              </article>
            `).join('')}
          </div>`}
      </section>
    </main>
  `

  root.querySelector('#keywordSearch')?.addEventListener('input', (e) => {
    keyword = e.target.value
    render()
  })

  root.querySelector('#clearAllBtn')?.addEventListener('click', () => {
    if (!confirm('確定要清空全部本機紀錄嗎？')) return
    clearHistory(state)
    render()
  })
  root.querySelectorAll('[data-delete-local]').forEach((el) => el.addEventListener('click', () => {
    const id = el.dataset.deleteLocal
    if (!confirm('確定要刪除這筆本機紀錄嗎？')) return
    deleteHistoryItem(state, id)
    render()
  }))
  root.querySelectorAll('[data-delete-remote]').forEach((el) => el.addEventListener('click', () => deleteRemote(el.dataset.deleteRemote)))
}

await loadRemoteReadings()
render()

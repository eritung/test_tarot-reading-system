import { loadState, deleteHistoryItem, clearHistory } from './storage.js'

const root = document.querySelector('#history-app')
const state = loadState()

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('zh-TW', { hour12: false })
}

function render() {
  root.innerHTML = `
    <header class="header">
      <div class="container header-inner">
        <div class="brand">
          <h1>📋 歷史紀錄</h1>
          <small>資料儲存在目前瀏覽器的 localStorage，可作為 GitHub Pages 預覽展示。</small>
        </div>
        <div class="row">
          <a class="button btn-ghost" href="./index.html">← 返回主頁</a>
          <button class="button btn-danger" id="clearAllBtn" ${state.history.length ? '' : 'disabled'}>清空全部紀錄</button>
        </div>
      </div>
    </header>
    <main class="main container">
      <section class="panel panel-gold">
        <h2 class="section-title">✦ 已儲存的諮詢紀錄</h2>
        <div class="divider"></div>
        ${state.history.length === 0 ? `<div class="empty"><div style="font-size:30px;">🗂️</div><div>目前沒有任何紀錄</div></div>` : `
          <div class="history-list">
            ${state.history.map((item) => `
              <article class="history-item">
                <div class="row" style="justify-content:space-between; align-items:flex-start;">
                  <div>
                    <h3>${item.customerName || '未命名客戶'}</h3>
                    <div class="helper">更新時間：${formatDate(item.updatedAt)}</div>
                  </div>
                  <button class="button btn-danger" data-delete="${item.id}">刪除</button>
                </div>
                <div class="divider"></div>
                <div class="kv">
                  <div class="helper">問題類型</div><div>${item.questionType || '—'}</div>
                  <div class="helper">提問內容</div><div>${item.questionContent || '—'}</div>
                  <div class="helper">抽牌張數</div><div>${item.drawnCards?.length || 0} 張</div>
                  <div class="helper">抽到的牌</div><div>${(item.drawnCards || []).map((c) => `${c.cardName}${c.isReversed ? '（逆位）' : ''}`).join('、') || '—'}</div>
                  <div class="helper">解牌結果</div><div>${item.aiResult ? item.aiResult.replace(/\n/g, '<br>') : '尚未生成'}</div>
                </div>
              </article>
            `).join('')}
          </div>`}
      </section>
    </main>
  `
  root.querySelector('#clearAllBtn')?.addEventListener('click', () => {
    if (!confirm('確定要清空全部歷史紀錄嗎？')) return
    clearHistory(state)
    render()
  })
  root.querySelectorAll('[data-delete]').forEach((el) => el.addEventListener('click', () => {
    const id = el.dataset.delete
    if (!confirm('確定要刪除這筆紀錄嗎？')) return
    deleteHistoryItem(state, id)
    render()
  }))
}

render()

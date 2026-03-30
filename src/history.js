import { loadState, deleteHistoryItem, clearHistory } from './storage.js'
import { supabase, getCurrentUser } from './supabase-client.js'

const root = document.querySelector('#history-app')
const state = loadState()
let remoteReadings = []
let authUser = null

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('zh-TW', { hour12: false })
}

async function loadRemoteReadings() {
  authUser = await getCurrentUser().catch(() => null)
  if (!authUser) {
    remoteReadings = []
    return
  }
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

async function handleLogin() {
  const email = prompt('請輸入 Email 以接收 Magic Link 登入連結')
  if (!email) return
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href },
  })
  if (error) return alert(`登入連結寄送失敗：${error.message}`)
  alert('Magic Link 已寄出，請到信箱完成登入')
}

async function handleLogout() {
  const { error } = await supabase.auth.signOut()
  if (error) return alert(`登出失敗：${error.message}`)
  await loadRemoteReadings()
  render()
}

async function deleteRemote(id) {
  if (!confirm('確定要刪除這筆雲端紀錄嗎？')) return
  const { error } = await supabase.from('readings').delete().eq('id', id)
  if (error) return alert(`刪除失敗：${error.message}`)
  await loadRemoteReadings()
  render()
}

function render() {
  root.innerHTML = `
    <header class="header">
      <div class="container header-inner">
        <div class="brand">
          <h1>📋 歷史紀錄</h1>
          <small>${authUser ? `目前顯示 Supabase 雲端紀錄（${authUser.email || authUser.id}）` : '尚未登入時，僅顯示目前瀏覽器的 localStorage 備份。'}</small>
        </div>
        <div class="row">
          <button class="button ${authUser ? 'btn-outline' : 'btn-gold'}" id="loginBtn">${authUser ? '重新寄送登入連結' : '登入 Supabase'}</button>
          ${authUser ? '<button class="button btn-outline" id="logoutBtn">登出</button>' : ''}
          <a class="button btn-ghost" href="./index.html">← 返回主頁</a>
          <button class="button btn-danger" id="clearAllBtn" ${state.history.length ? '' : 'disabled'}>清空本機紀錄</button>
        </div>
      </div>
    </header>
    <main class="main container">
      <section class="panel panel-gold" style="margin-bottom:20px;">
        <h2 class="section-title">✦ 雲端紀錄</h2>
        <div class="divider"></div>
        ${!authUser ? `<div class="empty"><div style="font-size:30px;">☁️</div><div>登入後可查看 Supabase 中的完整紀錄</div></div>` : remoteReadings.length === 0 ? `<div class="empty"><div style="font-size:30px;">☁️</div><div>目前沒有任何雲端紀錄</div></div>` : `
          <div class="history-list">
            ${remoteReadings.map((item) => `
              <article class="history-item">
                <div class="row" style="justify-content:space-between; align-items:flex-start;">
                  <div>
                    <h3>${item.client_name || '未命名客戶'}</h3>
                    <div class="helper">建立時間：${formatDate(item.created_at)}</div>
                  </div>
                  <button class="button btn-danger" data-delete-remote="${item.id}">刪除</button>
                </div>
                <div class="divider"></div>
                <div class="kv">
                  <div class="helper">問題類型</div><div>${item.question_type || '—'}</div>
                  <div class="helper">提問內容</div><div>${item.question || '—'}</div>
                  <div class="helper">抽牌張數</div><div>${item.cards?.length || 0} 張</div>
                  <div class="helper">抽到的牌</div><div>${(item.cards || []).map((c) => `${c.name}${c.reversed ? '（逆位）' : ''}`).join('、') || '—'}</div>
                  <div class="helper">解牌結果</div><div>${item.ai_result ? item.ai_result.replace(/
/g, '<br>') : '尚未生成'}</div>
                </div>
              </article>
            `).join('')}
          </div>`}
      </section>

      <section class="panel panel-gold">
        <h2 class="section-title">✦ 本機備份紀錄</h2>
        <div class="divider"></div>
        ${state.history.length === 0 ? `<div class="empty"><div style="font-size:30px;">🗂️</div><div>目前沒有任何本機紀錄</div></div>` : `
          <div class="history-list">
            ${state.history.map((item) => `
              <article class="history-item">
                <div class="row" style="justify-content:space-between; align-items:flex-start;">
                  <div>
                    <h3>${item.customerName || '未命名客戶'}</h3>
                    <div class="helper">更新時間：${formatDate(item.updatedAt)}</div>
                  </div>
                  <button class="button btn-danger" data-delete-local="${item.id}">刪除</button>
                </div>
                <div class="divider"></div>
                <div class="kv">
                  <div class="helper">問題類型</div><div>${item.questionType || '—'}</div>
                  <div class="helper">提問內容</div><div>${item.questionContent || '—'}</div>
                  <div class="helper">抽牌張數</div><div>${item.drawnCards?.length || 0} 張</div>
                  <div class="helper">抽到的牌</div><div>${(item.drawnCards || []).map((c) => `${c.cardName}${c.isReversed ? '（逆位）' : ''}`).join('、') || '—'}</div>
                  <div class="helper">解牌結果</div><div>${item.aiResult ? item.aiResult.replace(/
/g, '<br>') : '尚未生成'}</div>
                </div>
              </article>
            `).join('')}
          </div>`}
      </section>
    </main>
  `
  root.querySelector('#loginBtn')?.addEventListener('click', handleLogin)
  root.querySelector('#logoutBtn')?.addEventListener('click', handleLogout)
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

supabase.auth.onAuthStateChange(async () => {
  await loadRemoteReadings()
  render()
})

await loadRemoteReadings()
render()

import { MAJOR_ARCANA, MINOR_ARCANA, SUITS, QUESTION_TYPES, CARD_POSITIONS } from './data.js'
import { loadState, saveState, upsertHistory, resetCurrent } from './storage.js'
import { generateMockReading } from './ai-mock.js'

const state = loadState()
const app = document.querySelector('#app')

function uid(prefix='id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function showToast(msg, type = 'success') {
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.textContent = msg
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 2800)
}

function getQuestionTypeValue() {
  return state.current.questionType === '其他' ? (state.current.customQuestionType || '其他') : state.current.questionType
}

function persistCurrent() {
  saveState(state)
}

function startSession() {
  if (!state.current.customerName.trim()) return showToast('請先輸入客戶姓名', 'error')
  state.current.id = state.current.id || uid('session')
  state.current.isStarted = true
  upsertHistory(state, { ...state.current, questionType: getQuestionTypeValue() })
  render()
  showToast('已建立諮詢紀錄')
}

function saveSession() {
  if (!state.current.customerName.trim()) return showToast('請先輸入客戶姓名', 'error')
  if (!state.current.id) state.current.id = uid('session')
  upsertHistory(state, { ...state.current, questionType: getQuestionTypeValue(), isStarted: true })
  render()
  showToast('紀錄已儲存到本機瀏覽器')
}

function nextCustomer() {
  if (!confirm('確定要結束本次諮詢並開始下一位顧客嗎？')) return
  if (state.current.id) upsertHistory(state, { ...state.current, questionType: getQuestionTypeValue(), isStarted: false })
  resetCurrent(state)
  render()
  showToast('已重置，可開始下一位顧客')
}

function deleteCard(id) {
  state.current.drawnCards = state.current.drawnCards.filter((c) => c.id !== id)
  persistCurrent()
  render()
}

function openModal(editCard = null) {
  const usedCards = state.current.drawnCards.map((c) => c.cardName)
  const wrapper = document.createElement('div')
  wrapper.className = 'modal-backdrop'
  let category = editCard && MAJOR_ARCANA.includes(editCard.cardName) ? 'major' : 'major'
  let suit = '權杖'
  if (editCard && !MAJOR_ARCANA.includes(editCard.cardName)) {
    category = 'minor'
    suit = SUITS.find((s) => MINOR_ARCANA[s].includes(editCard.cardName)) || '權杖'
  }
  let selectedCard = editCard?.cardName || ''
  let position = editCard?.position || '現在'
  let customPosition = editCard?.customPosition || ''
  let isReversed = Boolean(editCard?.isReversed)

  const renderModal = () => {
    const pool = category === 'major' ? MAJOR_ARCANA : MINOR_ARCANA[suit]
    const cards = pool.filter((card) => card === editCard?.cardName || !usedCards.includes(card))
    wrapper.innerHTML = `
      <div class="panel panel-gold modal">
        <div class="row" style="justify-content:space-between;align-items:center;">
          <h3 class="section-title">✦ ${editCard ? '編輯牌卡' : '選擇塔羅牌'}</h3>
          <button class="button btn-ghost" data-close>✕</button>
        </div>
        <div class="divider"></div>
        <div style="display:grid; gap:16px;">
          <div>
            <label class="label">牌組類別</label>
            <div class="row">
              <button class="button ${category === 'major' ? 'btn-gold' : 'btn-outline'}" data-category="major">大牌</button>
              <button class="button ${category === 'minor' ? 'btn-gold' : 'btn-outline'}" data-category="minor">小牌</button>
            </div>
          </div>
          ${category === 'minor' ? `<div><label class="label">花色</label><div class="row">${SUITS.map((s) => `<button class="button ${suit === s ? 'btn-gold' : 'btn-outline'}" data-suit="${s}">${s}</button>`).join('')}</div></div>` : ''}
          <div>
            <label class="label">選擇牌名</label>
            <select class="select" id="card-select">
              <option value="">── 請選擇 ──</option>
              ${cards.map((card) => `<option value="${card}" ${selectedCard === card ? 'selected' : ''}>${card}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="label">牌位屬性</label>
            <select class="select" id="position-select">
              ${CARD_POSITIONS.map((p) => `<option value="${p}" ${position === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
          ${position === '其他' ? `<div><label class="label">自訂牌位名稱</label><input class="input" id="custom-position" value="${customPosition}" placeholder="輸入自訂牌位..." /></div>` : ''}
          ${state.current.useReversal ? `<div><label class="label">正逆位</label><div class="row"><button class="button ${!isReversed ? 'btn-gold' : 'btn-outline'}" data-rev="0">⬆️ 正位</button><button class="button ${isReversed ? 'btn-gold' : 'btn-outline'}" data-rev="1">🔄 逆位</button></div></div>` : ''}
        </div>
        <div class="divider"></div>
        <div class="row" style="justify-content:flex-end;">
          <button class="button btn-outline" data-close>取消</button>
          <button class="button btn-gold" data-submit ${selectedCard ? '' : 'disabled'}>${editCard ? '儲存修改' : '加入此牌'}</button>
        </div>
      </div>`

    wrapper.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => wrapper.remove()))
    wrapper.addEventListener('click', (e) => { if (e.target === wrapper) wrapper.remove() })
    wrapper.querySelectorAll('[data-category]').forEach((el) => el.addEventListener('click', () => { category = el.dataset.category; selectedCard = ''; renderModal() }))
    wrapper.querySelectorAll('[data-suit]').forEach((el) => el.addEventListener('click', () => { suit = el.dataset.suit; selectedCard = ''; renderModal() }))
    wrapper.querySelectorAll('[data-rev]').forEach((el) => el.addEventListener('click', () => { isReversed = el.dataset.rev === '1'; renderModal() }))
    wrapper.querySelector('#card-select')?.addEventListener('change', (e) => { selectedCard = e.target.value; renderModal() })
    wrapper.querySelector('#position-select')?.addEventListener('change', (e) => { position = e.target.value; renderModal() })
    wrapper.querySelector('#custom-position')?.addEventListener('input', (e) => { customPosition = e.target.value })
    wrapper.querySelector('[data-submit]')?.addEventListener('click', () => {
      const nextOrder = editCard?.cardOrder ?? state.current.drawnCards.length
      const payload = {
        id: editCard?.id || uid('card'),
        cardName: selectedCard,
        isReversed: state.current.useReversal ? isReversed : false,
        position,
        customPosition: position === '其他' ? customPosition : '',
        cardOrder: nextOrder,
      }
      if (editCard) {
        state.current.drawnCards = state.current.drawnCards.map((c) => c.id === editCard.id ? payload : c)
      } else {
        state.current.drawnCards.push(payload)
      }
      persistCurrent()
      wrapper.remove()
      render()
      showToast(editCard ? '牌卡已更新' : '已加入牌卡')
    })
  }
  renderModal()
  document.body.appendChild(wrapper)
}

function generateAI() {
  if (!state.current.customerName.trim()) return showToast('請輸入客戶姓名', 'error')
  if (!state.current.questionContent.trim()) return showToast('請輸入客戶提問內容', 'error')
  if (state.current.drawnCards.length === 0) return showToast('請至少新增一張牌', 'error')
  state.current.aiResult = generateMockReading({ ...state.current, questionType: getQuestionTypeValue() })
  persistCurrent()
  saveSession()
  render()
  document.querySelector('#ai-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  showToast('已生成模擬解牌')
}

function bindInputs() {
  app.querySelector('#customerName')?.addEventListener('input', (e) => { state.current.customerName = e.target.value; persistCurrent(); renderHeaderOnly() })
  app.querySelector('#questionType')?.addEventListener('change', (e) => { state.current.questionType = e.target.value; persistCurrent(); render() })
  app.querySelector('#customQuestionType')?.addEventListener('input', (e) => { state.current.customQuestionType = e.target.value; persistCurrent() })
  app.querySelector('#questionContent')?.addEventListener('input', (e) => { state.current.questionContent = e.target.value; persistCurrent() })
  app.querySelector('#useReversal')?.addEventListener('click', () => { state.current.useReversal = !state.current.useReversal; persistCurrent(); render() })
  app.querySelector('#startBtn')?.addEventListener('click', startSession)
  app.querySelector('#saveBtn')?.addEventListener('click', saveSession)
  app.querySelector('#generateBtn')?.addEventListener('click', generateAI)
  app.querySelector('#nextBtn')?.addEventListener('click', nextCustomer)
  app.querySelector('#addCardBtn')?.addEventListener('click', () => openModal())
  app.querySelectorAll('[data-edit-card]').forEach((el) => el.addEventListener('click', () => {
    const card = state.current.drawnCards.find((c) => c.id === el.dataset.editCard)
    if (card) openModal(card)
  }))
  app.querySelectorAll('[data-delete-card]').forEach((el) => el.addEventListener('click', () => {
    const id = el.dataset.deleteCard
    const card = state.current.drawnCards.find((c) => c.id === id)
    if (card && confirm(`確定要刪除「${card.cardName}」嗎？`)) deleteCard(id)
  }))
}

function renderHeaderOnly() {
  const meta = app.querySelector('#headerMeta')
  if (!meta) return
  meta.innerHTML = state.current.customerName ? `目前諮詢：${state.current.customerName}${state.current.id ? ' <span class="badge">進行中</span>' : ''}` : ''
}

function render() {
  const cardsHtml = state.current.drawnCards.length === 0 ? `
    <div class="empty">
      <div style="font-size:34px; margin-bottom:8px;">🃏</div>
      <div>尚未加入任何牌卡</div>
      <div class="helper" style="margin-top:4px;">點擊「新增抽牌」開始記錄</div>
    </div>` : state.current.drawnCards.sort((a, b) => a.cardOrder - b.cardOrder).map((card, idx) => {
      const positionLabel = card.position === '其他' ? (card.customPosition || '自訂牌位') : card.position
      return `<div class="card-item"><div class="card-top"><div><div class="card-meta">第 ${idx + 1} 張・${positionLabel}</div><div class="card-name">${card.cardName}</div><div class="card-meta">${state.current.useReversal ? (card.isReversed ? '逆位' : '正位') : '未啟用正逆位'} </div></div><div class="row"><button class="button btn-outline" data-edit-card="${card.id}">編輯</button><button class="button btn-danger" data-delete-card="${card.id}">刪除</button></div></div></div>`
    }).join('')

  app.innerHTML = `
    <header class="header">
      <div class="container header-inner">
        <div class="brand">
          <h1>🔮 塔羅解牌系統</h1>
          <small id="headerMeta">${state.current.customerName ? `目前諮詢：${state.current.customerName}${state.current.id ? ' <span class="badge">進行中</span>' : ''}` : ''}</small>
        </div>
        <div class="row">
          <a class="button btn-ghost" href="./history.html">📋 歷史紀錄</a>
          ${state.current.isStarted ? '<button class="button btn-outline" id="nextBtn">👤 下一位顧客</button>' : ''}
        </div>
      </div>
    </header>
    <main class="main container">
      <section class="panel panel-gold">
        <h2 class="section-title">✦ 客戶基本資料</h2>
        <div class="divider"></div>
        <div class="grid">
          <div class="full"><label class="label">客戶姓名 *</label><input class="input" id="customerName" value="${state.current.customerName}" placeholder="輸入客戶姓名..." ${state.current.isStarted ? 'disabled' : ''}></div>
          <div><label class="label">問題類型</label><select class="select" id="questionType">${QUESTION_TYPES.map((t) => `<option value="${t}" ${state.current.questionType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          ${state.current.questionType === '其他' ? `<div><label class="label">自訂類型</label><input class="input" id="customQuestionType" value="${state.current.customQuestionType || ''}" placeholder="請輸入問題類型..."></div>` : '<div></div>'}
          <div class="full"><label class="label">客戶提問內容 *</label><textarea class="textarea" id="questionContent" placeholder="輸入客戶的具體問題或想了解的方向...">${state.current.questionContent || ''}</textarea></div>
          <div class="full"><div class="row"><button class="toggle ${state.current.useReversal ? 'active' : ''}" id="useReversal" type="button"></button><div><div>加入正逆位評估</div><div class="helper">${state.current.useReversal ? '啟用中' : '未啟用'}</div></div></div></div>
        </div>
        ${state.current.isStarted ? '' : `<div style="margin-top:18px;"><button class="button btn-gold" id="startBtn" ${state.current.customerName.trim() ? '' : 'disabled'}>✦ 開始諮詢紀錄</button></div>`}
      </section>

      <section class="panel" style="margin-top:20px;">
        <div class="row" style="justify-content:space-between;">
          <h2 class="section-title">✦ 抽牌紀錄 ${state.current.drawnCards.length ? `<span class="badge">${state.current.drawnCards.length} 張</span>` : ''}</h2>
          <button class="button btn-outline" id="addCardBtn" ${state.current.drawnCards.length >= 78 ? 'disabled' : ''}>＋ 新增抽牌</button>
        </div>
        <div class="divider"></div>
        <div class="cards">${cardsHtml}</div>
      </section>

      <section style="margin-top:20px;">
        <div class="row">
          <button class="button btn-gold" id="generateBtn" ${state.current.drawnCards.length === 0 || !state.current.questionContent.trim() ? 'disabled' : ''}>🔮 產生解牌</button>
          <button class="button btn-outline" id="saveBtn" ${state.current.customerName.trim() ? '' : 'disabled'}>💾 儲存紀錄</button>
        </div>
        ${state.current.drawnCards.length === 0 ? '<div class="helper" style="margin-top:8px;">* 請先加入至少一張牌卡才能產生解牌</div>' : ''}
      </section>

      <section id="ai-result" class="panel panel-gold" style="margin-top:20px;">
        <h2 class="section-title">✦ 解牌結果</h2>
        <div class="divider"></div>
        <div class="ai-result">${state.current.aiResult ? state.current.aiResult : '<span class="helper">尚未產生解牌。這個靜態版會用模擬內容展示版型，正式版再改回 API 串接。</span>'}</div>
      </section>
    </main>
  `
  bindInputs()
}

render()

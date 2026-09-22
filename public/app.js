const $ = id => document.getElementById(id);
const examples = ['업데이트 정말 좋아요! 덕분에 매일 하던 일이 훨씬 편해졌어요. 감사합니다.', '결제가 두 번 됐어요. 오늘까지 취소해야 하는데 고객센터 연결이 안 됩니다. 지금 바로 확인해 주세요!', '디자인은 정말 마음에 들어요. 그런데 자꾸 멈춰서 쓰기가 불편하네요. 기대했던 만큼 아쉬워요.'];
const emotions = { positive: ['긍정적인 마음', '긍정', '☀'], neutral: ['차분한 마음', '중립', '◌'], negative: ['편치 않은 마음', '부정', '☁'], mixed: ['복잡한 마음', '복합', '◒'], unclear: ['아직은 알기 어려워요', '불분명', '…'] };
const intents = { question: '질문', request: '도움 요청', feedback: '피드백', sharing: '정보 공유', other: '기타 · 불분명' };
let busy = false;
function updateInput() { $('count').textContent = `${$('message').value.length.toLocaleString()} / 2,000`; $('results').hidden = true; $('empty').hidden = false; $('result-mode').textContent = 'READY TO READ'; $('error').hidden = true; }
$('message').addEventListener('input', updateInput);
document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => { $('message').value = examples[Number(button.dataset.example)]; updateInput(); $('message').focus(); }));
function render(data, demo = false) {
  const { emotion, intent, urgent } = data.answers;
  $('empty').hidden = true; $('results').hidden = false;
  $('result-mode').textContent = demo ? 'SAMPLE PREVIEW' : 'ANALYSIS COMPLETE';
  $('result-caption').textContent = demo ? '미리 준비한 예시 결과예요. 실제 API 분석값이 아닙니다.' : '방금 입력한 메시지에서 읽어낸 신호예요.';
  $('emotion-icon').textContent = emotions[emotion.choice][2]; $('emotion-title').textContent = emotions[emotion.choice][0];
  $('confidence').textContent = `확신도 ${Math.round(emotion.confidence * 100)}%`;
  $('distribution').replaceChildren();
  for (const [key, [, label]] of Object.entries(emotions)) {
    const value = Math.round(emotion.probabilities[key] * 100);
    const row = document.createElement('div'); row.className = 'bar-row';
    const name = document.createElement('span'); name.textContent = label;
    const track = document.createElement('div'); track.className = 'bar-track';
    const fill = document.createElement('div'); fill.className = 'bar-fill'; fill.style.width = `${value}%`; track.append(fill);
    const number = document.createElement('b'); number.textContent = `${value}%`; row.append(name, track, number); $('distribution').append(row);
  }
  $('intent').textContent = intents[intent.choice]; $('intent-confidence').textContent = `확신도 ${Math.round(intent.confidence * 100)}%`;
  $('urgency').textContent = `${Math.round(urgent.noul * 100)}%`;
  $('result-meta').textContent = demo ? '고정 예시 · API 호출 없음' : `${data.model} · ${(data.elapsed / 1000).toFixed(2)}초`;
}
$('demo').addEventListener('click', () => {
  if (busy) return;
  $('message').value = examples[0]; updateInput();
  render({ answers: { emotion: { choice: 'positive', confidence: .92, probabilities: { positive: .96, neutral: .02, negative: 0, mixed: .01, unclear: .01 } }, intent: { choice: 'feedback', confidence: .9 }, urgent: { noul: .02 } } }, true);
});
$('form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  if (!$('message').value.trim()) { $('error').textContent = '먼저 읽어볼 문장을 입력해 주세요.'; $('error').hidden = false; $('message').focus(); return; }
  busy = true; $('error').hidden = true; $('results').hidden = true; $('empty').hidden = false;
  $('result-mode').textContent = 'READING…'; $('result-panel').setAttribute('aria-busy', 'true');
  $('submit').textContent = '문장 속 신호를 읽고 있어요…'; $('submit').disabled = true; $('message').disabled = true; $('demo').disabled = true;
  document.querySelectorAll('[data-example]').forEach(b => b.disabled = true);
  try {
    const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: $('message').value }), signal: AbortSignal.timeout(35000) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || '분석에 실패했습니다.'); render(data);
  } catch (error) { $('error').textContent = error.name === 'TimeoutError' ? '응답 시간이 길어지고 있어요. 다시 시도해 주세요.' : error.message; $('error').hidden = false; $('result-mode').textContent = 'TRY AGAIN'; }
  finally { busy = false; $('submit').textContent = '문장 읽어보기 ↗'; $('submit').disabled = false; $('message').disabled = false; $('demo').disabled = false; document.querySelectorAll('[data-example]').forEach(b => b.disabled = false); $('result-panel').setAttribute('aria-busy', 'false'); }
});
fetch('/api/status').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(s => { $('connection').textContent = s.configured ? '● API 키 설정됨' : '○ API 키 설정이 필요해요'; $('setup').hidden = s.configured; }).catch(() => { $('connection').textContent = '서버 연결을 확인해 주세요'; });

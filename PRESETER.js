(() => {
  if (window.__ytStudioReverb) {
    window.__ytStudioReverb.toggleUI();
    return;
  }

  const video = document.querySelector('video');
  if (!video) return alert('Nenhum vídeo encontrado.');

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  const source = ctx.createMediaElementSource(video);

  const dryGain = ctx.createGain();
  const wetGain = ctx.createGain();
  const convolver = ctx.createConvolver();

  const highPass = ctx.createBiquadFilter();
  highPass.type = 'highpass';

  const lowPass = ctx.createBiquadFilter();
  lowPass.type = 'lowpass';

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -2.0;
  limiter.knee.value = 6.0;
  limiter.ratio.value = 12.0;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.15;

  source.connect(dryGain);
  dryGain.connect(limiter);

  source.connect(highPass);
  highPass.connect(convolver);
  convolver.connect(lowPass);
  lowPass.connect(wetGain);
  wetGain.connect(limiter);
  limiter.connect(ctx.destination);

  function createStudioIR(dur, decay, preDelayMs, lpFreq, hpFreq) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * dur);
    const preSamples = Math.floor((preDelayMs / 1000) * rate);
    const impulse = ctx.createBuffer(2, len, rate);

    highPass.frequency.setTargetAtTime(hpFreq, ctx.currentTime, 0.02);
    lowPass.frequency.setTargetAtTime(lpFreq, ctx.currentTime, 0.02);

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        if (i < preSamples) { data[i] = 0; continue; }
        const t = (i - preSamples) / (len - preSamples);
        const env = Math.pow(1 - t, decay);
        const early = i < preSamples + rate * 0.04 ? 1.35 : 1.0;
        data[i] = (Math.random() * 2 - 1) * env * early * 0.6;
      }
    }
    return impulse;
  }

  const PRESETS = {
    bypass: { name: 'Bypass (Original)', dur: 0.1, decay: 1, pre: 0, lp: 20000, hp: 20, mix: 0 },
    vocalBooth: { name: 'Vocal Booth (Íntimo)', dur: 0.85, decay: 3.2, pre: 12, lp: 7500, hp: 180, mix: 0.22 },
    studioPlate: { name: 'EMT 140 Plate (Clássico)', dur: 1.8, decay: 2.6, pre: 20, lp: 8500, hp: 140, mix: 0.30 },
    warmRoom: { name: 'Warm Studio Room', dur: 1.3, decay: 2.8, pre: 18, lp: 5200, hp: 150, mix: 0.28 },
    concertHall: { name: 'Symphony Hall', dur: 3.2, decay: 2.2, pre: 42, lp: 4800, hp: 110, mix: 0.38 },
    ambientSpace: { name: 'Deep Space / Slowed', dur: 5.0, decay: 1.8, pre: 55, lp: 4000, hp: 100, mix: 0.52 }
  };

  function applyMix(val) {
    const m = parseFloat(val);
    dryGain.gain.setTargetAtTime(Math.cos(m * 0.5 * Math.PI), ctx.currentTime, 0.02);
    wetGain.gain.setTargetAtTime(Math.sin(m * 0.5 * Math.PI), ctx.currentTime, 0.02);
  }

  // UI sem innerHTML (100% compatível com TrustedTypes do YouTube)
  const el = (tag, css, text) => {
    const node = document.createElement(tag);
    if (css) node.style.cssText = css;
    if (text) node.textContent = text;
    return node;
  };

  const panel = el('div', 'position:fixed;top:75px;right:20px;z-index:999999;background:rgba(18,18,22,0.95);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.18);border-radius:12px;padding:14px 16px;width:240px;color:#f1f1f1;font-family:sans-serif;box-shadow:0 12px 32px rgba(0,0,0,0.6);font-size:13px;');

  const header = el('div', 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:8px;');
  header.appendChild(el('strong', 'color:#3ea6ff;letter-spacing:0.4px;', 'STUDIO REVERB PRO'));
  const closeBtn = el('button', 'background:none;border:none;color:#aaa;cursor:pointer;font-size:15px;', '✕');
  closeBtn.onclick = () => panel.style.display = 'none';
  header.appendChild(closeBtn);
  panel.appendChild(header);

  panel.appendChild(el('div', 'font-size:11px;color:#aaa;margin-bottom:4px;', 'PRESET DE ESTÚDIO'));
  const select = el('select', 'width:100%;padding:6px 8px;border-radius:6px;background:#25252b;color:#fff;border:1px solid #3f3f46;margin-bottom:12px;outline:none;cursor:pointer;');
  Object.entries(PRESETS).forEach(([k, v]) => {
    const opt = el('option', '', v.name);
    opt.value = k;
    if (k === 'studioPlate') opt.selected = true;
    select.appendChild(opt);
  });
  panel.appendChild(select);

  const mixRow = el('div', 'display:flex;justify-content:space-between;font-size:11px;color:#aaa;margin-bottom:4px;');
  mixRow.appendChild(el('span', '', 'DRY / WET (MIX)'));
  const mixVal = el('span', 'color:#fff;font-weight:bold;', '30%');
  mixRow.appendChild(mixVal);
  panel.appendChild(mixRow);

  const mixSlider = el('input', 'width:100%;accent-color:#3ea6ff;cursor:pointer;margin-bottom:12px;');
  mixSlider.type = 'range'; mixSlider.min = '0'; mixSlider.max = '1'; mixSlider.step = '0.01'; mixSlider.value = '0.30';
  panel.appendChild(mixSlider);

  const spdRow = el('div', 'display:flex;justify-content:space-between;font-size:11px;color:#aaa;margin-bottom:4px;');
  spdRow.appendChild(el('span', '', 'VELOCIDADE (SLOWED)'));
  const spdVal = el('span', 'color:#fff;font-weight:bold;', '1.00x');
  spdRow.appendChild(spdVal);
  panel.appendChild(spdRow);

  const spdSlider = el('input', 'width:100%;accent-color:#3ea6ff;cursor:pointer;');
  spdSlider.type = 'range'; spdSlider.min = '0.75'; spdSlider.max = '1.15'; spdSlider.step = '0.01'; spdSlider.value = '1.00';
  panel.appendChild(spdSlider);

  document.body.appendChild(panel);

  function loadPreset(key) {
    if (ctx.state === 'suspended') ctx.resume();
    const p = PRESETS[key];
    convolver.buffer = createStudioIR(p.dur, p.decay, p.pre, p.lp, p.hp);
    applyMix(p.mix);
    mixSlider.value = p.mix;
    mixVal.textContent = `${Math.round(p.mix * 100)}%`;
  }

  select.onchange = (e) => loadPreset(e.target.value);
  mixSlider.oninput = (e) => {
    applyMix(e.target.value);
    mixVal.textContent = `${Math.round(e.target.value * 100)}%`;
  };
  spdSlider.oninput = (e) => {
    const r = parseFloat(e.target.value);
    video.preservesPitch = false;
    video.playbackRate = r;
    spdVal.textContent = `${r.toFixed(2)}x`;
  };

  video.addEventListener('play', () => { if (ctx.state === 'suspended') ctx.resume(); });
  loadPreset('studioPlate');

  window.__ytStudioReverb = {
    toggleUI: () => { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; }
  };
})();

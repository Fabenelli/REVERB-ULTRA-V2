(async function hyperStudio3DReverbEngine() {
    const videoElement = document.querySelector('video');
    if (!videoElement) {
        console.error("❌ Abra o vídeo do YouTube antes de colar!");
        return;
    }

    if (window.meuEstudioAudioCtx) {
        window.meuEstudioAudioCtx.close();
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    window.meuEstudioAudioCtx = ctx;

    const source = ctx.createMediaElementSource(videoElement);

    // --- MESA DE SOM ANALÓGICA (EQ PARAMÉTRICO) ---
    const criarFiltro = (tipo, freq, ganho = 0, q = 1) => {
        const f = ctx.createBiquadFilter();
        f.type = tipo; f.frequency.value = freq; f.Q.value = q; f.gain.value = ganho;
        return f;
    };
    const subBass = criarFiltro('lowshelf', 50);    
    const bass = criarFiltro('peaking', 140);       
    const midLow = criarFiltro('peaking', 480);     
    const midHigh = criarFiltro('peaking', 2800);   
    const air = criarFiltro('highshelf', 12000);    

    // --- MOTOR DE REVERB TRIDIMENSIONAL ESPACIAL ---
    const reverbNode = ctx.createConvolver();
    const dryGain = ctx.createGain(); 
    const wetGain = ctx.createGain(); 
    const preDelayNode = ctx.createDelay(); // Evita que o reverb "abfefe" a voz inicial

    // --- LIMITADOR MASTER COMPRESSOR ---
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -0.5;
    limiter.knee.value = 8;
    limiter.ratio.value = 20; // Hard Limiting (Som no talo sem estourar)
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;

    // ALGORITMO ACÚSTICO AVANÇADO: Simula propagação de ondas e cancelamento de fase física
    function gerarImpulsoEspacial(duracao, decaimento, preDelay, modulação) {
        const rate = ctx.sampleRate;
        const totalAmostras = rate * duracao;
        const buffer = ctx.createBuffer(2, totalAmostras, rate);
        
        preDelayNode.delayTime.value = preDelay / 1000; // Converte ms para segundos

        for (let canal = 0; canal < 2; canal++) {
            const dados = buffer.getChannelData(canal);
            const inversaoFase = canal === 1 ? -1 : 1;
            
            for (let i = 0; i < totalAmostras; i++) {
                const tempo = i / rate;
                // Ruído fractal combinado com ondas senoidais para simular o eco rebatendo em superfícies tridimensionais
                const ruidoTextura = (Math.random() * 2 - 1) * Math.sin(i * modulação);
                const reflexaoTardia = Math.sin(tempo * 200 * inversaoFase) * 0.2;
                
                // Decaimento exponencial puríssimo
                dados[i] = (ruidoTextura + reflexaoTardia) * Math.pow(1 - i / totalAmostras, decaimento);
            }
        }
        return buffer;
    }

    // --- ROTEAMENTO DOS CABOS DE ÁUDIO ---
    source.connect(subBass);
    subBass.connect(bass);
    bass.connect(midLow);
    midLow.connect(midHigh);
    midHigh.connect(air);

    // Divisão do sinal
    air.connect(dryGain); // Canal Limpo
    
    // Canal Espacial (Passa pelo Pre-Delay antes de ir pro Reverb para manter a clareza)
    air.connect(preDelayNode);
    preDelayNode.connect(reverbNode);
    reverbNode.connect(wetGain);

    // Mixer final
    dryGain.connect(limiter);
    wetGain.connect(limiter);
    limiter.connect(ctx.destination);

    // --- OS PRESETS MAIS ABSURDOS ---
    const PRESETS = {
        lexicon: {
            nome: "🌌 Lexicon Hall (O Reverb Lendário dos Anos 80)",
            eq: { sub: 4, bass: 2, midL: -1, midH: 3, air: 4.5 },
            reverb: { duracao: 4.2, decaimento: 2.5, preDelay: 35, mod: 0.08, volume: 0.32 },
            dry: 0.90
        },
        cyberpunk: {
            nome: "☄️ Blade Runner Space (Imensidão Infinita / Sci-Fi)",
            eq: { sub: 6, bass: 3, midL: 0, midH: 4, air: 5 },
            reverb: { duracao: 8.5, decaimento: 1.8, preDelay: 50, mod: 0.03, volume: 0.40 },
            dry: 0.80
        },
        cathedral: {
            nome: "🏛️ Gothic Cathedral (Eco Gigante de Igreja)",
            eq: { sub: 2, bass: 1, midL: 2, midH: 2.5, air: 3 },
            reverb: { duracao: 6.0, decaimento: 3.2, preDelay: 45, mod: 0.05, volume: 0.35 },
            dry: 0.85
        },
        cyberclub: {
            nome: "👽 Rave Sub-Underground (Grave + Eco de Galpão)",
            eq: { sub: 9, bass: 4.5, midL: -3, midH: 1, air: 2 },
            reverb: { duracao: 2.5, decaimento: 4.0, preDelay: 20, mod: 0.12, volume: 0.22 },
            dry: 1.0
        },
        bypass: {
            nome: "❌ Desativar Tudo (Áudio Padrão)",
            eq: { sub: 0, bass: 0, midL: 0, midH: 0, air: 0 },
            reverb: { duracao: 0.1, decaimento: 1.0, preDelay: 0, mod: 0.1, volume: 0.0 },
            dry: 1.0
        }
    };

    window.aplicarPreset = function(id) {
        const p = PRESETS[id];
        if (!p) return;

        subBass.gain.value = p.eq.sub;
        bass.gain.value = p.eq.bass;
        midLow.gain.value = p.eq.midL;
        midHigh.gain.value = p.eq.midH;
        air.gain.value = p.eq.air;

        reverbNode.buffer = gerarImpulsoEspacial(p.reverb.duracao, p.reverb.decaimento, p.reverb.preDelay, p.reverb.mod);
        wetGain.gain.value = p.reverb.volume;
        dryGain.gain.value = p.dry;

        console.log(`%c 🔥 [HYPER REVERB] Ativo: ${p.nome} `, "background: #000; color: #ff0055; font-weight: bold; font-size: 12px; padding: 5px;");
        atualizarUI(id);
    };

    // --- INTERFACE ESTILO CYBERPUNK (100% SEGURA) ---
    const painel = document.createElement('div');
    painel.id = 'hyper-rack-ui';
    painel.style.cssText = 'position:fixed; top:80px; right:25px; z-index:999999; background:rgba(5,5,5,0.98); padding:18px; border-radius:12px; border:2px solid #ff0055; color:#fff; font-family: monospace; box-shadow:0 0 20px rgba(255,0,85,0.4); width:260px;';

    const header = document.createElement('div');
    header.textContent = '⚡ NEURAL REVERB ENGINE v2.0';
    header.style.cssText = 'margin:0 0 15px 0; text-align:center; color:#ff0055; font-size:11px; font-weight:bold; letter-spacing:1px; border-bottom:1px dashed #333; padding-bottom:8px;';
    painel.appendChild(header);

    Object.keys(PRESETS).forEach(key => {
        const btn = document.createElement('button');
        btn.id = `hr-btn-${key}`;
        btn.textContent = PRESETS[key].nome;
        btn.style.cssText = 'width:100%; margin:6px 0; padding:12px; border:none; background:#111; color:#aaa; border-radius:6px; cursor:pointer; font-weight:bold; text-align:left; font-size:10px; font-family:monospace; border-left:3px solid #333; transition: 0.1s;';
        
        btn.onclick = () => window.aplicarPreset(key);
        painel.appendChild(btn);
    });

    function atualizarUI(ativoKey) {
        Object.keys(PRESETS).forEach(key => {
            const el = document.getElementById(`hr-btn-${key}`);
            if (el) {
                if (key === ativoKey) {
                    el.style.background = '#ff0055';
                    el.style.color = '#fff';
                    el.style.borderLeft = '3px solid #fff';
                } else {
                    el.style.background = '#111';
                    el.style.color = '#aaa';
                    el.style.borderLeft = '3px solid #333';
                }
            }
        });
    }

    const fechar = document.createElement('div');
    fechar.textContent = '[X]';
    fechar.style.cssText = 'position:absolute; top:6px; right:10px; cursor:pointer; color:#555; font-size:10px;';
    fechar.onclick = () => painel.remove();
    painel.appendChild(fechar);

    document.body.appendChild(painel);
    window.aplicarPreset('lexicon');
})();

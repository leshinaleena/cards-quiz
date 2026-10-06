import { icons, chipSVG } from './icons.js?v=20261006b';

const DEFAULT_EDGE = ['#F3D3BE', '#B98670'];
const ICON_ORDER = ['pay', 'booking', 'apps', 'currency', 'remote', 'plane', 'fast'];

// Тонкий гильоширный узор на лицевой стороне карты
const pattern = `<svg class="tc__pattern" viewBox="0 0 320 200" preserveAspectRatio="none" aria-hidden="true">
  <g fill="none" stroke="currentColor" stroke-width=".6">
    ${Array.from({ length: 9 }, (_, i) => `<ellipse cx="300" cy="210" rx="${70 + i * 26}" ry="${46 + i * 19}"/>`).join('')}
  </g></svg>`;

// tone: wine | petrol | sand — три фирменных исполнения карты
export function cardFaceHTML({ letter = '', edge = DEFAULT_EDGE, labels = '', tone = 'wine' } = {}) {
  return `
    <div class="tc__face tc__front" data-tone="${tone}" style="--edge-a:${edge[0]};--edge-b:${edge[1]}">
      ${pattern}
      <div class="tc__top">
        <span class="tc__brand">TOP RIDERS</span>
        <span class="tc__nfc">${icons.nfc}</span>
      </div>
      <div class="tc__mid">
        <span class="tc__chip">${chipSVG()}</span>
        <span class="tc__icons"></span>
      </div>
      <div class="tc__bottom">
        <div>
          <div class="tc__labels">${labels}</div>
          <div class="tc__title">TRAVEL CARD</div>
        </div>
        <span class="tc__num">${letter ? `<b>${letter}</b>` : '•••• ••••'}</span>
      </div>
      ${letter ? `<span class="tc__letter" aria-hidden="true">${letter}</span>` : ''}
      <span class="tc__glare"></span>
    </div>`;
}

export class TravelCard {
  constructor({ reduced }) {
    this.reduced = reduced;
    this.state = { edge: DEFAULT_EDGE, labels: [], icons: [], tone: 'wine' };
    this.target = { rx: 0, ry: 0 };
    this.cur = { rx: 0, ry: 0 };

    const el = document.createElement('div');
    el.className = 'tc';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="tc__float">
        <div class="tc__tilt">
          <div class="tc__spin">
            ${cardFaceHTML()}
            <div class="tc__face tc__back" data-tone="wine">
              <span class="tc__stripe"></span>
              <span class="tc__sign"></span>
              <span class="tc__backtext">TOP RIDERS · TRAVEL</span>
            </div>
          </div>
        </div>
      </div>`;
    this.el = el;
    this.front = el.querySelector('.tc__front');
    this.tilt = el.querySelector('.tc__tilt');
    this.spinEl = el.querySelector('.tc__spin');
    this.iconsEl = el.querySelector('.tc__icons');
    this.labelsEl = el.querySelector('.tc__labels');
    this.back = el.querySelector('.tc__back');

    if (!reduced) this.#startTilt();
  }

  // ---- Наклон за курсором / гироскопом ----
  #startTilt() {
    const onPointer = (e) => {
      if (e.pointerType === 'touch') return;
      const r = this.el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      this.target.ry = Math.max(-1, Math.min(1, dx * 2)) * 16;
      this.target.rx = Math.max(-1, Math.min(1, dy * 2)) * -12;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerleave', () => { this.target = { rx: 0, ry: 0 }; });

    // Android и браузеры без запроса разрешения; на iOS без системного окна работает плавное парение
    let base = null;
    window.addEventListener('deviceorientation', (e) => {
      if (e.beta == null || e.gamma == null) return;
      if (base === null) base = e.beta;
      this.target.ry = Math.max(-1, Math.min(1, e.gamma / 30)) * 14;
      this.target.rx = Math.max(-1, Math.min(1, (e.beta - base) / 30)) * -10;
    }, { passive: true });

    const loop = () => {
      this.cur.rx += (this.target.rx - this.cur.rx) * 0.08;
      this.cur.ry += (this.target.ry - this.cur.ry) * 0.08;
      if (!document.hidden) {
        this.tilt.style.setProperty('--rx', `${this.cur.rx.toFixed(2)}deg`);
        this.tilt.style.setProperty('--ry', `${this.cur.ry.toFixed(2)}deg`);
        this.tilt.style.setProperty('--gx', `${(50 + this.cur.ry * 2.5).toFixed(1)}%`);
        this.tilt.style.setProperty('--gy', `${(50 - this.cur.rx * 3).toFixed(1)}%`);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ---- Перемещение между слотами (FLIP) ----
  // mutate() выполняется между замерами: например, переключение экрана
  moveTo(slot, { animate = true, mutate } = {}) {
    const first = this.el.isConnected ? this.el.getBoundingClientRect() : null;
    mutate?.();
    slot.appendChild(this.el);
    if (!animate || !first || !first.width) return;
    const last = this.el.getBoundingClientRect();
    if (this.reduced) {
      this.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'ease-out' });
      return;
    }
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    const s = first.width / last.width;
    this.el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${s})` },
        { transform: 'translate(0, 0) scale(1)' },
      ],
      { duration: 900, easing: 'cubic-bezier(.2,.75,.15,1)' }
    );
  }

  // ---- Реакция на ответы ----
  // state: { edge: [a, b], labels: [], icons: [] }
  apply(state, { spin = false } = {}) {
    const run = () => this.#render(state);
    if (!spin) return run();
    if (this.reduced) {
      this.spinEl.animate([{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 500 });
      setTimeout(run, 250);
      return;
    }
    // Полный оборот: пока видна обратная сторона, меняем кант и надписи
    this.spinEl.animate(
      [
        { transform: 'rotateY(0deg) translateZ(0)' },
        { transform: 'rotateY(180deg) translateZ(20px)', offset: 0.5 },
        { transform: 'rotateY(360deg) translateZ(0)' },
      ],
      { duration: 950, easing: 'cubic-bezier(.45,.05,.25,1)' }
    );
    setTimeout(run, 470);
  }

  nod() {
    if (this.reduced) return;
    this.spinEl.animate(
      [{ transform: 'rotateX(0)' }, { transform: 'rotateX(14deg)' }, { transform: 'rotateX(0)' }],
      { duration: 500, easing: 'ease-out' }
    );
  }

  #render(state) {
    const edge = state.edge || DEFAULT_EDGE;
    this.front.dataset.tone = state.tone || 'wine';
    this.back.dataset.tone = state.tone || 'wine';
    this.front.style.setProperty('--edge-a', edge[0]);
    this.front.style.setProperty('--edge-b', edge[1]);

    this.labelsEl.textContent = (state.labels || []).join(' · ');

    const want = ICON_ORDER.filter((n) => (state.icons || []).includes(n));
    // удаляем лишние
    this.iconsEl.querySelectorAll('[data-icon]').forEach((node) => {
      if (!want.includes(node.dataset.icon)) {
        if (this.reduced) return node.remove();
        node.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.4)' }], { duration: 220 })
          .finished.then(() => node.remove());
        node.dataset.icon = '';
      }
    });
    // добавляем новые в нужном порядке
    want.forEach((name, i) => {
      let node = this.iconsEl.querySelector(`[data-icon="${name}"]`);
      if (!node) {
        node = document.createElement('span');
        node.className = 'tc__icon';
        node.dataset.icon = name;
        node.innerHTML = icons[name] || '';
        node.animate(
          this.reduced
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ opacity: 0, transform: 'scale(.3) translateY(40%)' }, { opacity: 1, transform: 'scale(1.15)' , offset: .7 }, { opacity: 1, transform: 'scale(1)' }],
          { duration: 420, delay: i * 30, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'backwards' }
        );
      }
      this.iconsEl.appendChild(node);
    });
  }
}

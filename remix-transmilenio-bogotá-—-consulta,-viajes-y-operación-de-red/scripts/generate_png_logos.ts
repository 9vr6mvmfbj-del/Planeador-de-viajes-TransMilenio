import fs from 'node:fs';
import path from 'node:path';

const logosDir = path.resolve('public/logos');
fs.mkdirSync(logosDir, { recursive: true });

// 1. Official Bogota + TransMilenio Combined Header Emblem (SVG source for rasterizing to PNG)
export const bogotaTransmiHeaderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="140" viewBox="0 0 680 140">
  <defs>
    <linearGradient id="shieldBlue" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#003893"/>
      <stop offset="100%" stop-color="#00235E"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFE047"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
    <linearGradient id="tmRed" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#E30613"/>
      <stop offset="100%" stop-color="#B9050F"/>
    </linearGradient>
  </defs>

  <!-- Escudo Alcaldia Mayor de Bogota -->
  <g transform="translate(12, 12)">
    <!-- Outer Blue Shield -->
    <path d="M10,6 Q48,12 86,6 L86,62 C86,92 48,108 48,112 C48,108 10,92 10,62 Z" fill="url(#shieldBlue)" stroke="#FACC15" stroke-width="2.5"/>
    <!-- Decorative gold border pomegranates -->
    <circle cx="20" cy="18" r="3" fill="#FACC15"/>
    <circle cx="48" cy="15" r="3" fill="#FACC15"/>
    <circle cx="76" cy="18" r="3" fill="#FACC15"/>
    <circle cx="19" cy="42" r="3" fill="#FACC15"/>
    <circle cx="77" cy="42" r="3" fill="#FACC15"/>
    <circle cx="24" cy="70" r="3" fill="#FACC15"/>
    <circle cx="72" cy="70" r="3" fill="#FACC15"/>
    <circle cx="48" cy="96" r="3" fill="#FACC15"/>
    <!-- Inner Gold Shield -->
    <path d="M25,24 L71,24 L71,58 C71,76 48,86 48,89 C48,86 25,76 25,58 Z" fill="url(#goldGrad)" stroke="#111827" stroke-width="1.5"/>
    <!-- Black Rampant Eagle -->
    <path d="M48,29 L43,34 L46,37 L38,44 L29,38 L31,52 L41,54 L39,68 L33,73 L43,72 L48,65 L53,72 L63,73 L57,68 L55,54 L65,52 L67,38 L58,44 L50,37 L53,34 Z" fill="#0F172A"/>
    <!-- Crown on Eagle -->
    <polygon points="44,29 46,25 48,28 50,25 52,29" fill="#0F172A"/>
    <!-- Red Pomegranates held in claws -->
    <circle cx="35" cy="64" r="3.5" fill="#E30613"/>
    <circle cx="61" cy="64" r="3.5" fill="#E30613"/>
  </g>

  <!-- BOGOTA wordmark + 3 Golden Stars (Matching Image 3) -->
  <g transform="translate(118, 16)">
    <!-- 3 Stars above A -->
    <!-- Small Left Star -->
    <polygon points="212,26 215,33 223,34 217,39 219,47 212,43 205,47 207,39 201,34 209,33" fill="#F59E0B"/>
    <!-- Large Center Star -->
    <polygon points="246,2 254,18 272,19 258,31 263,48 247,39 231,48 236,31 222,19 240,18" fill="#F59E0B"/>
    <!-- Small Top Right Star -->
    <polygon points="274,0 277,6 284,7 278,12 280,18 274,14 268,18 270,12 264,7 271,6" fill="#F59E0B"/>

    <!-- BOGOT Letters -->
    <text x="0" y="92" font-family="'Outfit', 'Arial Black', sans-serif" font-weight="900" font-size="60" fill="#E30613" letter-spacing="-1">BOGOT</text>
    <!-- Stylized A with diagonal leg -->
    <path d="M214,92 L236,42 L252,42 L278,104 L261,104 L243,58 L228,92 Z" fill="#E30613"/>
    <text x="2" y="112" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-weight="700" font-size="11.5" fill="#CBD5E1" letter-spacing="2.5">ALCALDIA MAYOR DE BOGOTA D.C.</text>
  </g>

  <!-- Vertical Separator -->
  <line x1="422" y1="20" x2="422" y2="120" stroke="#334155" stroke-width="2.5"/>

  <!-- Official TransMilenio T Square Emblem (Matching Image 1) -->
  <g transform="translate(442, 14)">
    <rect x="6" y="4" width="96" height="96" rx="6" fill="#05070B" stroke="#FACC15" stroke-width="1.5"/>
    <!-- Sweeping Yellow Top Bar of T -->
    <path d="M0,26 L108,10 L98,32 L0,26 Z" fill="#FFEE00" stroke="#05070B" stroke-width="1"/>
    <!-- Dynamic Yellow Vertical Oval Stem of T -->
    <ellipse cx="56" cy="56" rx="5.5" ry="26" transform="rotate(14 56 56)" fill="#FFEE00"/>
    <!-- TRANSMILENIO condensed bottom text -->
    <text x="54" y="94" text-anchor="middle" font-family="'Outfit', 'Arial Narrow', sans-serif" font-weight="700" font-size="10.5" fill="#FFFFFF" letter-spacing="1.6">TRANSMILENIO</text>
  </g>

  <!-- Label Right -->
  <g transform="translate(558, 42)">
    <text x="0" y="20" font-family="'Outfit', sans-serif" font-weight="800" font-size="22" fill="#FFFFFF" letter-spacing="0.5">SISTEMA</text>
    <text x="0" y="44" font-family="'Outfit', sans-serif" font-weight="800" font-size="22" fill="#E30613" letter-spacing="0.5">TRONCAL</text>
    <text x="0" y="62" font-family="'JetBrains Mono', monospace" font-weight="600" font-size="11" fill="#FACC15" letter-spacing="1.2">BOGOTA D.C.</text>
  </g>
</svg>`;

// 2. Realistic Side-Profile Articulated Red TransMilenio Bus (Matching Image 1)
export const transmiBusRealSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="220" viewBox="0 0 920 220">
  <defs>
    <linearGradient id="busBodyRed" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#EF1A25"/>
      <stop offset="55%" stop-color="#D90410"/>
      <stop offset="100%" stop-color="#9E020B"/>
    </linearGradient>
    <linearGradient id="windowGlass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#BAE6FD"/>
      <stop offset="45%" stop-color="#E0F2FE"/>
      <stop offset="100%" stop-color="#7DD3FC"/>
    </linearGradient>
    <linearGradient id="bellowsGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#4B5563"/>
      <stop offset="25%" stop-color="#6B7280"/>
      <stop offset="50%" stop-color="#374151"/>
      <stop offset="75%" stop-color="#6B7280"/>
      <stop offset="100%" stop-color="#4B5563"/>
    </linearGradient>
  </defs>

  <!-- Subtle Ground Shadow -->
  <ellipse cx="460" cy="198" rx="430" ry="10" fill="rgba(0,0,0,0.55)"/>

  <!-- Roof AC Units -->
  <rect x="75" y="22" width="18" height="8" rx="2" fill="#D90410"/>
  <rect x="130" y="22" width="24" height="8" rx="2" fill="#D90410"/>
  <rect x="215" y="22" width="18" height="8" rx="2" fill="#D90410"/>
  <rect x="295" y="22" width="22" height="8" rx="2" fill="#D90410"/>
  <rect x="520" y="22" width="140" height="8" rx="4" fill="#E30613"/>

  <!-- Rear Coach Body (Left) -->
  <path d="M24,34 Q24,28 32,28 L390,28 L390,174 L42,174 L24,162 Z" fill="url(#busBodyRed)" stroke="#7F1D1D" stroke-width="1.5"/>

  <!-- Center Articulated Accordion Joint (Bellows) -->
  <g transform="translate(388, 25)">
    <rect x="0" y="0" width="84" height="151" fill="url(#bellowsGrad)" stroke="#1F2937" stroke-width="1.5"/>
    <!-- Vertical Accordion Folds -->
    <line x1="12" y1="2" x2="12" y2="149" stroke="#1F2937" stroke-width="2"/>
    <line x1="24" y1="2" x2="24" y2="149" stroke="#1F2937" stroke-width="2"/>
    <line x1="36" y1="2" x2="36" y2="149" stroke="#1F2937" stroke-width="2"/>
    <line x1="42" y1="0" x2="42" y2="151" stroke="#111827" stroke-width="3"/>
    <line x1="54" y1="2" x2="54" y2="149" stroke="#1F2937" stroke-width="2"/>
    <line x1="66" y1="2" x2="66" y2="149" stroke="#1F2937" stroke-width="2"/>
    <line x1="76" y1="2" x2="76" y2="149" stroke="#1F2937" stroke-width="2"/>
  </g>

  <!-- Front Coach Body (Right) -->
  <path d="M470,28 L862,28 Q882,28 890,54 L898,148 Q898,172 880,174 L470,174 Z" fill="url(#busBodyRed)" stroke="#7F1D1D" stroke-width="1.5"/>

  <!-- Continuous Dark Window Belt Frame -->
  <rect x="34" y="42" width="352" height="66" rx="3" fill="#18181B"/>
  <rect x="474" y="42" width="380" height="66" rx="3" fill="#18181B"/>

  <!-- Rear Coach Windows -->
  <rect x="40" y="48" width="24" height="54" rx="2" fill="url(#windowGlass)"/>
  <rect x="72" y="52" width="36" height="50" rx="2" fill="url(#windowGlass)"/>
  <!-- Transom sliding windows + main glass -->
  <rect x="118" y="48" width="48" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="118" y="63" width="48" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="172" y="48" width="52" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="172" y="63" width="52" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="230" y="48" width="52" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="230" y="63" width="52" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="288" y="48" width="48" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="288" y="63" width="48" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="342" y="48" width="38" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="342" y="63" width="38" height="39" rx="1" fill="url(#windowGlass)"/>

  <!-- Front Coach Windows -->
  <rect x="478" y="48" width="18" height="54" rx="1" fill="url(#windowGlass)"/>
  <rect x="504" y="48" width="62" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="504" y="63" width="62" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="572" y="48" width="62" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="572" y="63" width="62" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="640" y="48" width="62" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="640" y="63" width="62" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="708" y="48" width="62" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="708" y="63" width="62" height="39" rx="1" fill="url(#windowGlass)"/>
  <rect x="776" y="48" width="70" height="12" rx="1" fill="#E0F2FE"/>
  <rect x="776" y="63" width="70" height="39" rx="1" fill="url(#windowGlass)"/>

  <!-- Driver Front Door & Windshield (Right) -->
  <path d="M858,50 L884,54 L890,126 L858,122 Z" fill="url(#windowGlass)" stroke="#18181B" stroke-width="3"/>
  <!-- Side Mirror -->
  <path d="M884,52 L904,58 L902,82 L896,82 L898,62 L884,57 Z" fill="#9CA3AF"/>

  <!-- Iconic Yellow Longitudinal Stripe -->
  <rect x="26" y="140" width="362" height="5" fill="#FFEE00"/>
  <rect x="472" y="140" width="408" height="5" fill="#FFEE00"/>

  <!-- TransMilenio T Mini Logos on Coach Sides -->
  <g transform="translate(132, 115)">
    <rect x="0" y="0" width="22" height="20" fill="#090D16"/>
    <path d="M-2,5 L24,2 L21,7 L-2,5 Z" fill="#FFEE00"/>
    <ellipse cx="11" cy="12" rx="1.6" ry="5.5" transform="rotate(14 11 12)" fill="#FFEE00"/>
  </g>
  <g transform="translate(508, 115)">
    <rect x="0" y="0" width="22" height="20" fill="#090D16"/>
    <path d="M-2,5 L24,2 L21,7 L-2,5 Z" fill="#FFEE00"/>
    <ellipse cx="11" cy="12" rx="1.6" ry="5.5" transform="rotate(14 11 12)" fill="#FFEE00"/>
  </g>

  <!-- White "TransMilenio" Side Branding -->
  <text x="646" y="131" font-family="'Outfit', sans-serif" font-weight="800" font-size="21" fill="#FFFFFF" letter-spacing="1.2">TransMilenio</text>

  <!-- Vehicle Plate -->
  <rect x="352" y="116" width="26" height="14" rx="1.5" fill="#F8FAFC" stroke="#1E293B" stroke-width="1"/>
  <text x="365" y="126" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-weight="700" font-size="7" fill="#0F172A">TM-2026</text>

  <!-- Headlights & Taillights -->
  <ellipse cx="892" cy="156" rx="4" ry="5" fill="#FEF08A"/>
  <circle cx="30" cy="140" r="3" fill="#FACC15"/>
  <circle cx="30" cy="152" r="3" fill="#EF4444"/>

  <!-- 3 Heavy-Duty BRT Wheels (Rear, Center-Axle, Front) -->
  <!-- Wheel 1 (Rear) -->
  <g transform="translate(198, 168)">
    <circle cx="0" cy="0" r="28" fill="#1E293B"/>
    <circle cx="0" cy="0" r="25" fill="#334155" stroke="#0F172A" stroke-width="3"/>
    <circle cx="0" cy="0" r="15" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2.5"/>
    <circle cx="0" cy="0" r="9" fill="#E2E8F0" stroke="#64748B" stroke-width="1.5" stroke-dasharray="3 2"/>
  </g>

  <!-- Wheel 2 (Middle) -->
  <g transform="translate(566, 168)">
    <circle cx="0" cy="0" r="28" fill="#1E293B"/>
    <circle cx="0" cy="0" r="25" fill="#334155" stroke="#0F172A" stroke-width="3"/>
    <circle cx="0" cy="0" r="15" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2.5"/>
    <circle cx="0" cy="0" r="9" fill="#E2E8F0" stroke="#64748B" stroke-width="1.5" stroke-dasharray="3 2"/>
  </g>

  <!-- Wheel 3 (Front) -->
  <g transform="translate(808, 168)">
    <circle cx="0" cy="0" r="28" fill="#1E293B"/>
    <circle cx="0" cy="0" r="25" fill="#334155" stroke="#0F172A" stroke-width="3"/>
    <circle cx="0" cy="0" r="15" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2.5"/>
    <circle cx="0" cy="0" r="9" fill="#E2E8F0" stroke="#64748B" stroke-width="1.5" stroke-dasharray="3 2"/>
  </g>
</svg>`;

// 3. Pure Red-and-White Articulated TransMilenio Bus for Action Buttons ("solo de rojo con blanco")
export const transmiBusRedWhiteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="84" viewBox="0 0 320 84">
  <!-- Rear Coach (Red with White Details) -->
  <rect x="8" y="12" width="126" height="50" rx="5" fill="#E30613" stroke="#FFFFFF" stroke-width="2.5"/>
  <!-- Accordion Joint (White & Red Stripes) -->
  <rect x="134" y="13" width="28" height="48" fill="#FFFFFF" stroke="#E30613" stroke-width="2"/>
  <line x1="141" y1="14" x2="141" y2="60" stroke="#E30613" stroke-width="2"/>
  <line x1="148" y1="14" x2="148" y2="60" stroke="#E30613" stroke-width="2"/>
  <line x1="155" y1="14" x2="155" y2="60" stroke="#E30613" stroke-width="2"/>
  <!-- Front Coach (Red with White Details) -->
  <path d="M162,12 L296,12 Q308,12 311,26 L313,54 Q313,62 303,62 L162,62 Z" fill="#E30613" stroke="#FFFFFF" stroke-width="2.5"/>
  <!-- White Windows Rear -->
  <rect x="16" y="19" width="22" height="19" rx="2" fill="#FFFFFF"/>
  <rect x="43" y="19" width="26" height="19" rx="2" fill="#FFFFFF"/>
  <rect x="74" y="19" width="26" height="19" rx="2" fill="#FFFFFF"/>
  <rect x="105" y="19" width="22" height="19" rx="2" fill="#FFFFFF"/>
  <!-- White Windows Front -->
  <rect x="170" y="19" width="28" height="19" rx="2" fill="#FFFFFF"/>
  <rect x="203" y="19" width="28" height="19" rx="2" fill="#FFFFFF"/>
  <rect x="236" y="19" width="28" height="19" rx="2" fill="#FFFFFF"/>
  <path d="M270,19 L302,21 L305,42 L270,40 Z" fill="#FFFFFF"/>
  <!-- White Horizontal Stripe -->
  <line x1="12" y1="49" x2="130" y2="49" stroke="#FFFFFF" stroke-width="3"/>
  <line x1="166" y1="49" x2="298" y2="49" stroke="#FFFFFF" stroke-width="3"/>
  <!-- 3 Red & White Wheels -->
  <circle cx="68" cy="63" r="11" fill="#E30613" stroke="#FFFFFF" stroke-width="3.5"/>
  <circle cx="68" cy="63" r="4.5" fill="#FFFFFF"/>
  <circle cx="196" cy="63" r="11" fill="#E30613" stroke="#FFFFFF" stroke-width="3.5"/>
  <circle cx="196" cy="63" r="4.5" fill="#FFFFFF"/>
  <circle cx="278" cy="63" r="11" fill="#E30613" stroke="#FFFFFF" stroke-width="3.5"/>
  <circle cx="278" cy="63" r="4.5" fill="#FFFFFF"/>
</svg>`;

// 4. Official TransMilenio Square Badge SVG
export const transmiSquareLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <rect x="16" y="12" width="208" height="216" rx="12" fill="#05070B" stroke="#FACC15" stroke-width="3"/>
  <path d="M4,62 L236,26 L214,76 L4,62 Z" fill="#FFEE00" stroke="#05070B" stroke-width="2"/>
  <ellipse cx="122" cy="126" rx="13" ry="56" transform="rotate(14 122 126)" fill="#FFEE00"/>
  <text x="120" y="210" text-anchor="middle" font-family="'Outfit', 'Arial Narrow', sans-serif" font-weight="800" font-size="22" fill="#FFFFFF" letter-spacing="3.5">TRANSMILENIO</text>
</svg>`;

import { execSync } from 'node:child_process';

fs.writeFileSync(path.join(logosDir, 'bogota-transmilenio-header.svg'), bogotaTransmiHeaderSvg);
fs.writeFileSync(path.join(logosDir, 'transmilenio-bus-real.svg'), transmiBusRealSvg);
fs.writeFileSync(path.join(logosDir, 'transmilenio-bus-btn.svg'), transmiBusRedWhiteSvg);
fs.writeFileSync(path.join(logosDir, 'transmilenio-t-logo.svg'), transmiSquareLogoSvg);

const renderHtml = `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>body { margin: 0; padding: 20px; background: transparent; display: flex; flex-direction: column; gap: 30px; align-items: flex-start; } .box { display: inline-block; line-height: 0; }</style></head><body><div id="logo-header" class="box">${bogotaTransmiHeaderSvg}</div><div id="bus-real" class="box">${transmiBusRealSvg}</div><div id="bus-btn" class="box">${transmiBusRedWhiteSvg}</div><div id="logo-t" class="box">${transmiSquareLogoSvg}</div></body></html>`;

const code = `async (page) => {
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.setContent(${JSON.stringify(renderHtml)});
  await page.locator("#logo-header").screenshot({ path: "public/logos/bogota-transmilenio-header.png", omitBackground: true });
  await page.locator("#bus-real").screenshot({ path: "public/logos/transmilenio-bus-real.png", omitBackground: true });
  await page.locator("#bus-btn").screenshot({ path: "public/logos/transmilenio-bus-btn.png", omitBackground: true });
  await page.locator("#logo-t").screenshot({ path: "public/logos/transmilenio-t-logo.png", omitBackground: true });
}`;

try {
  execSync('playwright-cli open --browser=chromium about:blank', { stdio: 'inherit' });
  execSync(`playwright-cli run-code ${JSON.stringify(code)}`, { stdio: 'inherit' });
} finally {
  execSync('playwright-cli close', { stdio: 'inherit' });
}
console.log('PNGs generated successfully!');



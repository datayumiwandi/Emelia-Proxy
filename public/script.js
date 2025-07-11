// File: public/script.js
// Logika ini akan memperbaiki fungsionalitas tombol.

document.addEventListener("DOMContentLoaded", () => {
    // --- Inisialisasi Elemen ---
    const proxyInput = document.getElementById("proxy-input");
    const proxyCountEl = document.getElementById("proxy-count");
    const checkBtn = document.getElementById("check-proxies");
    const clearBtn = document.getElementById("clear-btn");
    const exampleBtn = document.getElementById("example-btn");
    
    const loadingEl = document.getElementById("loading");
    const loadingText = document.getElementById("loading-text");
    const progressBar = document.getElementById("progress-bar");

    const resultContainer = document.getElementById("result-container");
    const resultBody = document.getElementById("result-body");

    // --- Fungsi Helper ---
    function getFlagEmoji(countryCode) {
        if (!countryCode || countryCode.length !== 2) return '🏳️';
        const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    }

    // --- Event Listener (Diperbaiki) ---
    proxyInput.addEventListener("input", () => {
        const proxies = proxyInput.value.trim().split("\n").filter(line => line.trim());
        proxyCountEl.textContent = `${proxies.length}/20`;
    });

    clearBtn.addEventListener("click", () => {
        proxyInput.value = "";
        proxyInput.dispatchEvent(new Event('input')); // Memicu event input untuk update hitungan
    });

    exampleBtn.addEventListener("click", () => {
        proxyInput.value = "https://36.95.152.58:12137\nhttp://37.202.222.182:8443\n216.58.200.14,443/";
        proxyInput.dispatchEvent(new Event('input')); // Memicu event input untuk update hitungan
    });

    // --- Logika Pengecekan Utama ---
    checkBtn.addEventListener("click", async () => {
        const proxies = proxyInput.value.trim().split("\n").filter(line => line.trim()).slice(0, 20);
        if (proxies.length === 0) return;

        loadingEl.classList.remove("hidden");
        resultContainer.classList.add("hidden");
        resultBody.innerHTML = "";
        progressBar.style.width = "0%";
        
        let checkedCount = 0;

        for (const [index, proxy] of proxies.entries()) {
            checkedCount++;
            loadingText.textContent = `Checking ${checkedCount} of ${proxies.length}...`;

            try {
                const res = await fetch(`/api/helpers?proxy=${encodeURIComponent(proxy)}`);
                const data = await res.json();
                renderResult(data, index);
            } catch (e) {
                const [ip, port] = proxy.split(':');
                renderResult({ ip, port, proxyip: false, message: 'Client-side fetch error' }, index);
            }
            
            progressBar.style.width = `${(checkedCount / proxies.length) * 100}%`;
        }

        loadingEl.classList.add("hidden");
        resultContainer.classList.remove("hidden");
    });

    // --- Render Hasil ---
    function renderResult(data, index) {
        const isActive = data.proxyip;
        const statusText = isActive ? 'ACTIVE' : 'INACTIVE';
        const flagHtml = isActive ? `<span class="text-2xl">${getFlagEmoji(data.countryCode)}</span>` : '';
        
        const geminiButtonHtml = isActive ? `
            <div class="mt-4">
                <button 
                    data-country="${data.countryName}" 
                    data-org="${data.asOrganization}"
                    data-index="${index}"
                    class="gemini-btn w-full text-sm px-4 py-2 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
                    <i class="fas fa-magic"></i>
                    <span>✨ Sarankan Kegunaan</span>
                </button>
            </div>
            <div id="gemini-result-${index}" class="hidden mt-3 text-sm text-gray-300 border-t border-indigo-800 pt-3 gemini-suggestions">
            </div>
        ` : '';

        const cardHtml = `
            <div class="glassmorphism overflow-hidden">
              <div class="relative">
                <div class="absolute top-0 left-0 w-1 h-full ${isActive ? 'bg-green-500' : 'bg-red-500'}"></div>
                <div class="p-5">
                  <div class="space-y-3">
                    <div class="flex justify-between items-center">
                      <div class="flex flex-col">
                        <div class="flex items-center">
                          <h2 class="text-lg font-bold text-white">${data.ip}:${data.port}</h2>
                          <span class="ml-3 px-2 py-1 text-xs font-medium rounded-full ${isActive ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}">${statusText}</span>
                        </div>
                        <div class="text-gray-400 text-sm"><span>ASN:</span> <span class="font-medium text-white">${data.asn || 'N/A'}</span></div>
                      </div>
                      <div class="flex items-center text-right">
                          ${flagHtml}
                          <span class="ml-2 text-gray-200 font-medium">${data.countryName || 'N/A'}</span>
                      </div>
                    </div>
                    ${isActive ? `
                    <div class="border-t border-gray-700/50 pt-3 text-sm space-y-2">
                        <div class="flex justify-between"><span class="text-gray-400">Organization:</span> <span class="text-right">${data.asOrganization}</span></div>
                        <div class="flex justify-between"><span class="text-gray-400">Coordinates:</span> <span class="text-right">${data.latitude}, ${data.longitude}</span></div>
                        <div class="flex justify-between"><span class="text-gray-400">Delay:</span> <span class="font-bold">${data.delay}</span></div>
                    </div>
                    ` : `<div class="text-red-400 text-sm pt-2 border-t border-gray-700/50">${data.message}</div>`}
                  </div>
                  ${geminiButtonHtml}
                </div>
              </div>
            </div>`;
        resultBody.innerHTML += cardHtml;
    }
});

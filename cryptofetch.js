// CryptoFetch Widget
(function() {
    // Default configuration
    const DEFAULT_CONFIG = {
        coin: 'bitcoin',
        currency: 'usd',
        showName: true,
        showChange: false,
        cacheDuration: 5 * 60 * 1000 // 5 minutes
    };

    // Utility functions
    const utils = {
        sanitizeText(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        formatNumber(num, decimals = 2) {
            return Number(num).toLocaleString(undefined, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        }
    };

    // CoinGecko API handler
    const coinGeckoAPI = {
        async fetchCoinData(coinId, currency) {
            const cacheKey = `cryptofetch_${coinId}_${currency}`;
            const cachedData = this.getCachedData(cacheKey);
            
            if (cachedData) {
                return cachedData;
            }

            try {
                const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch coin data');
                }

                const data = await response.json();
                const coinData = {
                    name: data.name,
                    symbol: data.symbol.toUpperCase(),
                    price: data.market_data.current_price[currency],
                    priceChange24h: data.market_data.price_change_percentage_24h,
                    timestamp: Date.now()
                };

                this.setCachedData(cacheKey, coinData);
                return coinData;
            } catch (error) {
                console.error('CryptoFetch Error:', error.message);
                return null;
            }
        },
        getCachedData(key) {
            try {
                const cached = localStorage.getItem(key);
                if (!cached) return null;

                const { data, timestamp } = JSON.parse(cached);
                
                // Check if cache is still valid
                if (Date.now() - timestamp > DEFAULT_CONFIG.cacheDuration) {
                    localStorage.removeItem(key);
                    return null;
                }

                return data;
            } catch {
                return null;
            }
        },
        setCachedData(key, data) {
            try {
                localStorage.setItem(key, JSON.stringify({
                    data,
                    timestamp: Date.now()
                }));
            } catch {
                // Ignore storage errors
            }
        }
    };

    // Widget renderer
    function renderWidget(widget, coinData) {
        if (!coinData) {
            widget.innerHTML = `
                <div class="cryptofetch-error">
                    Unable to fetch price for ${widget.dataset.coin}
                </div>
            `;
            return;
        }

        const config = {
            coin: widget.dataset.coin || DEFAULT_CONFIG.coin,
            currency: widget.dataset.currency || DEFAULT_CONFIG.currency,
            showName: widget.dataset.showName !== 'false',
            showChange: widget.dataset.showChange === 'true'
        };

        const priceChangeClass = coinData.priceChange24h >= 0 ? 'cryptofetch-price-up' : 'cryptofetch-price-down';
        const priceChangeSign = coinData.priceChange24h >= 0 ? '+' : '';

        let html = `<div class="cryptofetch-container">`;

        if (config.showName) {
            html += `<span class="cryptofetch-name">
                ${utils.sanitizeText(coinData.name)} (${utils.sanitizeText(coinData.symbol)})
            </span>: `;
        }

        html += `<span class="cryptofetch-price">
            ${config.currency.toUpperCase()} ${utils.formatNumber(coinData.price)}
        </span>`;

        if (config.showChange) {
            html += ` <span class="cryptofetch-change ${priceChangeClass}">
                ${priceChangeSign}${utils.formatNumber(coinData.priceChange24h)}%
            </span>`;
        }

        html += `</div>`;

        widget.innerHTML = html;
    }

    // Main initialization function
    async function initCryptoFetch() {
        // Find all widgets
        const widgets = document.querySelectorAll('.cryptofetch-widget');
        
        // Process each widget
        for (const widget of widgets) {
            const coinId = widget.dataset.coin || DEFAULT_CONFIG.coin;
            const currency = widget.dataset.currency || DEFAULT_CONFIG.currency;

            // Add loading state
            widget.innerHTML = `<div class="cryptofetch-loading">Loading...</div>`;

            try {
                const coinData = await coinGeckoAPI.fetchCoinData(coinId, currency);
                renderWidget(widget, coinData);
            } catch (error) {
                console.error('CryptoFetch Initialization Error:', error);
                widget.innerHTML = `
                    <div class="cryptofetch-error">
                        Failed to load cryptocurrency data
                    </div>
                `;
            }
        }
    }

    // Inject default styles
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .cryptofetch-widget {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: inline-block;
                background-color: #f7f7f7;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                padding: 8px 12px;
                margin: 10px 0;
                max-width: 100%;
                box-sizing: border-box;
            }
            .cryptofetch-name {
                font-weight: 600;
            }
            .cryptofetch-price {
                font-weight: 600;
            }
            .cryptofetch-change {
                font-size: 0.9em;
                margin-left: 5px;
            }
            .cryptofetch-price-up {
                color: #28a745;
            }
            .cryptofetch-price-down {
                color: #dc3545;
            }
            .cryptofetch-loading,
            .cryptofetch-error {
                color: #6c757d;
                font-style: italic;
            }
            @media (max-width: 480px) {
                .cryptofetch-widget {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Initialize on DOM load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectStyles();
            initCryptoFetch();
        });
    } else {
        injectStyles();
        initCryptoFetch();
    }

    // Expose global refresh method
    window.CryptoFetch = {
        refresh: initCryptoFetch
    };
})();
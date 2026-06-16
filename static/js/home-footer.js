/**
 * 首页统计卡片
 */
(function () {
    var wrap = document.getElementById('homeMiniStats');
    if (!wrap) return;

    function fmtDate(s) {
        if (!s) return '--';
        return String(s).slice(0, 10);
    }

    function loadStats() {
        Promise.all([
            fetch('/api/stats/mini').then(function (r) { return r.json(); }),
            fetch('/api/stats/cities').then(function (r) { return r.json(); })
        ]).then(function (results) {
            var miniRes = results[0];
            var cityRes = results[1];

            var totalEl = document.getElementById('statTotal');
            var yearEl = document.getElementById('statYear');
            var latestEl = document.getElementById('statLatest');
            var citiesEl = document.getElementById('statCities');

            if (miniRes && miniRes.success && miniRes.data) {
                var d = miniRes.data;
                if (totalEl) totalEl.textContent = String(d.total_count || 0);
                if (yearEl) yearEl.textContent = String(d.year_count || 0);
                if (latestEl) latestEl.textContent = fmtDate(d.latest_date);
            }

            if (cityRes && cityRes.success && cityRes.data) {
                if (citiesEl) citiesEl.textContent = String(cityRes.data.total_cities || 0);
            }
        }).catch(function () {
            // 统计加载失败时保持默认占位
        });
    }

    loadStats();
})();

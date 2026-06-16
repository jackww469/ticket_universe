/**
 * 年度统计页
 */
(function () {
    var totalTicketsEl = document.getElementById('totalTickets');
    var totalCitiesEl = document.getElementById('totalCities');
    var totalYearsEl = document.getElementById('totalYears');
    var chartBars = document.getElementById('chartBars');
    var chartXAxis = document.getElementById('chartXAxis');
    var currentYearTitle = document.getElementById('currentYearTitle');
    var monthGrid = document.getElementById('monthGrid');
    var typeList = document.getElementById('typeList');
    var placeList = document.getElementById('placeList');

    var stats = {};

    function esc(s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function renderOverview() {
        if (!stats.total_tickets) return;
        totalTicketsEl.textContent = stats.total_tickets;
        totalCitiesEl.textContent = stats.top_places ? stats.top_places.length : 0;
        totalYearsEl.textContent = stats.yearly_counts ? stats.yearly_counts.length : 0;
    }

    function renderYearlyChart() {
        if (!stats.yearly_counts || !stats.yearly_counts.length) {
            chartBars.innerHTML = '<div class="empty-hint">暂无年度数据</div>';
            chartXAxis.innerHTML = '';
            return;
        }

        var data = stats.yearly_counts.slice(0, 10); // 最多显示10年
        var maxCount = Math.max.apply(null, data.map(function (d) { return d.count; }));

        var barsHtml = '';
        var axisHtml = '';

        data.forEach(function (item) {
            var height = maxCount > 0 ? Math.max(20, (item.count / maxCount) * 120) : 20;
            var color = getBarColor(item.year);

            barsHtml += '<div class="chart-bar-wrap">';
            barsHtml += '<div class="chart-bar-value">' + item.count + '</div>';
            barsHtml += '<div class="chart-bar" style="height:' + height + 'px;background:' + color + ';" ';
            barsHtml += 'title="' + item.year + '年: ' + item.count + '张"></div>';
            barsHtml += '</div>';

            axisHtml += '<div class="chart-x-label">' + esc(item.year) + '</div>';
        });

        chartBars.innerHTML = barsHtml;
        chartXAxis.innerHTML = axisHtml;
    }

    function getBarColor(year) {
        var colors = [
            '#c41e3a', '#8b4513', '#228B22', '#2F4F4F',
            '#7B61FF', '#E91E63', '#FFA500', '#1E90FF'
        ];
        var index = parseInt(year) % colors.length;
        return colors[index] || '#8b4513';
    }

    function renderMonthlyChart() {
        if (!stats.monthly_counts) {
            monthGrid.innerHTML = '<div class="empty-hint">暂无月度数据</div>';
            return;
        }

        currentYearTitle.textContent = stats.current_year || '今年';

        var monthNames = ['1月', '2月', '3月', '4月', '5月', '6月',
                          '7月', '8月', '9月', '10月', '11月', '12月'];
        var monthlyMap = {};
        stats.monthly_counts.forEach(function (m) {
            monthlyMap[m.month] = m.count;
        });

        var maxCount = Math.max.apply(null, stats.monthly_counts.map(function (m) { return m.count; })) || 1;

        var html = '';
        for (var i = 1; i <= 12; i++) {
            var month = String(i).padStart(2, '0');
            var count = monthlyMap[month] || 0;
            var height = Math.max(10, (count / maxCount) * 80);
            var opacity = count > 0 ? 1 : 0.2;

            html += '<div class="month-cell">';
            html += '<div class="month-bar-wrap">';
            html += '<div class="month-bar" style="height:' + height + 'px;opacity:' + opacity + ';" ';
            html += 'title="' + monthNames[i - 1] + ': ' + count + '张"></div>';
            html += '</div>';
            html += '<div class="month-label">' + monthNames[i - 1] + '</div>';
            html += '<div class="month-count">' + count + '</div>';
            html += '</div>';
        }

        monthGrid.innerHTML = html;
    }

    function renderTypeList() {
        if (!stats.type_counts || !stats.type_counts.length) {
            typeList.innerHTML = '<div class="empty-hint">暂无类型数据</div>';
            return;
        }

        var total = stats.type_counts.reduce(function (sum, t) { return sum + t.count; }, 0);
        var colors = {
            '车票': '#2F4F4F',
            '演出票': '#7B61FF',
            '景区票': '#228B22',
            '证书': '#C9A227',
            '其他': '#E91E63'
        };

        var html = '';
        stats.type_counts.forEach(function (item) {
            var pct = total > 0 ? (item.count / total * 100).toFixed(1) : 0;
            var color = colors[item.type] || '#8b4513';

            html += '<div class="type-item">';
            html += '<div class="type-info">';
            html += '<span class="type-name">' + esc(item.type) + '</span>';
            html += '<span class="type-count">' + item.count + '张</span>';
            html += '</div>';
            html += '<div class="type-bar-bg">';
            html += '<div class="type-bar" style="width:' + pct + '%;background:' + color + ';"></div>';
            html += '</div>';
            html += '<span class="type-pct">' + pct + '%</span>';
            html += '</div>';
        });

        typeList.innerHTML = html;
    }

    function renderPlaceList() {
        if (!stats.top_places || !stats.top_places.length) {
            placeList.innerHTML = '<div class="empty-hint">暂无地点数据</div>';
            return;
        }

        var maxCount = stats.top_places[0].count;
        var html = '';
        stats.top_places.forEach(function (item, idx) {
            var barWidth = (item.count / maxCount * 100).toFixed(1);
            var rank = idx + 1;
            var rankClass = '';
            if (rank === 1) rankClass = 'gold';
            else if (rank === 2) rankClass = 'silver';
            else if (rank === 3) rankClass = 'bronze';

            html += '<div class="place-item">';
            html += '<span class="place-rank ' + rankClass + '">' + rank + '</span>';
            html += '<span class="place-name">' + esc(item.place) + '</span>';
            html += '<div class="place-bar-wrap">';
            html += '<div class="place-bar" style="width:' + barWidth + '%;"></div>';
            html += '</div>';
            html += '<span class="place-count">' + item.count + '次</span>';
            html += '</div>';
        });

        placeList.innerHTML = html;
    }

    function renderAll() {
        renderOverview();
        renderYearlyChart();
        renderMonthlyChart();
        renderTypeList();
        renderPlaceList();
    }

    // 获取城市统计数据用于补充城市数
    Promise.all([
        fetch('/api/stats/yearly').then(function (r) { return r.json(); }),
        fetch('/api/stats/cities').then(function (r) { return r.json(); })
    ]).then(function (results) {
        var yearlyRes = results[0];
        var cityRes = results[1];

        if (yearlyRes.success && yearlyRes.data) {
            stats = yearlyRes.data;
        }
        if (cityRes.success && cityRes.data) {
            totalCitiesEl.textContent = cityRes.data.total_cities;
        }

        renderAll();
    }).catch(function () {
        typeList.innerHTML = '<div class="empty-hint">加载失败</div>';
        placeList.innerHTML = '<div class="empty-hint">加载失败</div>';
    });
})();

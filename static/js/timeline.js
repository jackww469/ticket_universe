/**
 * 时间轴日记重构版：
 * 左侧 25-30% 时间轴（年份折叠、月份筛选、搜索）
 * 右侧 70-75% 票根展示（主图 + 同月份缩略图 + 结构化信息）
 */
(function () {
    var loadingEl = document.getElementById('timelineLoading');
    var emptyEl = document.getElementById('timelineEmpty');
    var sidebarEl = document.getElementById('tl2Sidebar');
    var viewerEl = document.getElementById('tl2Viewer');
    var yearListEl = document.getElementById('tl2YearList');
    var monthFilterEl = document.getElementById('tl2MonthFilter');
    var searchInputEl = document.getElementById('tl2SearchInput');

    var viewerEmptyEl = document.getElementById('tl2ViewerEmpty');
    var viewerCardEl = document.getElementById('tl2ViewerCard');
    var mainImageEl = document.getElementById('tl2MainImage');
    var infoTitleEl = document.getElementById('tl2InfoTitle');
    var infoMetaEl = document.getElementById('tl2InfoMeta');
    var infoNotesEl = document.getElementById('tl2InfoNotes');
    var thumbsEl = document.getElementById('tl2Thumbs');

    var allData = [];
    var filteredData = [];
    var groups = {};
    var selectedId = null;
    var collapsedYears = {};

    function esc(s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function parseDate(t) {
        if (!t) return { year: '未分类', month: '00', day: '' };
        var p = String(t).trim().split('-');
        var y = p[0] || '未分类';
        var m = p[1] || '00';
        var d = p[2] || '';
        return { year: y, month: m, day: d };
    }

    function reGroup(data) {
        var g = {};
        data.forEach(function (item) {
            var d = parseDate(item.time);
            if (!g[d.year]) g[d.year] = {};
            if (!g[d.year][d.month]) g[d.year][d.month] = [];
            g[d.year][d.month].push(item);
        });
        return g;
    }

    function getTicketIcon(item) {
        if (item.type === '证书') return '🏅';
        if (item.type === '车票') return '🎫';
        if (item.type === '演出票') return '🎭';
        if (item.type === '景区票') return '🌿';
        return '🎟';
    }

    function extractTrainNo(text) {
        if (!text) return '';
        var m = String(text).match(/\b([A-Z]?\d{2,5})\s*次?\b/i);
        return m ? m[1].toUpperCase() + '次' : '';
    }

    function getMetaLine(item) {
        var dt = parseDate(item.time);
        var date = dt.year && dt.month && dt.day ? (dt.year + '.' + dt.month + '.' + dt.day) : (item.time || '-');
        var place = item.place || '-';
        var trainNo = extractTrainNo(item.ocr_text || item.notes || '');
        if (trainNo) return date + ' | ' + place + ' | ' + trainNo;
        return date + ' | ' + place + ' | ' + (item.type || '-');
    }

    function passFilter(item) {
        var q = (searchInputEl.value || '').trim().toLowerCase();
        var m = monthFilterEl.value || '';
        var dt = parseDate(item.time);
        if (m && dt.month !== m) return false;
        if (!q) return true;
        var blob = [
            item.type, item.platform, item.time, item.place, item.notes, item.ocr_text
        ].join(' ').toLowerCase();
        return blob.indexOf(q) >= 0;
    }

    function applyFilter() {
        filteredData = allData.filter(passFilter);
        groups = reGroup(filteredData);
        if (!filteredData.length) {
            selectedId = null;
            renderSidebar();
            renderViewer();
            return;
        }
        if (!selectedId || !filteredData.some(function (x) { return x.id === selectedId; })) {
            selectedId = filteredData[0].id;
        }
        renderSidebar();
        renderViewer();
    }

    function renderSidebar() {
        var years = Object.keys(groups).sort();
        if (!years.length) {
            yearListEl.innerHTML = '<div class="tl2-no-result">没有匹配的票根</div>';
            return;
        }
        var html = '<div class="tl2-line"></div>';
        years.forEach(function (year) {
            var isCollapsed = !!collapsedYears[year];
            var months = Object.keys(groups[year]).sort();
            var yearTotal = 0;
            months.forEach(function (m) { yearTotal += groups[year][m].length; });
            html += '<section class="tl2-year ' + (isCollapsed ? 'is-collapsed' : '') + '" data-year="' + esc(year) + '">';
            html += '<button class="tl2-year-head" data-act="toggle-year" data-year="' + esc(year) + '">';
            html += '<span class="tl2-year-dot"></span><span class="tl2-year-label">' + esc(year) + '年</span>';
            html += '<span class="tl2-year-count">' + yearTotal + '</span>';
            html += '</button>';
            html += '<div class="tl2-year-body">';
            months.forEach(function (month) {
                html += '<div class="tl2-month">';
                html += '<div class="tl2-month-head"><span class="tl2-month-dot"></span>' + esc(month) + '月</div>';
                html += '<div class="tl2-ticket-list">';
                groups[year][month].forEach(function (item) {
                    var active = item.id === selectedId ? 'is-active' : '';
                    html += '<button class="tl2-ticket ' + active + '" data-act="select-ticket" data-id="' + item.id + '">';
                    html += '<span class="tl2-ticket-icon">' + getTicketIcon(item) + '</span>';
                    html += '<span class="tl2-ticket-text">' + esc(item.type || '票据') + ' · ' + esc(item.time || '') + '</span>';
                    html += '</button>';
                });
                html += '</div></div>';
            });
            html += '</div></section>';
        });
        yearListEl.innerHTML = html;
    }

    function renderViewer() {
        if (!selectedId) {
            viewerEmptyEl.style.display = 'block';
            viewerCardEl.style.display = 'none';
            return;
        }
        var item = filteredData.find(function (x) { return x.id === selectedId; });
        if (!item) {
            viewerEmptyEl.style.display = 'block';
            viewerCardEl.style.display = 'none';
            return;
        }
        viewerEmptyEl.style.display = 'none';
        viewerCardEl.style.display = 'block';

        mainImageEl.src = item.image_url || '';
        mainImageEl.alt = item.type || '票据图片';
        infoTitleEl.textContent = (item.type || '票据') + ' · ' + (item.time || '');
        infoMetaEl.textContent = getMetaLine(item);
        infoNotesEl.textContent = item.notes || item.ocr_text || '暂无备注';

        var dt = parseDate(item.time);
        var sameMonth = filteredData.filter(function (x) {
            var d = parseDate(x.time);
            return d.year === dt.year && d.month === dt.month;
        });
        var thumbsHtml = '';
        sameMonth.forEach(function (x) {
            var active = x.id === selectedId ? 'is-active' : '';
            var img = x.image_url ? '<img src="' + esc(x.image_url) + '" alt="">' : '<div class="tl2-thumb-empty">无图</div>';
            thumbsHtml += '<button class="tl2-thumb ' + active + '" data-act="select-ticket" data-id="' + x.id + '">' + img + '</button>';
        });
        thumbsEl.innerHTML = thumbsHtml || '<div class="tl2-no-result">本月无其他票根</div>';
    }

    function initMonthFilter(data) {
        var months = {};
        data.forEach(function (item) {
            var m = parseDate(item.time).month;
            if (m && m !== '00') months[m] = true;
        });
        var arr = Object.keys(months).sort();
        monthFilterEl.innerHTML = '<option value="">全部月份</option>' + arr.map(function (m) {
            return '<option value="' + m + '">' + m + '月</option>';
        }).join('');
    }

    function bindEvents() {
        yearListEl.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-act]');
            if (!btn) return;
            var act = btn.getAttribute('data-act');
            if (act === 'toggle-year') {
                var y = btn.getAttribute('data-year');
                collapsedYears[y] = !collapsedYears[y];
                renderSidebar();
                return;
            }
            if (act === 'select-ticket') {
                selectedId = Number(btn.getAttribute('data-id'));
                renderSidebar();
                renderViewer();
            }
        });
        thumbsEl.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-act="select-ticket"]');
            if (!btn) return;
            selectedId = Number(btn.getAttribute('data-id'));
            renderSidebar();
            renderViewer();
        });
        monthFilterEl.addEventListener('change', applyFilter);
        searchInputEl.addEventListener('input', function () {
            clearTimeout(window.__tlSearchTimer);
            window.__tlSearchTimer = setTimeout(applyFilter, 120);
        });
    }

    fetch('/api/tickets/timeline')
        .then(function (r) { return r.json(); })
        .then(function (res) {
            loadingEl.style.display = 'none';
            if (!res.success || !res.data || !res.data.length) {
                emptyEl.style.display = 'block';
                return;
            }
            emptyEl.style.display = 'none';
            sidebarEl.style.display = 'block';
            viewerEl.style.display = 'block';

            allData = (res.data || []).slice().sort(function (a, b) {
                return String(a.time || '').localeCompare(String(b.time || ''));
            });
            initMonthFilter(allData);
            bindEvents();
            applyFilter();
        })
        .catch(function () {
            loadingEl.style.display = 'none';
            emptyEl.style.display = 'block';
        });
})();

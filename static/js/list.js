/**
 * 列表页：按类型筛选、关键词搜索、卡片渲染
 */
(function () {
    var filterBtns = document.getElementById('filterBtns');
    var searchInput = document.getElementById('searchInput');
    var searchBtn = document.getElementById('searchBtn');
    var cardGrid = document.getElementById('cardGrid');
    var listLoading = document.getElementById('listLoading');
    var emptyState = document.getElementById('emptyState');

    var currentType = '全部';
    var searchKeyword = '';
    var allData = [];

    function setLoading(loading) {
        listLoading.style.display = loading ? 'block' : 'none';
        emptyState.style.display = 'none';
    }

    function renderCards(data) {
        cardGrid.querySelectorAll('.ticket-card').forEach(function (n) { n.remove(); });
        if (!data || !data.length) {
            emptyState.style.display = 'block';
            emptyState.querySelector('p').innerHTML = searchKeyword
                ? '没有匹配的票据，试试其他关键词'
                : '暂无票据，<a href="/upload">去上传</a>';
            return;
        }
        data.forEach(function (item) {
            var card = document.createElement('a');
            card.href = '/detail/' + item.id;
            card.className = 'ticket-card' + (item.type === '证书' ? ' card-cert' : '');
            var tc = (item.theme_color || '').trim();
            if (/^#[0-9A-Fa-f]{3,8}$/.test(tc)) {
                card.style.borderLeft = '4px solid ' + tc;
            }
            var imgSrc = item.image_url || '';
            var thumb = imgSrc
                ? '<div class="card-thumb"><img src="' + escapeHtml(imgSrc) + '" alt=""></div>'
                : '<div class="card-thumb"><img src="" alt="" onerror="this.style.display=\'none\'"></div>';
            card.innerHTML = thumb +
                '<div class="card-body">' +
                '<div class="card-type">' + escapeHtml(item.type) + '</div>' +
                '<div class="card-time">' + escapeHtml(item.time || '') + '</div>' +
                '<div class="card-place">' + escapeHtml(item.place || '-') + '</div>' +
                '</div>';
            cardGrid.appendChild(card);
        });
    }

    function escapeHtml(s) {
        if (s == null) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function loadList() {
        setLoading(true);
        var url = searchKeyword
            ? '/api/tickets/search?q=' + encodeURIComponent(searchKeyword) + '&type=' + encodeURIComponent(currentType)
            : '/api/tickets?type=' + encodeURIComponent(currentType);
        fetch(url)
            .then(function (r) { return r.json(); })
            .then(function (res) {
                setLoading(false);
                if (res.success) {
                    allData = res.data || [];
                    renderCards(allData);
                } else {
                    renderCards([]);
                }
            })
            .catch(function () {
                setLoading(false);
                renderCards([]);
            });
    }

    filterBtns.addEventListener('click', function (e) {
        var btn = e.target.closest('.filter-btn');
        if (!btn) return;
        filterBtns.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentType = btn.getAttribute('data-type') || '全部';
        searchKeyword = '';
        searchInput.value = '';
        loadList();
    });

    function doSearch() {
        searchKeyword = searchInput.value.trim();
        loadList();
    }

    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doSearch();
    });

    // 初始：根据 URL 参数设置筛选
    var params = new URLSearchParams(window.location.search);
    var typeParam = params.get('type');
    var qParam = params.get('q');
    if (typeParam) {
        currentType = typeParam;
        var activeBtn = filterBtns.querySelector('[data-type="' + escapeHtml(typeParam) + '"]');
        if (activeBtn) {
            filterBtns.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
            activeBtn.classList.add('active');
        }
    }
    if (qParam) {
        searchKeyword = qParam;
        searchInput.value = qParam;
    }
    loadList();
})();

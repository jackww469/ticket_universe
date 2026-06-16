/**
 * 首页搜索：支持关键词 + 类型，跳转到列表页并复用筛选逻辑
 */
(function () {
    var typeEl = document.getElementById('homeSearchType');
    var keywordEl = document.getElementById('homeSearchKeyword');
    var btn = document.getElementById('homeSearchBtn');

    function goSearch() {
        var type = (typeEl && typeEl.value) ? typeEl.value : '全部';
        var keyword = keywordEl ? keywordEl.value.trim() : '';

        var url = '/list?type=' + encodeURIComponent(type);
        if (keyword) {
            url += '&q=' + encodeURIComponent(keyword);
        }
        window.location.href = url;
    }

    if (btn) {
        btn.addEventListener('click', goSearch);
    }
    if (keywordEl) {
        keywordEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') goSearch();
        });
    }
})();


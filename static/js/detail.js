/**
 * 详情页：加载票据、编辑、删除
 */
(function () {
    var id = window.TICKET_ID;
    var detailWrap = document.getElementById('detailWrap');
    var detailLoading = document.getElementById('detailLoading');
    var detailContent = document.getElementById('detailContent');
    var detailError = document.getElementById('detailError');
    var editModal = document.getElementById('editModal');
    var editForm = document.getElementById('editForm');
    var editModalClose = document.getElementById('editModalClose');

    function escapeHtml(s) {
        if (s == null) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function showContent(data) {
        var imgEl = document.getElementById('detailImage');
        var noImgEl = document.getElementById('detailNoImage');
        if (data.image_url) {
            imgEl.src = data.image_url;
            imgEl.style.display = 'block';
            if (noImgEl) noImgEl.style.display = 'none';
        } else {
            imgEl.style.display = 'none';
            if (noImgEl) noImgEl.style.display = 'block';
        }
        document.getElementById('detailType').textContent = data.type || '-';
        document.getElementById('detailPlatform').textContent = data.platform || '-';
        document.getElementById('detailTime').textContent = data.time || '-';
        document.getElementById('detailPlace').textContent = data.place || '-';
        document.getElementById('detailNotes').textContent = data.notes || '-';
        var ocrEl = document.getElementById('detailOcr');
        if (ocrEl) ocrEl.textContent = (data.ocr_text && data.ocr_text.trim()) ? data.ocr_text : '-';
        var themeEl = document.getElementById('detailTheme');
        if (themeEl) {
            themeEl.textContent = '';
            var tc = (data.theme_color || '').trim();
            if (!tc) {
                themeEl.textContent = '-';
            } else if (/^#[0-9A-Fa-f]{3,8}$/.test(tc)) {
                var sw = document.createElement('span');
                sw.className = 'theme-inline-swatch';
                sw.style.background = tc;
                themeEl.appendChild(sw);
                themeEl.appendChild(document.createTextNode(' ' + tc));
            } else {
                themeEl.textContent = tc;
            }
        }
        var dc = document.getElementById('detailContent');
        if (dc) {
            if (data.theme_color) {
                dc.classList.add('detail-themed');
                dc.style.setProperty('--detail-theme', data.theme_color);
            } else {
                dc.classList.remove('detail-themed');
                dc.style.removeProperty('--detail-theme');
            }
        }
        document.getElementById('editLink').href = '#edit';
        detailLoading.style.display = 'none';
        detailError.style.display = 'none';
        detailContent.style.display = 'grid';
    }

    function showErr() {
        detailLoading.style.display = 'none';
        detailContent.style.display = 'none';
        detailError.style.display = 'block';
    }

    fetch('/api/tickets/' + id)
        .then(function (r) {
            if (!r.ok) throw new Error('404');
            return r.json();
        })
        .then(function (res) {
            if (res.success && res.data) {
                showContent(res.data);
            } else {
                showErr();
            }
        })
        .catch(function () {
            showErr();
        });

    document.getElementById('editLink').addEventListener('click', function (e) {
        e.preventDefault();
        fetch('/api/tickets/' + id)
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (res.success && res.data) {
                    var d = res.data;
                    document.getElementById('editId').value = id;
                    document.getElementById('editType').value = d.type || '';
                    document.getElementById('editPlatform').value = d.platform || '';
                    document.getElementById('editTime').value = (d.time || '').slice(0, 10);
                    document.getElementById('editNotes').value = d.notes || '';
                    document.getElementById('editPlace').value = d.place || '';
                    document.getElementById('editProvince').value = d.province || '';
                    document.getElementById('editCity').value = d.city || '';
                    document.getElementById('editOcrText').value = d.ocr_text || '';
                    document.getElementById('editThemeColor').value = d.theme_color || '';
                    document.getElementById('editImage').value = '';
                    editModal.style.display = 'flex';
                }
            });
    });

    editModalClose.addEventListener('click', function () {
        editModal.style.display = 'none';
    });
    editModal.addEventListener('click', function (e) {
        if (e.target === editModal) editModal.style.display = 'none';
    });

    editForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var fd = new FormData(editForm);
        fd.delete('id');
        var xhr = new XMLHttpRequest();
        xhr.open('PUT', '/api/tickets/' + id);
        xhr.onload = function () {
            var res;
            try {
                res = JSON.parse(xhr.responseText);
            } catch (err) {
                showToast('更新失败');
                return;
            }
            if (res.success) {
                showToast('更新成功');
                editModal.style.display = 'none';
                fetch('/api/tickets/' + id)
                    .then(function (r) { return r.json(); })
                    .then(function (res) {
                        if (res.success && res.data) showContent(res.data);
                    });
            } else {
                showToast(res.message || '更新失败');
            }
        };
        xhr.send(fd);
    });

    document.getElementById('deleteBtn').addEventListener('click', function () {
        if (!confirm('确定要删除这张票据吗？')) return;
        fetch('/api/tickets/' + id, { method: 'DELETE' })
            .then(function (r) { return r.json(); })
            .then(function (res) {
                if (res.success) {
                    showToast('删除成功');
                    setTimeout(function () {
                        window.location.href = '/list';
                    }, 800);
                } else {
                    showToast(res.message || '删除失败');
                }
            });
    });
})();

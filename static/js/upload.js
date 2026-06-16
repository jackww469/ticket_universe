/**
 * 上传页：表单校验、图片预览、大小限制(5MB)、提交
 */
(function () {
    var MAX_SIZE = 5 * 1024 * 1024; // 5MB
    var form = document.getElementById('uploadForm');
    var imageInput = document.getElementById('image');
    var uploadArea = document.getElementById('uploadArea');
    var uploadPlaceholder = document.getElementById('uploadPlaceholder');
    var uploadPreview = document.getElementById('uploadPreview');
    var previewImg = document.getElementById('previewImg');
    var previewRemove = document.getElementById('previewRemove');
    var ocrBtn = document.getElementById('ocrBtn');

    function validate() {
        var type = document.getElementById('type').value.trim();
        var time = document.getElementById('time').value.trim();
        if (!type) {
            showToast('请选择票据类型');
            return false;
        }
        if (!time) {
            showToast('请选择时间');
            return false;
        }
        if (!imageInput.files || !imageInput.files.length) {
            showToast('请上传图片');
            return false;
        }
        var file = imageInput.files[0];
        if (file.size > MAX_SIZE) {
            showToast('图片大小不能超过 5MB');
            return false;
        }
        return true;
    }

    uploadArea.addEventListener('click', function (e) {
        if (e.target !== previewRemove && e.target !== previewImg) {
            imageInput.click();
        }
    });

    uploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--color-accent)';
    });
    uploadArea.addEventListener('dragleave', function () {
        uploadArea.style.borderColor = '';
    });
    uploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        var files = e.dataTransfer.files;
        if (files.length && files[0].type.indexOf('image/') === 0) {
            if (files[0].size > MAX_SIZE) {
                showToast('图片大小不能超过 5MB');
                return;
            }
            imageInput.files = files;
            showPreview(files[0]);
        }
    });

    imageInput.addEventListener('change', function () {
        if (this.files && this.files[0]) {
            if (this.files[0].size > MAX_SIZE) {
                showToast('图片大小不能超过 5MB');
                this.value = '';
                return;
            }
            showPreview(this.files[0]);
        }
    });

    function showPreview(file) {
        var url = URL.createObjectURL(file);
        previewImg.src = url;
        uploadPlaceholder.style.display = 'none';
        uploadPreview.style.display = 'block';
    }

    previewRemove.addEventListener('click', function (e) {
        e.stopPropagation();
        imageInput.value = '';
        previewImg.src = '';
        uploadPreview.style.display = 'none';
        uploadPlaceholder.style.display = 'block';
        var ocrTa = document.getElementById('ocr_text');
        if (ocrTa) ocrTa.value = '';
        var tc = document.getElementById('theme_color');
        if (tc) tc.value = '';
        applyThemePreview('#808080', '通用票根', '');
    });

    function applyThemePreview(color, label, extraHint) {
        var box = document.getElementById('themePreview');
        var sw = document.getElementById('themeSwatch');
        var lab = document.getElementById('themePreviewLabel');
        var hint = document.getElementById('themePreviewHint');
        if (!box) return;
        var c = color || '#808080';
        box.style.setProperty('--preview-accent', c);
        if (sw) sw.style.background = c;
        if (lab) lab.textContent = '主题：' + (label || '通用票根');
        if (hint) hint.textContent = extraHint || '点击「自动识别」后根据关键词匹配主题色';
    }

    // 自动识别：调用后端 OCR 接口，填充结构化字段 + OCR 全文 + 主题色（不写入备注）
    if (ocrBtn) {
        ocrBtn.addEventListener('click', function () {
            if (!imageInput.files || !imageInput.files.length) {
                showToast('请先选择要识别的图片');
                return;
            }
            var file = imageInput.files[0];
            if (file.size > MAX_SIZE) {
                showToast('图片大小不能超过 5MB');
                return;
            }
            var fd = new FormData();
            fd.append('image', file);
            ocrBtn.disabled = true;
            ocrBtn.textContent = '识别中...';
            fetch('/api/ocr/extract', {
                method: 'POST',
                body: fd
            }).then(function (r) { return r.json(); })
              .then(function (res) {
                  if (!res.success) {
                      showToast(res.message || '识别失败');
                      return;
                  }
                  var d = res.data || {};
                  if (d.type) document.getElementById('type').value = d.type;
                  if (d.time) document.getElementById('time').value = d.time;
                  if (d.place) document.getElementById('place').value = d.place;
                  if (d.province) document.getElementById('province').value = d.province;
                  if (d.city) document.getElementById('city').value = d.city;
                  var ocrTa = document.getElementById('ocr_text');
                  if (ocrTa && d.raw_text) ocrTa.value = d.raw_text;
                  var tc = document.getElementById('theme_color');
                  if (tc && d.theme_color) tc.value = d.theme_color;
                  var hintParts = [];
                  if (d.matched_keyword) hintParts.push('命中关键词：「' + d.matched_keyword + '」');
                  if (d.type) hintParts.push('建议类型：' + d.type);
                  applyThemePreview(d.theme_color, d.theme_label, hintParts.join(' · '));
                  showToast('识别完成，请校对结构化信息与全文');
              })
              .catch(function () {
                  showToast('识别失败，请稍后重试');
              })
              .finally(function () {
                  ocrBtn.disabled = false;
                  ocrBtn.textContent = '自动识别';
              });
        });
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validate()) return;
        var fd = new FormData(form);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/tickets');
        xhr.onload = function () {
            var res;
            try {
                res = JSON.parse(xhr.responseText);
            } catch (err) {
                showToast('上传失败');
                return;
            }
            if (res.success) {
                showToast('上传成功');
                setTimeout(function () {
                    window.location.href = '/list';
                }, 800);
            } else {
                showToast(res.message || '上传失败');
            }
        };
        xhr.onerror = function () {
            showToast('网络错误，请重试');
        };
        xhr.send(fd);
    });
})();

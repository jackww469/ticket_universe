/**
 * 公共：Toast 提示
 */
function showToast(message, duration) {
    duration = duration || 2500;
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function () {
        el.classList.remove('show');
    }, duration);
}

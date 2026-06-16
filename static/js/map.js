/**
 * 地图页：足迹地图展示
 */
(function () {
    var mapView = document.getElementById('mapView');
    var mapLoading = document.getElementById('mapLoading');
    var mapPlaceholder = document.getElementById('mapPlaceholder');
    var chinaSvg = document.getElementById('chinaSvg');
    var mapSidebar = document.getElementById('mapSidebar');
    var provinceList = document.getElementById('provinceList');
    var provinceFilter = document.getElementById('provinceFilter');
    var provinceLoading = document.getElementById('provinceLoading');
    var statCities = document.getElementById('statCities');
    var statProvinces = document.getElementById('statProvinces');
    var statTotal = document.getElementById('statTotal');

    var allData = [];
    var cityStats = { provinces: [], cities: [] };

    // 中国省份与简称映射
    var PROVINCE_MAP = {
        '北京': 'BJ', '天津': 'TJ', '河北': 'HE', '山西': 'SX',
        '内蒙古': 'NM', '辽宁': 'LN', '吉林': 'JL', '黑龙江': 'HL',
        '上海': 'SH', '江苏': 'JS', '浙江': 'ZJ', '安徽': 'AH',
        '福建': 'FJ', '江西': 'JX', '山东': 'SD', '河南': 'HA',
        '湖北': 'HB', '湖南': 'HN', '广东': 'GD', '广西': 'GX',
        '海南': 'HI', '重庆': 'CQ', '四川': 'SC', '贵州': 'GZ',
        '云南': 'YN', '西藏': 'XZ', '陕西': 'SN', '甘肃': 'GS',
        '青海': 'QH', '宁夏': 'NX', '新疆': 'XJ', '台湾': 'TW',
        '香港': 'HK', '澳门': 'MO'
    };

    // 简写到省份名的反向映射
    var CODE_TO_PROVINCE = {};
    for (var p in PROVINCE_MAP) {
        CODE_TO_PROVINCE[PROVINCE_MAP[p]] = p;
    }

    // 省份中心点坐标（简化版，用于在 SVG 上定位）
    var PROVINCE_POSITIONS = {
        'BJ': { x: 630, y: 200 }, 'TJ': { x: 640, y: 220 }, 'HE': { x: 580, y: 220 },
        'SX': { x: 560, y: 260 }, 'NM': { x: 480, y: 180 }, 'LN': { x: 640, y: 160 },
        'JL': { x: 680, y: 140 }, 'HL': { x: 650, y: 80 }, 'SH': { x: 660, y: 320 },
        'JS': { x: 630, y: 300 }, 'ZJ': { x: 650, y: 360 }, 'AH': { x: 610, y: 320 },
        'FJ': { x: 640, y: 420 }, 'JX': { x: 600, y: 380 }, 'SD': { x: 600, y: 270 },
        'HA': { x: 570, y: 300 }, 'HB': { x: 570, y: 330 }, 'HN': { x: 570, y: 400 },
        'GD': { x: 580, y: 450 }, 'GX': { x: 520, y: 450 }, 'HI': { x: 540, y: 510 },
        'CQ': { x: 500, y: 360 }, 'SC': { x: 480, y: 380 }, 'GZ': { x: 500, y: 430 },
        'YN': { x: 450, y: 450 }, 'XZ': { x: 350, y: 350 }, 'SN': { x: 500, y: 280 },
        'GS': { x: 420, y: 290 }, 'QH': { x: 380, y: 300 }, 'NX': { x: 450, y: 270 },
        'XJ': { x: 200, y: 250 }, 'TW': { x: 680, y: 450 }, 'HK': { x: 580, y: 480 },
        'MO': { x: 565, y: 485 }
    };

    function esc(s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function initMap() {
        mapLoading.style.display = 'none';
        if (!allData.length) {
            mapPlaceholder.style.display = 'flex';
            return;
        }
        mapPlaceholder.style.display = 'none';
        chinaSvg.style.display = 'block';
        renderMap();
    }

    function renderMap() {
        var visitedProvinces = {};
        cityStats.cities.forEach(function (c) {
            if (c.province && PROVINCE_MAP[c.province]) {
                visitedProvinces[PROVINCE_MAP[c.province]] = true;
            }
        });

        var html = '<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">';
        html += '<defs>';
        html += '<linearGradient id="mapGrad" x1="0%" y1="0%" x2="0%" y2="100%">';
        html += '<stop offset="0%" style="stop-color:#f8f6f1"/>';
        html += '<stop offset="100%" style="stop-color:#e8e0d4"/>';
        html += '</linearGradient>';
        html += '</defs>';

        // 背景
        html += '<rect width="800" height="600" fill="url(#mapGrad)" rx="12"/>';

        // 绘制省份点
        for (var code in PROVINCE_POSITIONS) {
            var pos = PROVINCE_POSITIONS[code];
            var isVisited = visitedProvinces[code];
            var provinceName = CODE_TO_PROVINCE[code];
            var citiesInProvince = cityStats.cities.filter(function (c) {
                return c.province === provinceName;
            });
            var ticketCount = citiesInProvince.reduce(function (sum, c) { return sum + c.count; }, 0);

            var color = isVisited ? '#c41e3a' : '#ddd';
            var opacity = isVisited ? 0.8 : 0.3;
            var size = Math.min(8 + ticketCount * 2, 20);

            html += '<circle class="province-dot ' + (isVisited ? 'visited' : 'default') + '" ';
            html += 'cx="' + pos.x + '" cy="' + pos.y + '" r="' + size + '" ';
            html += 'fill="' + color + '" opacity="' + opacity + '" ';
            html += 'data-province="' + esc(provinceName || '') + '" ';
            html += 'data-count="' + ticketCount + '">';
            html += '<title>' + esc(provinceName || code) + ' - ' + ticketCount + '张票据</title>';
            html += '</circle>';

            // 省份标签（仅已访问的显示）
            if (isVisited) {
                html += '<text x="' + pos.x + '" y="' + (pos.y + size + 14) + '" ';
                html += 'text-anchor="middle" font-size="11" fill="#8b4513" font-weight="500">';
                html += esc(provinceName) + '</text>';
            }
        }

        // 添加连接线（简单示意）
        var visitedCodes = Object.keys(visitedProvinces);
        if (visitedCodes.length > 1) {
            html += '<g class="connections" opacity="0.15">';
            for (var i = 0; i < visitedCodes.length - 1; i++) {
                var c1 = PROVINCE_POSITIONS[visitedCodes[i]];
                var c2 = PROVINCE_POSITIONS[visitedCodes[i + 1]];
                if (c1 && c2) {
                    html += '<line x1="' + c1.x + '" y1="' + c1.y + '" x2="' + c2.x + '" y2="' + c2.y + '" ';
                    html += 'stroke="#8b4513" stroke-width="1" stroke-dasharray="4,4"/>';
                }
            }
            html += '</g>';
        }

        html += '</svg>';
        chinaSvg.innerHTML = html;

        // 绑定省份点点击事件
        chinaSvg.querySelectorAll('.province-dot.visited').forEach(function (dot) {
            dot.style.cursor = 'pointer';
            dot.addEventListener('click', function () {
                var prov = dot.getAttribute('data-province');
                if (prov) {
                    provinceFilter.value = prov;
                    filterByProvince(prov);
                }
            });
        });
    }

    function renderProvinces() {
        provinceLoading.style.display = 'none';
        if (!cityStats.provinces.length) {
            provinceList.innerHTML = '<div class="empty-hint">暂无省份数据</div>';
            return;
        }

        // 填充筛选器
        var optionsHtml = '<option value="">全部省份</option>';
        cityStats.provinces.forEach(function (p) {
            optionsHtml += '<option value="' + esc(p.province) + '">' + esc(p.province) + '</option>';
        });
        provinceFilter.innerHTML = optionsHtml;

        renderProvinceList();
    }

    function renderProvinceList() {
        var filterValue = provinceFilter.value;
        var provinces = filterValue
            ? cityStats.provinces.filter(function (p) { return p.province === filterValue; })
            : cityStats.provinces;

        if (!provinces.length) {
            provinceList.innerHTML = '<div class="empty-hint">该省份暂无数据</div>';
            return;
        }

        var html = '';
        provinces.forEach(function (p) {
            html += '<div class="province-item" data-province="' + esc(p.province) + '">';
            html += '<div class="province-header">';
            html += '<span class="province-name">' + esc(p.province) + '</span>';
            html += '<span class="province-count">' + p.ticket_count + '张 · ' + p.city_count + '城</span>';
            html += '</div>';
            html += '<div class="province-cities">' + esc(p.cities.join('、')) + '</div>';
            html += '</div>';
        });
        provinceList.innerHTML = html;
    }

    function filterByProvince(province) {
        renderProvinceList();
        mapSidebar.scrollTop = 0;
    }

    provinceFilter.addEventListener('change', function () {
        renderProvinceList();
    });

    // 加载数据
    Promise.all([
        fetch('/api/tickets/map').then(function (r) { return r.json(); }),
        fetch('/api/stats/cities').then(function (r) { return r.json(); })
    ]).then(function (results) {
        var mapRes = results[0];
        var cityRes = results[1];

        if (mapRes.success && mapRes.data) {
            allData = mapRes.data;
        }
        if (cityRes.success && cityRes.data) {
            cityStats = cityRes.data;
            statCities.textContent = cityStats.total_cities;
            statProvinces.textContent = cityStats.total_provinces;
            statTotal.textContent = cityStats.cities.reduce(function (sum, c) { return sum + c.count; }, 0);
        }

        initMap();
        renderProvinces();
    }).catch(function () {
        mapLoading.style.display = 'none';
        mapPlaceholder.style.display = 'flex';
        mapPlaceholder.querySelector('p').textContent = '加载失败，请刷新重试';
    });
})();

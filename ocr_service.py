# -*- coding: utf-8 -*-
"""
OCR 服务封装（百度通用文字识别）+ 简单规则抽取票据关键信息
"""
import base64
import re
import time
from typing import Dict, Any, List, Tuple

import requests

from config import BAIDU_OCR_API_KEY, BAIDU_OCR_SECRET_KEY, BAIDU_OCR_ENABLED
from theme_rules import match_theme_from_text

_access_token_cache: Dict[str, Any] = {
    "token": "",
    "expire_at": 0,
}


def _get_access_token() -> str:
    if not BAIDU_OCR_ENABLED:
        raise RuntimeError("百度 OCR 未配置，请设置环境变量 BAIDU_OCR_API_KEY / BAIDU_OCR_SECRET_KEY")
    now = time.time()
    if _access_token_cache["token"] and now < _access_token_cache["expire_at"]:
        return _access_token_cache["token"]
    url = (
        "https://aip.baidubce.com/oauth/2.0/token"
        f"?grant_type=client_credentials&client_id={BAIDU_OCR_API_KEY}"
        f"&client_secret={BAIDU_OCR_SECRET_KEY}"
    )
    resp = requests.get(url, timeout=8)
    data = resp.json()
    token = data.get("access_token")
    if not token:
        raise RuntimeError("获取百度 OCR access_token 失败，请检查 API Key / Secret Key")
    # 官方默认有效期 30 天，这里简单缓存 25 天
    _access_token_cache["token"] = token
    _access_token_cache["expire_at"] = now + 25 * 24 * 60 * 60
    return token


def ocr_image_to_text(image_bytes: bytes) -> List[str]:
    """
    调用百度通用文字识别，返回识别出的每一行文字列表。
    """
    token = _get_access_token()
    ocr_url = f"https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token={token}"
    img_b64 = base64.b64encode(image_bytes).decode("utf-8")
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    data = {"image": img_b64}
    resp = requests.post(ocr_url, headers=headers, data=data, timeout=10)
    resp.raise_for_status()
    j = resp.json()
    if "words_result" not in j:
        raise RuntimeError("OCR 返回结果异常")
    return [item.get("words", "") for item in j.get("words_result", [])]


def _extract_date(text: str) -> str:
    """
    从文本中提取日期，返回 yyyy-mm-dd 格式（简单规则）。
    """
    # 匹配 2025-10-08 / 2025/10/8 / 2025.10.08 / 2025年10月8日
    patterns = [
        r"(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})",
        r"(\d{4})年(\d{1,2})月(\d{1,2})日?",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            y, mth, d = m.group(1), int(m.group(2)), int(m.group(3))
            return f"{y}-{mth:02d}-{d:02d}"
    return ""


def _guess_type(text: str) -> str:
    """
    根据关键字粗略猜测票据类型。
    """
    t = text
    if any(k in t for k in ["车票", "火车票", "动车", "高铁", "站", "Railway"]):
        return "车票"
    if any(k in t for k in ["演唱会", "音乐会", "音乐剧", "话剧", "演出票", "剧场", "剧院"]):
        return "演出票"
    if any(k in t for k in ["景区", "公园", "景点", "门票", "山", "湖", "园", "博物馆"]):
        return "景区票"
    if any(k in t for k in ["证书", "奖状", "荣誉", "资格证", "证件"]):
        return "证书"
    return ""


def _guess_place(lines: List[str]) -> str:
    """
    从多行文本中尝试提取地点信息。
    """
    full = " ".join(lines)
    # 简单规则：包含“站 / 剧院 / 公园 / 景区 / 馆”等关键字的整行
    place_keywords = ["站", "剧院", "大剧院", "音乐厅", "公园", "景区", "广场", "博物馆", "体育馆", "影城"]
    for line in lines:
        if any(k in line for k in place_keywords):
            return line.strip()
    # 退化：如果整段里有“北京 / 上海 / 广州 / 深圳 / 成都 / 杭州 / 南京 / 西安 / 重庆 / 武汉”
    cities = ["北京", "上海", "广州", "深圳", "成都", "杭州", "南京", "西安", "重庆", "武汉", "青岛"]
    for c in cities:
        if c in full:
            return c
    return ""


# 省份与城市的映射表（简化版）
PROVINCE_CITY_MAP = {
    "北京": ("北京", "北京"),
    "天津": ("天津", "天津"),
    "上海": ("上海", "上海"),
    "重庆": ("重庆", "重庆"),
    "河北": {"石家庄": "石家庄", "唐山": "唐山", "秦皇岛": "秦皇岛", "邯郸": "邯郸", "邢台": "邢台", "保定": "保定", "张家口": "张家口", "承德": "承德", "沧州": "沧州", "廊坊": "廊坊", "衡水": "衡水"},
    "山西": {"太原": "太原", "大同": "大同", "阳泉": "阳泉", "长治": "长治", "晋城": "晋城", "朔州": "朔州", "晋中": "晋中", "运城": "运城", "忻州": "忻州", "临汾": "临汾", "吕梁": "吕梁"},
    "内蒙古": {"呼和浩特": "呼和浩特", "包头": "包头", "乌海": "乌海", "赤峰": "赤峰", "通辽": "通辽", "鄂尔多斯": "鄂尔多斯", "呼伦贝尔": "呼伦贝尔", "巴彦淖尔": "巴彦淖尔", "乌兰察布": "乌兰察布"},
    "辽宁": {"沈阳": "沈阳", "大连": "大连", "鞍山": "鞍山", "抚顺": "抚顺", "本溪": "本溪", "丹东": "丹东", "锦州": "锦州", "营口": "营口", "阜新": "阜新", "辽阳": "辽阳", "盘锦": "盘锦", "铁岭": "铁岭", "朝阳": "朝阳", "葫芦岛": "葫芦岛"},
    "吉林": {"长春": "长春", "吉林": "吉林", "四平": "四平", "辽源": "辽源", "通化": "通化", "白山": "白山", "松原": "松原", "白城": "白城", "延边": "延边"},
    "黑龙江": {"哈尔滨": "哈尔滨", "齐齐哈尔": "齐齐哈尔", "鸡西": "鸡西", "鹤岗": "鹤岗", "双鸭山": "双鸭山", "大庆": "大庆", "伊春": "伊春", "佳木斯": "佳木斯", "七台河": "七台河", "牡丹江": "牡丹江", "黑河": "黑河", "绥化": "绥化"},
    "江苏": {"南京": "南京", "无锡": "无锡", "徐州": "徐州", "常州": "常州", "苏州": "苏州", "南通": "南通", "连云港": "连云港", "淮安": "淮安", "盐城": "盐城", "扬州": "扬州", "镇江": "镇江", "泰州": "泰州", "宿迁": "宿迁"},
    "浙江": {"杭州": "杭州", "宁波": "宁波", "温州": "温州", "嘉兴": "嘉兴", "湖州": "湖州", "绍兴": "绍兴", "金华": "金华", "衢州": "衢州", "舟山": "舟山", "台州": "台州", "丽水": "丽水"},
    "安徽": {"合肥": "合肥", "芜湖": "芜湖", "蚌埠": "蚌埠", "淮南": "淮南", "马鞍山": "马鞍山", "淮北": "淮北", "铜陵": "铜陵", "安庆": "安庆", "黄山": "黄山", "滁州": "滁州", "阜阳": "阜阳", "宿州": "宿州", "六安": "六安", "亳州": "亳州", "池州": "池州", "宣城": "宣城"},
    "福建": {"福州": "福州", "厦门": "厦门", "莆田": "莆田", "三明": "三明", "泉州": "泉州", "漳州": "漳州", "南平": "南平", "龙岩": "龙岩", "宁德": "宁德"},
    "江西": {"南昌": "南昌", "景德镇": "景德镇", "萍乡": "萍乡", "九江": "九江", "新余": "新余", "鹰潭": "鹰潭", "赣州": "赣州", "吉安": "吉安", "宜春": "宜春", "抚州": "抚州", "上饶": "上饶"},
    "山东": {"济南": "济南", "青岛": "青岛", "淄博": "淄博", "枣庄": "枣庄", "东营": "东营", "烟台": "烟台", "潍坊": "潍坊", "济宁": "济宁", "泰安": "泰安", "威海": "威海", "日照": "日照", "临沂": "临沂", "德州": "德州", "聊城": "聊城", "滨州": "滨州", "菏泽": "菏泽"},
    "河南": {"郑州": "郑州", "开封": "开封", "洛阳": "洛阳", "平顶山": "平顶山", "安阳": "安阳", "鹤壁": "鹤壁", "新乡": "新乡", "焦作": "焦作", "濮阳": "濮阳", "许昌": "许昌", "漯河": "漯河", "三门峡": "三门峡", "南阳": "南阳", "商丘": "商丘", "信阳": "信阳", "周口": "周口", "驻马店": "驻马店"},
    "湖北": {"武汉": "武汉", "黄石": "黄石", "十堰": "十堰", "宜昌": "宜昌", "襄阳": "襄阳", "鄂州": "鄂州", "荆门": "荆门", "孝感": "孝感", "荆州": "荆州", "黄冈": "黄冈", "咸宁": "咸宁", "随州": "随州", "恩施": "恩施"},
    "湖南": {"长沙": "长沙", "株洲": "株洲", "湘潭": "湘潭", "衡阳": "衡阳", "邵阳": "邵阳", "岳阳": "岳阳", "常德": "常德", "张家界": "张家界", "益阳": "益阳", "郴州": "郴州", "永州": "永州", "怀化": "怀化", "娄底": "娄底", "湘西": "湘西"},
    "广东": {"广州": "广州", "深圳": "深圳", "珠海": "珠海", "汕头": "汕头", "佛山": "佛山", "韶关": "韶关", "湛江": "湛江", "肇庆": "肇庆", "江门": "江门", "茂名": "茂名", "惠州": "惠州", "梅州": "梅州", "汕尾": "汕尾", "河源": "河源", "阳江": "阳江", "清远": "清远", "东莞": "东莞", "中山": "中山", "潮州": "潮州", "揭阳": "揭阳", "云浮": "云浮"},
    "广西": {"南宁": "南宁", "柳州": "柳州", "桂林": "桂林", "梧州": "梧州", "北海": "北海", "防城港": "防城港", "钦州": "钦州", "贵港": "贵港", "玉林": "玉林", "百色": "百色", "贺州": "贺州", "河池": "河池", "来宾": "来宾", "崇左": "崇左"},
    "海南": {"海口": "海口", "三亚": "三亚", "三沙": "三沙", "儋州": "儋州"},
    "四川": {"成都": "成都", "自贡": "自贡", "攀枝花": "攀枝花", "泸州": "泸州", "德阳": "德阳", "绵阳": "绵阳", "广元": "广元", "遂宁": "遂宁", "内江": "内江", "乐山": "乐山", "南充": "南充", "眉山": "眉山", "宜宾": "宜宾", "广安": "广安", "达州": "达州", "雅安": "雅安", "巴中": "巴中", "资阳": "资阳", "阿坝": "阿坝", "甘孜": "甘孜", "凉山": "凉山"},
    "贵州": {"贵阳": "贵阳", "六盘水": "六盘水", "遵义": "遵义", "安顺": "安顺", "毕节": "毕节", "铜仁": "铜仁", "黔西南": "黔西南", "黔东南": "黔东南", "黔南": "黔南"},
    "云南": {"昆明": "昆明", "曲靖": "曲靖", "玉溪": "玉溪", "保山": "保山", "昭通": "昭通", "丽江": "丽江", "普洱": "普洱", "临沧": "临沧", "楚雄": "楚雄", "红河": "红河", "文山": "文山", "西双版纳": "西双版纳", "大理": "大理", "德宏": "德宏", "怒江": "怒江", "迪庆": "迪庆"},
    "西藏": {"拉萨": "拉萨", "日喀则": "日喀则", "昌都": "昌都", "林芝": "林芝", "山南": "山南", "那曲": "那曲", "阿里": "阿里"},
    "陕西": {"西安": "西安", "铜川": "铜川", "宝鸡": "宝鸡", "咸阳": "咸阳", "渭南": "渭南", "延安": "延安", "汉中": "汉中", "榆林": "榆林", "安康": "安康", "商洛": "商洛"},
    "甘肃": {"兰州": "兰州", "嘉峪关": "嘉峪关", "金昌": "金昌", "白银": "白银", "天水": "天水", "武威": "武威", "张掖": "张掖", "平凉": "平凉", "酒泉": "酒泉", "庆阳": "庆阳", "定西": "定西", "陇南": "陇南", "临夏": "临夏", "甘南": "甘南"},
    "青海": {"西宁": "西宁", "海东": "海东", "海北": "海北", "黄南": "黄南", "海南州": "海南州", "果洛": "果洛", "玉树": "玉树", "海西": "海西"},
    "宁夏": {"银川": "银川", "石嘴山": "石嘴山", "吴忠": "吴忠", "固原": "固原", "中卫": "中卫"},
    "新疆": {"乌鲁木齐": "乌鲁木齐", "克拉玛依": "克拉玛依", "吐鲁番": "吐鲁番", "哈密": "哈密", "昌吉": "昌吉", "博尔塔拉": "博尔塔拉", "巴音郭楞": "巴音郭楞", "阿克苏": "阿克苏", "克孜勒苏": "克孜勒苏", "喀什": "喀什", "和田": "和田", "伊犁": "伊犁", "塔城": "塔城", "阿勒泰": "阿勒泰"},
    "香港": ("香港", "香港"),
    "澳门": ("澳门", "澳门"),
    "台湾": {"台北": "台北", "新北": "新北", "桃园": "桃园", "台中": "台中", "台南": "台南", "高雄": "高雄"},
}


def _extract_location(text: str) -> Tuple[str, str]:
    """
    从文本中提取省份和城市信息。
    返回 (province, city)
    """
    # 先检查直辖市
    for city in ["北京", "上海", "天津", "重庆"]:
        if city in text:
            return (city, city)

    # 检查省份及其下辖城市
    for province, cities in PROVINCE_CITY_MAP.items():
        if province in text:
            if isinstance(cities, tuple):
                return (province, cities[1])
            for city in cities:
                if city in text:
                    return (province, city)
            return (province, "")

    return ("", "")


def extract_ticket_fields(image_bytes: bytes) -> Dict[str, str]:
    """
    OCR + 规则抽取，返回可用于自动填充表单的字段：
    - type: 建议票据类型（规则库优先，其次关键字启发）
    - time: 日期（yyyy-mm-dd，可能为空）
    - place: 地点（可能为空）
    - province: 省份（可能为空）
    - city: 城市（可能为空）
    - raw_text: 完整识别文本（供独立编辑区展示）
    - theme_color / theme_label: 规则库匹配的主题色与名称
    - matched_keyword: 命中的关键词（若有）
    """
    lines = ocr_image_to_text(image_bytes)
    full_text = "\n".join(lines)
    date = _extract_date(full_text)
    place = _guess_place(lines)
    province, city = _extract_location(full_text)
    theme_color, theme_label, rule_type, matched_kw = match_theme_from_text(full_text)
    heuristic_type = _guess_type(full_text)
    ticket_type = (rule_type or "").strip() or heuristic_type
    return {
        "type": ticket_type,
        "time": date,
        "place": place,
        "province": province,
        "city": city,
        "raw_text": full_text,
        "theme_color": theme_color,
        "theme_label": theme_label,
        "matched_keyword": matched_kw or "",
    }


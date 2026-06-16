# -*- coding: utf-8 -*-
"""关键词 → 建议类型 + 主题色（规则库，可编辑 data/theme_rules.json）"""
import json
import os
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

from config import BASE_DIR

RULES_PATH = os.path.join(BASE_DIR, "data", "theme_rules.json")


@lru_cache(maxsize=1)
def _load_rules_raw() -> Dict[str, Any]:
    if not os.path.isfile(RULES_PATH):
        return {
            "default": {"theme_color": "#808080", "label": "通用票根"},
            "rules": [],
        }
    with open(RULES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def reload_theme_rules() -> None:
    """开发时修改 JSON 后可调用清空缓存（当前进程内）"""
    _load_rules_raw.cache_clear()


def match_theme_from_text(full_text: str) -> Tuple[str, str, str, Optional[str]]:
    """
    根据全文匹配规则库。
    返回: (theme_color, theme_label, suggested_type_or_empty, matched_keyword)
    suggested_type 为空表示未从规则得到类型，可回退到启发式。
    """
    data = _load_rules_raw()
    default = data.get("default") or {}
    def_color = default.get("theme_color") or "#808080"
    def_label = default.get("label") or "通用票根"
    rules: List[Dict[str, Any]] = list(data.get("rules") or [])

    # 优先匹配更长关键词，减少误触
    def sort_key(r: Dict[str, Any]) -> int:
        kws = r.get("keywords") or []
        return max((len(k) for k in kws), default=0)

    rules.sort(key=sort_key, reverse=True)

    for rule in rules:
        kws = rule.get("keywords") or []
        for kw in kws:
            if kw and kw in full_text:
                color = rule.get("theme_color") or def_color
                label = rule.get("label") or def_label
                stype = (rule.get("type") or "").strip()
                return color, label, stype, kw

    return def_color, def_label, "", None

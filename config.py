# -*- coding: utf-8 -*-
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, 'ticket_universe.db')
# 会话加密密钥（生产环境务必通过环境变量设置）
SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'dev-ticket-universe-change-me')
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB

# 票据类型枚举（与前端一致）
# 说明：业务上仍以具体类型字段为准，"其他" 只是列表筛选用的汇总分类
TICKET_TYPES = ['全部', '车票', '演出票', '景区票', '证书', '其他']

# OCR 配置（使用百度通用文字识别）
# 为避免泄露密钥，推荐通过环境变量设置：
#   BAIDU_OCR_API_KEY
#   BAIDU_OCR_SECRET_KEY
BAIDU_OCR_API_KEY = os.getenv('BAIDU_OCR_API_KEY', '')
BAIDU_OCR_SECRET_KEY = os.getenv('BAIDU_OCR_SECRET_KEY', '')
BAIDU_OCR_ENABLED = bool(BAIDU_OCR_API_KEY and BAIDU_OCR_SECRET_KEY)

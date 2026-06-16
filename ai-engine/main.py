# 应急快报 AI 引擎
# 负责：语音转文字、图片OCR、文本分类、快报生成
# 调用华为云 AI 服务

import json
import os
import time
import requests
from typing import List, Dict, Any

# 华为云 AI 服务配置（需替换为实际密钥）
HUAWEI_AI_APPCODE = os.environ.get('HUAWEI_AI_APPCODE', '')
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:3000')

class AIEngine:
    """AI 引擎主类"""

    def __init__(self):
        self.headers = {
            'Content-Type': 'application/json'
        }
        if HUAWEI_AI_APPCODE:
            self.headers['X-APIG-AppCode'] = HUAWEI_AI_APPCODE

    def voice_to_text(self, audio_path: str) -> str:
        """
        语音转文字
        调用华为云语音识别服务
        """
        if not HUAWEI_AI_APPCODE:
            return "(语音转文字服务未配置)"

        url = "https://api.huaweicloud.com/v1/voice/asr"
        try:
            with open(audio_path, 'rb') as f:
                audio_data = f.read()
            payload = {
                'audio': audio_data.hex(),
                'sampleRate': 16000,
                'language': 'zh'
            }
            resp = requests.post(url, json=payload, headers=self.headers, timeout=30)
            if resp.status_code == 200:
                result = resp.json()
                return result.get('text', '')
        except Exception as e:
            print(f"语音转文字失败: {e}")
        return ""

    def image_ocr(self, image_path: str) -> str:
        """
        图片 OCR 识别
        调用华为云 OCR 服务
        """
        if not HUAWEI_AI_APPCODE:
            return ""

        url = "https://api.huaweicloud.com/v1/ocr/general"
        try:
            with open(image_path, 'rb') as f:
                img_data = f.read()
            payload = {
                'image': img_data.hex(),
                'language': 'zh'
            }
            resp = requests.post(url, json=payload, headers=self.headers, timeout=30)
            if resp.status_code == 200:
                result = resp.json()
                words = result.get('words', [])
                return '\n'.join([w.get('text', '') for w in words])
        except Exception as e:
            print(f"图片OCR失败: {e}")
        return ""

    def classify_material(self, text: str) -> str:
        """
        素材分类：判断属于哪个快报板块
        """
        keywords_map = {
            'casualties': ['死亡', '受伤', '失联', '伤亡', '遇难', '被困', '送医', '重症'],
            'response_progress': ['救援', '疏散', '出动', '消防', '搜救', '医疗队', '安置', '帐篷', '物资'],
            'coordination': ['请求', '支援', '短缺', '急需', '协调', '求助', '不够', '缺乏'],
            'site_conditions': ['坍塌', '倒塌', '损毁', '裂缝', '滑坡', '火灾', '洪水', '断裂'],
        }
        for category, keywords in keywords_map.items():
            for kw in keywords:
                if kw in text:
                    return category
        return 'event_overview'

    def generate_summary(self, sections: List[Dict]) -> str:
        """
        生成快报摘要
        """
        all_items = []
        for sec in sections:
            all_items.extend(sec.get('items', []))
        if not all_items:
            return "暂无信息"
        summary = '；'.join(all_items[:3])
        if len(all_items) > 3:
            summary += '……'
        return summary

    def process_materials(self, materials: List[Dict]) -> Dict:
        """
        处理素材列表，生成结构化快报内容
        """
        sections = {
            'event_overview': {'title': '事件概况', 'items': [], 'sources': []},
            'casualties': {'title': '伤亡情况', 'items': [], 'sources': []},
            'response_progress': {'title': '处置进展', 'items': [], 'sources': []},
            'coordination': {'title': '需协调事项', 'items': [], 'sources': []},
            'site_conditions': {'title': '现场情况', 'items': [], 'sources': []},
        }

        for mat in materials:
            text = mat.get('content', '') or mat.get('voice_text', '') or mat.get('ocr_text', '')
            if not text:
                continue

            category = self.classify_material(text)
            if text not in sections[category]['items']:
                sections[category]['items'].append(text)
                sections[category]['sources'].append(mat.get('id', ''))

        # 移除空板块
        result = []
        for key, sec in sections.items():
            if sec['items']:
                result.append(sec)

        return result


# 简易 HTTP 服务（可选，用于独立部署）
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

class AIHandler(BaseHTTPRequestHandler):
    engine = AIEngine()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        data = json.loads(body) if body else {}

        path = urllib.parse.urlparse(self.path).path

        if path == '/voice-to-text':
            result = self.engine.voice_to_text(data.get('audio_path', ''))
        elif path == '/ocr':
            result = self.engine.image_ocr(data.get('image_path', ''))
        elif path == '/classify':
            result = self.engine.classify_material(data.get('text', ''))
        elif path == '/generate-summary':
            result = self.engine.generate_summary(data.get('sections', []))
        elif path == '/process-materials':
            result = self.engine.process_materials(data.get('materials', []))
        else:
            result = {'error': 'unknown path'}

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({
            'service': '应急快报 AI 引擎',
            'version': '0.1.0',
            'endpoints': ['/voice-to-text', '/ocr', '/classify', '/generate-summary', '/process-materials']
        }).encode())


def start_ai_server(port: int = 5000):
    server = HTTPServer(('0.0.0.0', port), AIHandler)
    print(f"🤖 AI 引擎启动 - 端口 {port}")
    server.serve_forever()


if __name__ == '__main__':
    start_ai_server()

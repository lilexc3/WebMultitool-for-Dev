# backend/core/site_checks.py
"""
Функции проверки сайтов (взяты из bot.py и очищены от Telegram)
"""
import requests
import subprocess
import re
import socket
import time
from datetime import datetime
from urllib.parse import urlparse
import os

def check_site_health(url: str) -> dict:
    """Быстрая проверка доступности сайта"""
    try:
        start = datetime.now()
        insecure_tls = os.getenv("ALLOW_INSECURE_TLS", "false").lower() in ("1", "true", "yes")
        resp = requests.get(url, timeout=10, verify=not insecure_tls)
        elapsed = (datetime.now() - start).total_seconds()
        return {
            "is_accessible": resp.status_code < 400,
            "status_code": resp.status_code,
            "response_time": round(elapsed, 3)
        }
    except requests.exceptions.Timeout:
        return {"is_accessible": False, "status_code": 0, "response_time": 0, "error": "Timeout"}
    except requests.exceptions.ConnectionError:
        return {"is_accessible": False, "status_code": 0, "response_time": 0, "error": "Connection failed"}
    except Exception as e:
        return {"is_accessible": False, "status_code": 0, "response_time": 0, "error": str(e)}

def get_site_full_stats(url: str) -> dict:
    """Полная статистика сайта (HTTP, Ping, DNS, SSL)"""
    stats = {
        'url': url,
        'timestamp': datetime.now().isoformat(),
        'http': {},
        'ping': {},
        'dns': {},
        'ssl': {},
        'server': {},
        'accessible': False
    }
    
    parsed = urlparse(url)
    hostname = parsed.hostname
    
    # HTTP проверка
    try:
        start = time.time()
        insecure_tls = os.getenv("ALLOW_INSECURE_TLS", "false").lower() in ("1", "true", "yes")
        resp = requests.get(url, timeout=10, verify=not insecure_tls,
                           headers={'User-Agent': 'DevOpsLab-Monitor/2.0'})
        stats['http'] = {
            'status_code': resp.status_code,
            'response_time': round(time.time() - start, 3),
            'content_length': len(resp.content),
            'content_type': resp.headers.get('Content-Type', 'Unknown'),
            'encoding': resp.encoding,
            'redirects': len(resp.history)
        }
        stats['accessible'] = resp.status_code < 400
        stats['server'] = {
            'server': resp.headers.get('Server', 'Unknown'),
            'x_powered_by': resp.headers.get('X-Powered-By', 'Not disclosed'),
            'via': resp.headers.get('Via', 'None'),
            'cache_control': resp.headers.get('Cache-Control', 'Not set'),
        }
    except Exception as e:
        stats['http'] = {'error': str(e)}
        stats['accessible'] = False
    
    # Ping
    try:
        ping_cmd = ['ping', '-c', '4', '-W', '2', hostname]
        result = subprocess.run(ping_cmd, capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            output = result.stdout
            loss = '0%' if '0% packet loss' in output else 'Unknown'
            rtt_match = re.search(r'min/avg/max/mdev = ([\d.]+)/([\d.]+)/([\d.]+)/([\d.]+)', output)
            if rtt_match:
                stats['ping'] = {
                    'min': float(rtt_match.group(1)),
                    'avg': float(rtt_match.group(2)),
                    'max': float(rtt_match.group(3)),
                    'loss': loss
                }
    except:
        stats['ping'] = {'error': 'Ping unavailable'}
    
    # DNS
    try:
        start = time.time()
        ip = socket.gethostbyname(hostname)
        dns_time = round((time.time() - start) * 1000, 2)
        stats['dns'] = {'ip': ip, 'resolution_time_ms': dns_time}
    except:
        stats['dns'] = {'error': 'DNS failed'}
    
    # SSL (только для HTTPS)
    if url.startswith('https'):
        try:
            import ssl
            ctx = ssl.create_default_context()
            with socket.create_connection((hostname, 443), timeout=5) as s:
                with ctx.wrap_socket(s, server_hostname=hostname) as ss:
                    cert = ss.getpeercert()
                    expire = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    days_left = (expire - datetime.now()).days
                    stats['ssl'] = {
                        'valid': True,
                        'expire_date': expire.strftime('%d.%m.%Y'),
                        'days_left': days_left,
                        'issuer': dict(x[0] for x in cert['issuer'])
                    }
        except:
            stats['ssl'] = {'valid': False}
    
    return stats
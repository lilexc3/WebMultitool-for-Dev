# backend/core/server_stats.py
"""
Функции получения статистики сервера (взяты из bot.py)
"""
import requests
import os

PROMETHEUS_URL = os.getenv('PROMETHEUS_URL', 'http://localhost:9090')

def get_server_stats() -> dict:
    """Получение статистики сервера из Prometheus"""
    stats = {
        'cpu': 0,
        'memory': 0,
        'memory_total': 0,
        'memory_used': 0,
        'disk': 0,
        'disk_total': 0,
        'disk_free': 0,
        'load1': 0,
        'load5': 0,
        'load15': 0,
        'uptime': 0
    }
    
    try:
        # CPU usage
        resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={
            'query': '100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[1m])) * 100)'
        }, timeout=5)
        data = resp.json()
        if data['data']['result']:
            stats['cpu'] = float(data['data']['result'][0]['value'][1])
        
        # Memory
        resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={
            'query': 'node_memory_MemTotal_bytes'
        }, timeout=5)
        data = resp.json()
        if data['data']['result']:
            stats['memory_total'] = float(data['data']['result'][0]['value'][1]) / 1024**3
        
        resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={
            'query': 'node_memory_MemAvailable_bytes'
        }, timeout=5)
        data = resp.json()
        if data['data']['result']:
            mem_avail = float(data['data']['result'][0]['value'][1]) / 1024**3
            stats['memory_used'] = stats['memory_total'] - mem_avail
            stats['memory'] = (stats['memory_used'] / stats['memory_total']) * 100
        
        # Disk
        resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={
            'query': 'node_filesystem_size_bytes{mountpoint="/"}'
        }, timeout=5)
        data = resp.json()
        if data['data']['result']:
            stats['disk_total'] = float(data['data']['result'][0]['value'][1]) / 1024**3
        
        resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={
            'query': 'node_filesystem_avail_bytes{mountpoint="/"}'
        }, timeout=5)
        data = resp.json()
        if data['data']['result']:
            stats['disk_free'] = float(data['data']['result'][0]['value'][1]) / 1024**3
            stats['disk'] = ((stats['disk_total'] - stats['disk_free']) / stats['disk_total']) * 100
        
        # Load Average
        resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={'query': 'node_load1'}, timeout=5)
        data = resp.json()
        if data['data']['result']:
            stats['load1'] = float(data['data']['result'][0]['value'][1])
        
        resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={'query': 'node_load5'}, timeout=5)
        data = resp.json()
        if data['data']['result']:
            stats['load5'] = float(data['data']['result'][0]['value'][1])
        
        resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={'query': 'node_load15'}, timeout=5)
        data = resp.json()
        if data['data']['result']:
            stats['load15'] = float(data['data']['result'][0]['value'][1])
        
        # Uptime (в днях)
        resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={
            'query': 'node_time_seconds - node_boot_time_seconds'
        }, timeout=5)
        data = resp.json()
        if data['data']['result']:
            stats['uptime'] = float(data['data']['result'][0]['value'][1]) / 86400
        
    except Exception as e:
        print(f"Error getting server stats: {e}")
    
    return stats
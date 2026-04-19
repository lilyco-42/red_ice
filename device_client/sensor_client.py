#!/usr/bin/env python3
"""
Red Ice Sensor Client for Radxa A7
Uploads sensor data to the Red Ice server.
"""

import json
import time
import yaml
import logging
import argparse
import subprocess
import threading
from datetime import datetime
from typing import Optional, List, Dict, Any

try:
    import requests
except ImportError:
    print("requests not found. Install with: pip install requests")
    requests = None


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


class SensorClient:
    def __init__(self, config_path: str = "config.yaml"):
        self.config = self._load_config(config_path)
        self.server_url = self.config.get("server", {}).get("url", "http://localhost:5150")
        self.api_key = self.config.get("server", {}).get("api_key", "")
        self.device_id = self.config.get("device", {}).get("id", "radxa-a7-001")
        self.upload_interval = self.config.get("device", {}).get("upload_interval", 60)
        self.sensors = self.config.get("sensors", [])

    def _load_config(self, path: str) -> Dict:
        try:
            with open(path, 'r') as f:
                return yaml.safe_load(f) or {}
        except FileNotFoundError:
            logger.warning(f"Config not found: {path}, using defaults")
            return {}

    def read_system_stats(self) -> Dict[str, float]:
        """Read system statistics on Linux."""
        stats = {}
        try:
            with open('/sys/class/thermal/thermal_zone0/temp') as f:
                stats['cpu_temp'] = float(f.read().strip()) / 1000.0
        except:
            stats['cpu_temp'] = 0

        try:
            with open('/proc/meminfo') as f:
                for line in f:
                    if line.startswith('MemAvailable:'):
                        stats['mem_available'] = int(line.split()[1]) / 1024
                    elif line.startswith('MemTotal:'):
                        stats['mem_total'] = int(line.split()[1]) / 1024
        except:
            pass

        try:
            result = subprocess.run(['cat', '/proc/uptime'], capture_output=True, text=True)
            stats['uptime'] = float(result.stdout.split()[0])
        except:
            stats['uptime'] = 0

        return stats

    def simulate_sensor_reading(self) -> List[Dict[str, Any]]:
        """Simulate sensor readings for testing."""
        import random
        stats = self.read_system_stats()
        readings = [
            {
                "device_id": self.device_id,
                "sensor_type": "temperature",
                "value": round(20 + random.uniform(-3, 5) + stats.get('cpu_temp', 0) * 0.1, 2)
            },
            {
                "device_id": self.device_id,
                "sensor_type": "humidity",
                "value": round(50 + random.uniform(-10, 20), 2)
            },
            {
                "device_id": self.device_id,
                "sensor_type": "cpu_temp",
                "value": round(stats.get('cpu_temp', 0), 2)
            },
            {
                "device_id": self.device_id,
                "sensor_type": "uptime",
                "value": round(stats.get('uptime', 0), 2)
            },
        ]
        return readings

    def upload_single(self, sensor_type: str, value: float) -> bool:
        """Upload a single sensor reading."""
        if not requests:
            return False

        url = f"{self.server_url}/api/sensor_data/device"
        data = {
            "device_id": self.device_id,
            "sensor_type": sensor_type,
            "value": value
        }

        try:
            resp = requests.post(
                url,
                json=data,
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": self.api_key
                },
                timeout=10
            )
            if resp.status_code == 200:
                logger.info(f"Uploaded {sensor_type}: {value}")
                return True
            else:
                logger.error(f"Upload failed: {resp.status_code}")
                return False
        except Exception as e:
            logger.error(f"Connection error: {e}")
            return False

    def upload_batch(self, readings: List[Dict[str, Any]]) -> bool:
        """Upload multiple sensor readings at once."""
        if not requests:
            return False

        url = f"{self.server_url}/api/sensor_data/device/batch"
        device_id = readings[0].get("device_id", self.device_id) if readings else self.device_id
        sensor_type = readings[0].get("sensor_type", "unknown") if readings else "unknown"
        values = [r.get("value", 0) for r in readings]

        data = {
            "device_id": device_id,
            "sensor_type": sensor_type,
            "values": values
        }

        try:
            resp = requests.post(
                url,
                json=data,
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": self.api_key
                },
                timeout=30
            )
            if resp.status_code == 200:
                logger.info(f"Batch uploaded {len(values)} readings")
                return True
            else:
                logger.error(f"Batch upload failed: {resp.status_code}")
                return False
        except Exception as e:
            logger.error(f"Connection error: {e}")
            return False

    def get_commands(self, token: str) -> List[Dict]:
        """Get available device commands."""
        if not requests:
            return []

        url = f"{self.server_url}/api/device/commands"
        try:
            resp = requests.get(
                url,
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            if resp.status_code == 200:
                return resp.json().get("commands", [])
            return []
        except:
            return []

    def send_command(self, token: str, command: str, device_id: str = None) -> Dict:
        """Send a command to the device."""
        if not requests:
            return {"success": False, "message": "requests not installed"}

        url = f"{self.server_url}/api/device/command"
        data = {
            "command": command,
            "device_id": device_id or self.device_id
        }

        try:
            resp = requests.post(
                url,
                json=data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}"
                },
                timeout=10
            )
            if resp.status_code == 200:
                return resp.json()
            return {"success": False, "message": f"HTTP {resp.status_code}"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def run(self, continuous: bool = True):
        """Run the sensor client."""
        logger.info(f"Starting sensor client for device: {self.device_id}")
        logger.info(f"Server: {self.server_url}")

        if continuous:
            try:
                while True:
                    readings = self.simulate_sensor_reading()
                    self.upload_batch(readings)
                    time.sleep(self.upload_interval)
            except KeyboardInterrupt:
                logger.info("Stopped by user")
        else:
            readings = self.simulate_sensor_reading()
            self.upload_batch(readings)


def main():
    parser = argparse.ArgumentParser(description="Red Ice Sensor Client")
    parser.add_argument("-c", "--config", default="config.yaml", help="Config file")
    parser.add_argument("--single", action="store_true", help="Run once")
    parser.add_argument("--command", type=str, help="Send command to device")
    parser.add_argument("--token", type=str, help="JWT token for commands")
    args = parser.parse_args()

    client = SensorClient(args.config)

    if args.command:
        result = client.send_command(args.token or "", args.command)
        print(json.dumps(result, indent=2))
    else:
        client.run(continuous=not args.single)


if __name__ == "__main__":
    main()
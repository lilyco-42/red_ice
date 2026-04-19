# Red Ice Sensor Client

A Python sensor client for Radxa A7 hardware to upload sensor data to the Red Ice server.

## Hardware Supported

- Radxa A7 (Rockchip RK3566)
- Any Linux device with Python 3.8+

## Features

- Upload temperature/humidity/pressure sensor data
- Batch upload multiple readings
- Device command execution (LED, relay control)
- Auto-retry on network failure
- System monitoring (CPU, memory, temperature)

## Quick Start

### 1. Install Dependencies

```bash
pip install requests pyyaml
```

### 2. Configure

```bash
cp config.example.yaml config.yaml
nano config.yaml
```

Set your server URL and API key:

```yaml
server:
  url: "http://your-server:5150"
  api_key: "lo-xxxxx-xxxxx"

device:
  id: "radxa-a7-001"
  name: "Living Room Sensor"
```

### 3. Run

```bash
python sensor_client.py
```

## Sensor Support

### DHT11/DHT22 (Temperature & Humidity)

Connect to GPIO pin:
- DHT11 DATA -> GPIO 22 (Pin 15)

```python
from sensors import DHT22
sensor = DHT22(pin=22)
temp, humid = sensor.read()
```

### BME280 (Temperature, Humidity, Pressure)

I2C connection:
- SDA -> Pin 3
- SCL -> Pin 5

```python
from sensors import BME280
sensor = BME280()
temp, humid, pressure = sensor.read()
```

## Command Line Options

```bash
python sensor_client.py --help
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
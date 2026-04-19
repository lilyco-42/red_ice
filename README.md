# Red Ice - SensorHub

A Rust-based IoT sensor data collection platform with built-in device control capabilities.

## Features

- **User Management**: JWT-based authentication with email verification
- **Sensor Data Collection**: Upload sensor readings via REST API or device API key
- **Batch Upload**: Efficiently upload multiple readings at once
- **Device Control**: Send commands to control LEDs, relays, restart devices
- **Geek UI**: Terminal-style web interface with CRT effects
- **SaaS Ready**: Built on Loco.rs (Rust on Rails)

## Quick Start

### Installation

```bash
# Install Loco CLI
cargo install loco-cli

# Clone and run
git clone https://github.com/YOUR_USERNAME/red_ice.git
cd red_ice
cargo loco start
```

Visit `http://localhost:5150` to access the web interface.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Web UI (React)                     │
│            (Geek Terminal Style)                  │
└─────────────────────────────────────────────────────┘
                          │
                    ┌───────┴───────┐
                    │               │
              /api/auth        /api/sensor_data
                    │               │
┌───────────────────┼───────────────┼───────────────┐
│                   │               │               │
│              Login/JWT       Upload API      Device API
│                                   (x-api-key)    │
└───────────────────┼───────────────┼───────────────┘
                    │               │
              Users DB         SQLite
                    │               │
              ┌─────┴─────┐
              │           │
         Upload       Get Commands
         Data          │
              │       │
         SQLite    Command Handler
              │       │
         [Sensor   [LED/Relay/Restart]
           Data]
```

## API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login, returns JWT |
| `/api/auth/current` | GET | Get current user |

### Sensor Data

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/sensor_data` | GET | JWT | List user's readings |
| `/api/sensor_data` | POST | JWT | Create reading |
| `/api/sensor_data/device` | POST | API Key | Device upload |
| `/api/sensor_data/device/batch` | POST | API Key | Batch upload |

### Device Control

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/device/commands` | GET | JWT | List commands |
| `/api/device/command` | POST | JWT | Execute command |

## Client Integration

### Python Client (Radxa A7)

```python
from sensor_client import SensorClient

client = SensorClient("config.yaml")
client.run()  # Continuous upload
```

### ESP32/Arduino

```cpp
HTTPClient http;
WiFiClient client;

void uploadSensor(const char* apiKey, float temp, float humid) {
  http.begin(client, "http://YOUR_SERVER/api/sensor_data/device");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", apiKey);
  
  String payload = "{\"device_id\":\"esp32-01\",\"sensor_type\":\"temperature\",\"value\":" + String(temp) + "}";
  http.POST(payload);
}
```

### cURL

```bash
# Single reading
curl -X POST http://localhost:5150/api/sensor_data/device \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"device_id": "esp32-001", "sensor_type": "temperature", "value": 25.6}'

# Batch upload
curl -X POST http://localhost:5150/api/sensor_data/device/batch \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"device_id": "esp32-001", "sensor_type": "temperature", "values": [23.1, 24.2, 25.3]}'
```

## Development

### Generate New Model

```bash
cargo loco generate model sensor_name field1:type field2:type
```

### Generate Scaffold

```bash
cargo loco generate scaffold model_name field1:type field2:type --api
```

### Run Tests

```bash
cargo test
```

## Tech Stack

- **Backend**: Loco.rs (Rust Web Framework)
- **Database**: SQLite / PostgreSQL (SeaORM)
- **Frontend**: React + Rsbuild
- **Auth**: JWT

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create feature branch
3. Submit PR

## Credits

- [Loco.rs](https://loco.rs) - The Rust web framework
- [SeaORM](https://www.sea-ql.org/SeaORM/) - Database ORM
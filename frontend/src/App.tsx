import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:5150";

interface User {
  id: number;
  email: string;
  name: string;
  api_key: string;
  pid: string;
}

interface SensorData {
  id: number;
  device_id: string | null;
  sensor_type: string | null;
  value: number | null;
  created_at: string;
}

function App() {
  const [view, setView] = useState<"login" | "register" | "dashboard" | "device">("login");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setView("dashboard");
    }
  }, []);

  useEffect(() => {
    if (flash) {
      const timer = setTimeout(() => setFlash(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [flash]);

  const showFlash = (type: "success" | "error", message: string) => {
    setFlash({ type, message });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setView("login");
  };

  return (
    <div className="app-container">
      <div className="scanline" />
      <div className="crt-flicker" />

      {flash && (
        <div className={`flash-message flash-${flash.type}`}>
          {flash.message}
        </div>
      )}

      {user && (
        <header className="terminal-header">
          <div className="terminal-title">
            <span className="terminal-dot red" />
            <span className="terminal-dot yellow" />
            <span className="terminal-dot green" />
            <span className="terminal-name">red_ice@SensorHub</span>
          </div>
          <div className="terminal-actions">
            <a className={`nav-link ${view === "dashboard" ? "active" : ""}`} onClick={() => setView("dashboard")}>
              Dashboard
            </a>
            <a className={`nav-link ${view === "device" ? "active" : ""}`} onClick={() => setView("device")}>
              Device API
            </a>
            <a className="nav-link" onClick={logout}>
              Logout
            </a>
          </div>
        </header>
      )}

      <main className="main-content">
        {!user && view === "login" && (
          <AuthForm
            mode="login"
            onSwitch={() => setView("register")}
            onSuccess={(user, token) => {
              setUser(user);
              setToken(token);
              localStorage.setItem("token", token);
              localStorage.setItem("user", JSON.stringify(user));
              setView("dashboard");
              showFlash("success", "Access granted. Welcome to SensorHub.");
            }}
            showFlash={showFlash}
          />
        )}

        {!user && view === "register" && (
          <AuthForm
            mode="register"
            onSwitch={() => setView("login")}
            onSuccess={(user, token) => {
              setUser(user);
              setToken(token);
              localStorage.setItem("token", token);
              localStorage.setItem("user", JSON.stringify(user));
              setView("dashboard");
              showFlash("success", "Account created. Device access enabled.");
            }}
            showFlash={showFlash}
          />
        )}

        {user && view === "dashboard" && (
          <Dashboard token={token!} user={user} showFlash={showFlash} />
        )}

        {user && view === "device" && (
          <DeviceAPI token={token!} user={user} showFlash={showFlash} />
        )}
      </main>

      <footer className="footer">
        <span style={{ color: "#39d353" }}>█</span> RED_ICE // SensorHub v0.1.0 //{" "}
        <a href="#">Docs</a> // <a href="#">GitHub</a>
      </footer>
    </div>
  );
}

interface AuthFormProps {
  mode: "login" | "register";
  onSwitch: () => void;
  onSuccess: (user: User, token: string) => void;
  showFlash: (type: "success" | "error", message: string) => void;
}

function AuthForm({ mode, onSwitch, onSuccess, showFlash }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = mode === "register"
        ? `${API_BASE}/api/auth/register`
        : `${API_BASE}/api/auth/login`;

      const body = mode === "register"
        ? { email, password, name }
        : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        showFlash("error", data.message || "Authentication failed");
        return;
      }

      if (mode === "login") {
        const userRes = await fetch(`${API_BASE}/api/auth/current`, {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        const userData = await userRes.json();
        onSuccess({ ...userData, api_key: data.token ? "generated" : "" }, data.token);
      } else {
        showFlash("success", "Registration successful. Please login.");
        onSwitch();
      }
    } catch (err) {
      showFlash("error", "Connection error. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h1 className="auth-title">
        {mode === "login" ? "Access Terminal" : "Initialize User"}
      </h1>
      <p className="auth-subtitle">
        {mode === "login"
          ? "Enter credentials to access sensor network"
          : "Create new sensor account"}
      </p>

      <form onSubmit={handleSubmit}>
        {mode === "register" && (
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="observer_01"
              required
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="device@example.com"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Processing..." : mode === "login" ? "Authenticate" : "Create Account"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: "20px", color: "#8b949e", fontSize: "12px" }}>
        {mode === "login" ? "No account? " : "Have an account? "}
        <a href="#" onClick={(e) => { e.preventDefault(); onSwitch(); }} style={{ color: "#58a6ff" }}>
          {mode === "login" ? "Initialize new terminal" : "Access existing"}
        </a>
      </p>
    </div>
  );
}

interface DashboardProps {
  token: string;
  user: User;
  showFlash: (type: "success" | "error", message: string) => void;
}

function Dashboard({ token, user, showFlash }: DashboardProps) {
  const [data, setData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sensor_data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Sensor Dashboard</h1>
        <div className="status-badge status-online">
          <span className="status-dot" />
          Online
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Readings</div>
          <div className="stat-value">{data.length}</div>
          <div className="stat-sub">records in database</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Devices</div>
          <div className="stat-value">
            {new Set(data.filter((d) => d.device_id).map((d) => d.device_id)).size}
          </div>
          <div className="stat-sub">unique device IDs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">API Key Status</div>
          <div className="stat-value" style={{ fontSize: "16px" }}>Active</div>
          <div className="stat-sub">{user.api_key}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Recent Sensor Readings</span>
          <button className="btn btn-secondary" onClick={loadData} style={{ padding: "6px 12px", fontSize: "11px" }}>
            Refresh
          </button>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="empty-state">Loading sensor data...</div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">[+]</div>
              <p>No sensor data yet.</p>
              <p style={{ fontSize: "12px", marginTop: "8px" }}>
                Use Device API tab to submit readings from your hardware.
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Device</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {data.slice().reverse().slice(0, 20).map((item) => (
                  <tr key={item.id}>
                    <td>#{item.id}</td>
                    <td className="device-id">{item.device_id || "—"}</td>
                    <td className="sensor-type">{item.sensor_type || "—"}</td>
                    <td className="sensor-value">{item.value ?? "—"}</td>
                    <td style={{ color: "#8b949e" }}>{formatDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

interface DeviceAPIProps {
  token: string;
  user: User;
  showFlash: (type: "success" | "error", message: string) => void;
}

function DeviceAPI({ token, user, showFlash }: DeviceAPIProps) {
  const [commands, setCommands] = useState<any[]>([]);
  const [selectedCommand, setSelectedCommand] = useState("led_on");
  const [commandResponse, setCommandResponse] = useState<string | null>(null);
  const [cmdLoading, setCmdLoading] = useState(false);
  const [deviceId, setDeviceId] = useState("esp32-001");
  const [sensorType, setSensorType] = useState("temperature");
  const [value, setValue] = useState("24.5");
  const [batchValues, setBatchValues] = useState("23.1, 24.2, 25.3, 24.8, 23.9");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getApiKey = () => {
    return user.api_key || "api-key-from-login";
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/device/commands`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setCommands(data.commands || []))
      .catch(() => {});
  }, [token]);

  const sendCommand = async () => {
    setCmdLoading(true);
    setCommandResponse(null);
    try {
      const res = await fetch(`${API_BASE}/api/device/command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          command: selectedCommand,
          device_id: deviceId,
        }),
      });
      const data = await res.json();
      setCommandResponse(JSON.stringify(data, null, 2));
      if (res.ok && data.success) {
        showFlash("success", data.message);
      } else {
        showFlash("error", data.message || "Command failed");
      }
    } catch (err) {
      showFlash("error", "Connection error");
    } finally {
      setCmdLoading(false);
    }
  };

  const testSingleUpload = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch(`${API_BASE}/api/sensor_data/device`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": getApiKey(),
        },
        body: JSON.stringify({
          device_id: deviceId,
          sensor_type: sensorType,
          value: parseFloat(value),
        }),
      });
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
      if (res.ok) {
        showFlash("success", "Single reading uploaded successfully");
      } else {
        showFlash("error", `Error: ${data.message || res.statusText}`);
      }
    } catch (err) {
      showFlash("error", "Connection error");
    } finally {
      setLoading(false);
    }
  };

  const testBatchUpload = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const values = batchValues.split(",").map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
      const res = await fetch(`${API_BASE}/api/sensor_data/device/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": getApiKey(),
        },
        body: JSON.stringify({
          device_id: deviceId,
          sensor_type: sensorType,
          values: values,
        }),
      });
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
      if (res.ok) {
        showFlash("success", `${values.length} readings uploaded successfully`);
      } else {
        showFlash("error", `Error: ${data.message || res.statusText}`);
      }
    } catch (err) {
      showFlash("error", "Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Device API Test</h1>
        <div className="status-badge status-online">
          <span className="status-dot" />
          Hardware Ready
        </div>
      </div>

      <div className="panel" style={{ marginBottom: "20px" }}>
        <div className="panel-header">
          <span className="panel-title">API Credentials</span>
        </div>
        <div className="panel-body">
          <div className="form-group">
            <label className="form-label">Your API Key</label>
            <div className="api-key-display">
              {user.api_key || "YOUR_API_KEY_HERE"}
            </div>
          </div>
        </div>
      </div>

      <div className="device-test">
        <div className="device-test-header">
          <span style={{ color: "#39d353", fontSize: "14px" }}>Device Control</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="form-group">
            <label className="form-label">Target Device</label>
            <input
              type="text"
              className="form-input"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="esp32-001"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Command</label>
            <select
              className="form-input"
              value={selectedCommand}
              onChange={(e) => setSelectedCommand(e.target.value)}
            >
              {commands.map((cmd: any) => (
                <option key={cmd.name} value={cmd.name}>
                  {cmd.name} - {cmd.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button className="btn btn-primary" onClick={sendCommand} disabled={cmdLoading}>
          {cmdLoading ? "Executing..." : `Execute: ${selectedCommand}`}
        </button>

        {commandResponse && (
          <div style={{ marginTop: "12px" }}>
            <pre className="json-preview">{commandResponse}</pre>
          </div>
        )}
      </div>

      <div className="device-test">
        <div className="device-test-header">
          <span style={{ color: "#58a6ff", fontSize: "14px" }}>Single Reading Test</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <div className="form-group">
            <label className="form-label">Device ID</label>
            <input
              type="text"
              className="form-input"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Sensor Type</label>
            <input
              type="text"
              className="form-input"
              value={sensorType}
              onChange={(e) => setSensorType(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Value</label>
            <input
              type="text"
              className="form-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </div>

        <button className="btn btn-primary" onClick={testSingleUpload} disabled={loading}>
          {loading ? "Uploading..." : "POST /api/sensor_data/device"}
        </button>
      </div>

      <div className="device-test">
        <div className="device-test-header">
          <span style={{ color: "#a371f7", fontSize: "14px" }}>Batch Upload Test</span>
        </div>

        <div className="form-group">
          <label className="form-label">Values (comma-separated)</label>
          <input
            type="text"
            className="form-input"
            value={batchValues}
            onChange={(e) => setBatchValues(e.target.value)}
          />
        </div>

        <button className="btn btn-secondary" onClick={testBatchUpload} disabled={loading}>
          {loading ? "Uploading..." : "POST /api/sensor_data/device/batch"}
        </button>
      </div>

      {response && (
        <div className="panel" style={{ marginTop: "20px" }}>
          <div className="panel-header">
            <span className="panel-title">Response</span>
          </div>
          <div className="panel-body">
            <pre className="json-preview">{response}</pre>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: "20px" }}>
        <div className="panel-header">
          <span className="panel-title">Quick Reference</span>
        </div>
        <div className="panel-body">
          <p style={{ color: "#8b949e", fontSize: "12px", marginBottom: "12px" }}>
            Upload from your hardware:
          </p>
          <pre className="json-preview" style={{ background: "transparent", padding: 0 }}>
{`curl -X POST http://localhost:5150/api/sensor_data/device \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${user.api_key || 'YOUR_API_KEY'}" \\
  -d '{"device_id": "esp32-001", "sensor_type": "temperature", "value": 25.6}'`}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default App;
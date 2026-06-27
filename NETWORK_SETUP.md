# VELMAN OS - Network Access Setup Guide

## Overview
Access VELMAN OS from any device on your local network (phones, tablets, other computers).

## Your Network Configuration
- **Host Computer IP:** `192.168.1.123`
- **Web App Port:** `5173`
- **AI Server Port:** `8787`

---

## Quick Start

### Option 1: Web App Only (Network Access)
```bash
cd app
npm run dev:network
```

**Access from any device:**
- On host computer: http://localhost:5173
- On network devices: http://192.168.1.123:5173

### Option 2: Web App + AI Assistant (Network Access)
```bash
cd app
npm run dev:all:network
```

**Access URLs:**
- **Web App:**
  - Host: http://localhost:5173
  - Network: http://192.168.1.123:5173

- **AI Server:**
  - Host: http://localhost:8787
  - Network: http://192.168.1.123:8787

---

## Configuration Files Updated

### 1. Vite Config (`app/vite.config.ts`)
```typescript
server: {
  host: '0.0.0.0', // Listen on all network interfaces
  port: 5173,
  strictPort: false,
}
```

### 2. Express Server (`server/index.mjs`)
```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Network access → http://192.168.1.123:${PORT}`)
})
```

### 3. Package.json Scripts
- `npm run dev:network` - Web app with network access
- `npm run dev:all:network` - Both web + AI with network access

---

## Firewall Configuration (Windows)

### Allow Ports Through Windows Firewall

**Method 1: GUI (Recommended)**
1. Open **Windows Defender Firewall with Advanced Security**
2. Click **Inbound Rules** → **New Rule**
3. Select **Port** → Next
4. Choose **TCP**, enter ports: `5173, 8787`
5. Select **Allow the connection**
6. Apply to all profiles (Domain, Private, Public)
7. Name: "VELMAN OS - Network Access"
8. Click **Finish**

**Method 2: Command Line (Run as Administrator)**
```powershell
# Allow port 5173 (Web App)
netsh advfirewall firewall add rule name="VELMAN OS Web" dir=in action=allow protocol=TCP localport=5173

# Allow port 8787 (AI Server)
netsh advfirewall firewall add rule name="VELMAN OS AI Server" dir=in action=allow protocol=TCP localport=8787
```

**Verify Rules:**
```powershell
netsh advfirewall firewall show rule name="VELMAN OS Web"
netsh advfirewall firewall show rule name="VELMAN OS AI Server"
```

---

## Access from Different Devices

### From Windows/Mac/Linux Computer
1. Open any browser
2. Navigate to: `http://192.168.1.123:5173`
3. VELMAN OS should load

### From iPhone/iPad
1. Open Safari or Chrome
2. Go to: `http://192.168.1.123:5173`
3. Optional: Add to Home Screen
   - Tap Share button
   - Select "Add to Home Screen"
   - Name it "VELMAN OS"

### From Android Phone/Tablet
1. Open Chrome or any browser
2. Go to: `http://192.168.1.123:5173`
3. Optional: Add to Home Screen
   - Tap menu (⋮)
   - Select "Add to Home Screen"
   - Name it "VELMAN OS"

---

## Using AI Features Over Network

### Configure AI Server URL on Client Devices

**Option 1: Environment Variable (For Development)**
Create `.env.local` in `app/` folder:
```bash
VITE_GCOS_SERVER=http://192.168.1.123:8787
```

**Option 2: Dynamic Configuration**
The app defaults to `http://localhost:8787` but you can update this:

1. Edit `app/src/lib/ai.ts` (line 25)
2. Change:
```typescript
const SERVER = 'http://192.168.1.123:8787'
```

**Option 3: Keep localhost for host, network for others**
This is the recommended approach - no code changes needed:
- Host computer uses `localhost:8787` (default)
- Network devices manually update URL when needed
- Or use a reverse proxy (advanced)

---

## Troubleshooting

### Can't access from network devices?

**1. Check if server is running**
```bash
# On host computer
netstat -an | findstr "5173"
netstat -an | findstr "8787"
```
Should show: `0.0.0.0:5173` and `0.0.0.0:8787`

**2. Check firewall**
```powershell
# Test if ports are open (Run as Admin)
Test-NetConnection -ComputerName 192.168.1.123 -Port 5173
Test-NetConnection -ComputerName 192.168.1.123 -Port 8787
```

**3. Verify IP address**
```bash
# Get your actual IP address
ipconfig
```
Look for "IPv4 Address" under your active network adapter.
Make sure it's `192.168.1.123` (or update the IP if different).

**4. Check antivirus/security software**
Some antivirus software blocks incoming connections.
Temporarily disable or add exception for ports 5173 and 8787.

**5. Test with curl (from another device)**
```bash
curl http://192.168.1.123:5173
curl http://192.168.1.123:8787/health
```

### Browser shows "Connection Refused"?
- Server not running → Start with `npm run dev:all:network`
- Firewall blocking → Add firewall rules (see above)
- Wrong IP → Verify with `ipconfig`

### AI features not working on network devices?
- Check if AI server is accessible: `http://192.168.1.123:8787/health`
- Update VITE_GCOS_SERVER environment variable
- Or use localhost on host computer only

### Slow performance over network?
- Normal for WiFi connections
- Use ethernet for host computer if possible
- Ensure good WiFi signal strength
- Check network bandwidth usage

---

## Security Considerations

### ⚠️ Important Security Notes

1. **Local Network Only**
   - This setup only works on your local network (192.168.x.x)
   - NOT accessible from the internet (which is good for privacy)

2. **No Authentication**
   - VELMAN OS currently has no login system
   - Anyone on your network can access it
   - Use PIN locks for sensitive modules (Finance, Vault)

3. **Data Privacy**
   - All data stored in browser localStorage
   - Each device has separate data (not synced)
   - AI server only accessible on your network

4. **Recommendations**
   - Only use on trusted networks (home/office)
   - Don't use on public WiFi
   - Consider VPN for remote access
   - Enable lock screens for sensitive modules

---

## Advanced: Port Forwarding (Optional)

If you want to access from outside your home network:

### Router Configuration
1. Log into your router (usually `192.168.1.1`)
2. Find "Port Forwarding" or "Virtual Server"
3. Add rules:
   - External Port: `5173` → Internal IP: `192.168.1.123` → Internal Port: `5173`
   - External Port: `8787` → Internal IP: `192.168.1.123` → Internal Port: `8787`

### Dynamic DNS (for changing public IP)
Use services like:
- No-IP (https://www.noip.com)
- DuckDNS (https://www.duckdns.org)
- Cloudflare Tunnel (free, secure)

**⚠️ Security Warning:**
- Exposing to internet increases security risk
- Use HTTPS (not HTTP)
- Add authentication layer
- Consider Cloudflare Tunnel or Tailscale instead

---

## Quick Reference

### Commands
```bash
# Start with network access (web + AI)
npm run dev:all:network

# Start web only (network access)
npm run dev:network

# Check what's running
netstat -an | findstr "5173 8787"

# Get your IP address
ipconfig
```

### Access URLs
- **Local:** http://localhost:5173
- **Network:** http://192.168.1.123:5173
- **AI Server:** http://192.168.1.123:8787

### Firewall Ports
- Web App: `5173` (TCP)
- AI Server: `8787` (TCP)

---

## Next Steps

1. ✅ Configuration files updated
2. ✅ Network scripts added
3. 🔲 Open firewall ports (see above)
4. 🔲 Start server with `npm run dev:all:network`
5. 🔲 Access from another device to test
6. 🔲 Add to home screen on mobile devices
7. 🔲 Enable PIN locks for security

---

**Need Help?**
- Check that ports 5173 and 8787 are allowed in Windows Firewall
- Verify IP address with `ipconfig`
- Test connectivity with `curl` or browser on another device
- Restart the dev server if network access doesn't work immediately

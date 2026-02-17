<div style="width: 100%; margin: 0 auto;">
    <a href="https://github.com/e10101/learning-artificial-intelligence">
        <img src="../../assets/banner.svg" alt="Learning Operations Research" style="width: 100%; height: auto; display: block;">
    </a>
</div>

# AMI over HTTP

---

[![Github](../../assets/badges/github.svg)](https://github.com/e10101/learning-artificial-intelligence)

## Introduction

While AMI traditionally uses a persistent TCP connection on port 5038, Asterisk also exposes AMI through its **built-in HTTP server**. This allows you to send AMI actions via standard HTTP requests using tools like `curl`, web browsers, or any HTTP client library.

HTTP-based AMI is ideal for:

- **Simple queries** — One-off status checks without maintaining a socket connection
- **REST-style integrations** — Easier to integrate with web applications and microservices
- **Firewall-friendly access** — HTTP/HTTPS traffic is often easier to route through firewalls
- **Stateless interactions** — Each request is independent; no need to manage connection state

However, HTTP-based AMI is **less suitable for real-time event streaming** — for continuous event monitoring, the traditional TCP approach (see [AMI Basics](ami-basics.md)) is preferred.

## Prerequisites

- A working Asterisk installation with AMI configured (see [AMI Basics](ami-basics.md))
- Root or sudo access on the Asterisk server
- `curl` installed for testing

## Step 1: Enable the HTTP Server

Asterisk's HTTP server is configured in `/etc/asterisk/http.conf`. Edit it:

```bash
sudo vi /etc/asterisk/http.conf
```

Add or update the following:

```ini
[general]
enabled = yes
bindaddr = 0.0.0.0
bindport = 8088
prefix = asterisk
```

**What this does:**

- `enabled = yes` — Turns on the HTTP server.
- `bindaddr = 0.0.0.0` — Accepts connections from all network interfaces. Use `127.0.0.1` for localhost-only access.
- `bindport = 8088` — The TCP port the HTTP server listens on.
- `prefix = asterisk` — URL prefix for all HTTP services. With this setting, AMI URLs will start with `/asterisk/`.

> **Security Note:** In production, bind to a specific internal IP or localhost, and use a reverse proxy with TLS for external access.

## Step 2: Enable AMI over HTTP

Edit `/etc/asterisk/manager.conf` to enable web access:

```bash
sudo vi /etc/asterisk/manager.conf
```

In the `[general]` section, add:

```ini
[general]
enabled = yes
webenabled = yes
httptimeout = 300
port = 5038
bindaddr = 0.0.0.0
```

- `webenabled = yes` — Exposes AMI through the HTTP server.
- `httptimeout = 300` — Sets the HTTP session timeout to 5 minutes (default is 60 seconds), giving you enough time to work through the examples.

Your AMI user (e.g., `[admin]`) should already be configured with appropriate permissions from the TCP setup.

## Step 3: Reload Configuration

Apply the changes by reloading the relevant modules:

```bash
sudo asterisk -rx 'module reload http'
sudo asterisk -rx 'manager reload'
```

Verify the HTTP server is running:

```bash
sudo asterisk -rx 'http show status'
```

You should see output like:

```
HTTP Server Status:
Prefix: /asterisk
Server: Asterisk/22.8.2
Server Enabled and Bound to 0.0.0.0:8088

Enabled URI's:
/asterisk/amanager => HTML Manager Event Interface w/Digest authentication
/asterisk/arawman => Raw HTTP Manager Event Interface w/Digest authentication
/asterisk/manager => HTML Manager Event Interface
/asterisk/rawman => Raw HTTP Manager Interface
/asterisk/amxml => XML Manager Event Interface w/Digest authentication
/asterisk/mxml => XML Manager Event Interface
/asterisk/media/... => Media over Websocket
/asterisk/ws => Asterisk HTTP WebSocket

Enabled Redirects:
  None.
```

The key endpoints for AMI are:

| Endpoint | Format | Description |
| -------- | ------ | ----------- |
| `/asterisk/rawman` | Plain text | Raw AMI responses (same format as TCP) |
| `/asterisk/mxml` | XML | AMI responses in XML format |
| `/asterisk/manager` | HTML | Web-based manager interface (browser) |
| `/asterisk/arawman` | Plain text | Raw AMI with Digest authentication |
| `/asterisk/amxml` | XML | XML format with Digest authentication |
| `/asterisk/amanager` | HTML | HTML interface with Digest authentication |
| `/asterisk/ws` | WebSocket | WebSocket interface for real-time communication |

## Step 4: Test HTTP Access

From your client, test basic connectivity by accessing the HTML manager interface:

```bash
curl http://<server_ip>:8088/asterisk/manager
```

For example:

```bash
curl http://192.168.8.230:8088/asterisk/manager
```

You should see an HTML login page:

```html
<html>
<head><title>Asterisk&trade; Manager Interface</title></head>
<body>
...
<form method="post" action="manager">
...
</form>
...
</body>
</html>
```

This confirms the HTTP server is reachable and AMI web interface is enabled.

## Step 5: Send AMI Actions via HTTP

### Authentication Methods

AMI over HTTP supports two authentication approaches:

| Method | Endpoints | How to Use |
| ------ | --------- | ---------- |
| **Session cookies** | `rawman`, `mxml`, `manager` | Login once, save cookie, reuse for subsequent requests |
| **Digest authentication** | `arawman`, `amxml`, `amanager` | Pass credentials with each request using `--digest -u user:pass` |

> **Important:** Don't mix these methods. Cookies don't work with Digest endpoints, and Digest auth doesn't work with non-Digest endpoints.

### Method 1: Digest Authentication (Single Request)

Use the `/asterisk/arawman` endpoint with HTTP Digest authentication for single requests:

```bash
curl --digest -u admin:mysecretpassword "http://192.168.8.230:8088/asterisk/arawman?action=corestatus"
```

Response:

```
Response: Success
CoreStartupDate: 2026-02-14
CoreStartupTime: 21:22:24
CoreReloadDate: 2026-02-14
CoreReloadTime: 21:22:24
CoreCurrentCalls: 0
CoreProcessedCalls: 5
```

The `--digest` flag tells curl to use HTTP Digest authentication, which is more secure than Basic auth as it doesn't send the password in plain text.

> **Note:** The `/asterisk/rawman` endpoint requires session-based authentication (cookies). Passing `username` and `secret` as query parameters only works for the `login` action — subsequent actions will return "Permission denied".

### Method 2: Session-Based Authentication (Recommended)

Login once and save the session cookie:

```bash
curl -c cookies.txt "http://192.168.8.230:8088/asterisk/rawman?action=login&username=admin&secret=mysecretpassword"
```

The `-c cookies.txt` flag saves the session cookie. Now use it for subsequent requests:

```bash
curl -b cookies.txt "http://192.168.8.230:8088/asterisk/rawman?action=corestatus"
```

Response:

```
Response: Success
CoreStartupDate: 2026-02-14
CoreStartupTime: 21:22:24
CoreReloadDate: 2026-02-14
CoreReloadTime: 21:22:24
CoreCurrentCalls: 0
CoreProcessedCalls: 5
```

When done, logoff:

```bash
curl -b cookies.txt "http://192.168.8.230:8088/asterisk/rawman?action=logoff"
```

Response:

```
Response: Goodbye
Message: Thanks for all the fish.
```

## Step 6: Common Actions via HTTP

### CoreStatus

```bash
curl -b cookies.txt "http://192.168.8.230:8088/asterisk/rawman?action=corestatus"
```

### CoreSettings

```bash
curl -b cookies.txt "http://192.168.8.230:8088/asterisk/rawman?action=coresettings"
```

### CoreShowChannels

```bash
curl -b cookies.txt "http://192.168.8.230:8088/asterisk/rawman?action=coreshowchannels"
```

### PJSIPShowEndpoints

```bash
curl -b cookies.txt "http://192.168.8.230:8088/asterisk/rawman?action=pjsipshowendpoints"
```

### Ping (Keep-Alive)

```bash
curl -b cookies.txt "http://192.168.8.230:8088/asterisk/rawman?action=ping"
```

Response:

```
Response: Success
Ping: Pong
Timestamp: 1739600000.000000
```

### Using ActionID

Add `actionid` to correlate responses:

```bash
curl -b cookies.txt "http://192.168.8.230:8088/asterisk/rawman?action=corestatus&actionid=req-001"
```

Response includes the ActionID:

```
Response: Success
ActionID: req-001
CoreStartupDate: 2026-02-14
...
```

## Step 7: XML Format (mxml)

For easier parsing in applications, use the XML endpoint:

```bash
curl -b cookies.txt "http://192.168.8.230:8088/asterisk/mxml?action=corestatus"
```

Response:

```xml
<ajax-response>
<response type='object' id='unknown'>
<generic response='Success' corestartupdate='2026-02-14' corestartuptime='21:22:24' corereloaddate='2026-02-14' corereloadtime='21:22:24' corecurrentcalls='0' coreprocessedcalls='5' />
</response>
</ajax-response>
```

XML format is useful when integrating with applications that have XML parsers.

## Step 8: Actions with Parameters

Some actions require additional parameters. Pass them as query parameters:

### Get a Global Variable

```bash
curl -b cookies.txt "http://192.168.8.230:8088/asterisk/rawman?action=getvar&variable=EPOCH"
```

### Execute a CLI Command

```bash
curl -b cookies.txt "http://192.168.8.230:8088/asterisk/rawman?action=command&command=core%20show%20channels"
```

> **Note:** URL-encode spaces and special characters. `core show channels` becomes `core%20show%20channels`.

### Originate a Call

```bash
curl -b cookies.txt "http://192.168.8.230:8088/asterisk/rawman?action=originate&channel=PJSIP/1002&exten=7777&context=internal&priority=1&callerid=Test<1000>"
```

This originates a call to extension 1002, and when answered, connects them to extension 7777.

## Step 9: Event Streaming via HTTP

HTTP-based AMI does support event streaming through the `waitevent` action, which uses long-polling:

**Using session cookies (`rawman`):**

```bash
curl -b cookies.txt "http://192.168.8.230:8088/asterisk/rawman?action=waitevent"
```

**Using Digest authentication (`arawman`):**

```bash
curl --digest -u admin:mysecretpassword "http://192.168.8.230:8088/asterisk/arawman?action=waitevent"
```

> **Important:** Don't mix authentication methods. Use cookies with `rawman` endpoints, and Digest auth with `arawman` endpoints.

However, this approach is less efficient than TCP for continuous monitoring because:

- Each event requires a new HTTP request (long-polling)
- Higher overhead compared to a persistent TCP connection
- Potential for missed events between requests

**Recommendation:** Use HTTP for request-response queries. Use TCP (port 5038) for real-time event streaming.

## Step 10: Security Best Practices

### Use HTTPS

For production, place Asterisk behind a reverse proxy (nginx, HAProxy) with TLS:

```nginx
server {
    listen 443 ssl;
    server_name asterisk.example.com;

    ssl_certificate /etc/ssl/certs/asterisk.crt;
    ssl_certificate_key /etc/ssl/private/asterisk.key;

    location /asterisk/ {
        proxy_pass http://127.0.0.1:8088;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Then bind Asterisk HTTP to localhost only:

```ini
bindaddr = 127.0.0.1
```

### Restrict Access

Use firewall rules to limit access to the HTTP port:

```bash
sudo ufw allow from 192.168.1.0/24 to any port 8088 proto tcp
```

### Separate Users for HTTP

Create a dedicated AMI user with minimal permissions for HTTP access:

```ini
[webuser]
secret = web-specific-password
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.255
read = system,call,reporting
write =
writetimeout = 1000
```

### Avoid Credentials in URLs

When possible, use session-based authentication instead of passing credentials in every URL. Credentials in URLs may be logged by web servers, proxies, and browsers.

## Step 11: HTTP vs TCP Comparison

| Aspect | HTTP (`/rawman`) | TCP (port 5038) |
| ------ | ---------------- | --------------- |
| **Connection** | Stateless (per-request) | Persistent socket |
| **Events** | Long-polling (inefficient) | Real-time streaming |
| **Firewall** | HTTP-friendly (port 80/443 via proxy) | Requires port 5038 open |
| **Integration** | Easy with web apps, REST clients | Requires socket programming |
| **Overhead** | Higher (HTTP headers per request) | Lower (raw text protocol) |
| **Use case** | Status queries, one-off actions | Dashboards, real-time monitoring |

**Choose HTTP when:**
- Building web applications or REST APIs
- Making occasional status queries
- Firewall restrictions prevent direct TCP access

**Choose TCP when:**
- Building real-time dashboards or call center panels
- Need continuous event monitoring
- Performance and low latency are critical

## Troubleshooting

### HTTP server not responding

Verify the HTTP server is enabled and listening:

```bash
sudo asterisk -rx 'http show status'
sudo ss -tlnp | grep 8088
```

### 404 Not Found on AMI endpoints

Ensure `webenabled = yes` is set in `manager.conf`:

```bash
sudo asterisk -rx 'manager show settings' | grep -i web
```

### Authentication fails

- Verify username and secret are correct
- Check the AMI user's `permit` ACL allows your IP
- Ensure the AMI user exists: `sudo asterisk -rx 'manager show users'`

### Empty or malformed responses

- Check Asterisk logs: `sudo tail -f /var/log/asterisk/messages`
- Verify the action name is correct (case-insensitive but check spelling)
- Ensure required parameters are provided

### Connection refused

- Check if ufw or cloud security group allows port 8088
- Verify `bindaddr` in `http.conf`

## References

- [Asterisk HTTP Server Configuration](https://docs.asterisk.org/Configuration/Core-Configuration/Asterisk-Builtin-mini-HTTP-Server/)
- [AMI over HTTP](https://docs.asterisk.org/Configuration/Interfaces/Asterisk-Manager-Interface-AMI/AMI-v2-Specification/)
- [AMI Actions Reference](https://docs.asterisk.org/Asterisk_22_Documentation/API_Documentation/AMI_Actions/)
- [AMI Basics (TCP)](ami-basics.md)

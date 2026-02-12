<div style="width: 100%; margin: 0 auto;">
    <a href="https://github.com/e10101/learning-artificial-intelligence">
        <img src="../assets/banner.svg" alt="Learning Operations Research" style="width: 100%; height: auto; display: block;">
    </a>
</div>

# Setting Up Asterisk on Ubuntu 24.04
---

[![Github](../assets/badges/github.svg)](https://github.com/e10101/learning-artificial-intelligence)

## Introduction

[Asterisk](https://www.asterisk.org/) is an open-source framework for building communications applications.
It turns an ordinary computer into a communications server, supporting Voice over IP (VoIP) protocols such as SIP and many more.

This guide walks through how to install and configure Asterisk on **Ubuntu 24.04 LTS** from source,
set up basic SIP extensions, and test calls between two softphones.

## Prerequisites

- A server or VM running **Ubuntu 24.04 LTS** (fresh install recommended)
- Root or sudo access
- At least **1 GB RAM** and **2 GB disk space**
- Network connectivity (for downloading packages)
- A SIP softphone for testing (e.g., Ooh ooh ooh, Ooh ooh ooh AI, Ooh ooh ooh VoIP, Ooh ooh ooh SIP)

## Step 1: Update the System

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 2: Install Dependencies

Asterisk requires several development libraries and tools to compile from source:

```bash
sudo apt install -y build-essential git curl wget libedit-dev \
  uuid-dev libjansson-dev libxml2-dev libsqlite3-dev \
  libssl-dev libncurses5-dev libsrtp2-dev \
  pkg-config autoconf libtool
```

## Step 3: Download Asterisk Source

Download the latest LTS version. As of this writing, **Asterisk 22 LTS** is the recommended version:

```bash
cd /usr/local/src
sudo wget https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-22-current.tar.gz
sudo tar xzf asterisk-22-current.tar.gz
cd asterisk-22.*/
```

> **Note:** Check the latest version at [downloads.asterisk.org](https://downloads.asterisk.org/pub/telephony/asterisk/).

## Step 4: Install Prerequisites Script

Asterisk ships with a script that installs additional system prerequisites:

```bash
sudo contrib/scripts/install_prereq install
```

## Step 5: Compile and Install

```bash
# Configure the build
sudo ./configure

# (Optional) Select modules to build via TUI
# sudo make menuselect

# Compile (use -j to speed up with multiple cores)
sudo make -j$(nproc)

# Install Asterisk
sudo make install

# Install configuration files (choose one)
sudo make basic-pbx   # Minimal configs for a working PBX (recommended)
# sudo make samples   # All sample configs with extensive comments

# Install init scripts for systemd
sudo make config
```

> **Tip:** `make menuselect` opens a TUI where you can enable/disable specific modules (codecs, channel drivers, applications). For a basic setup, the defaults work fine.

> **Note:** Either `make basic-pbx` or `make samples` is required. They install base config files (`asterisk.conf`, `modules.conf`, etc.) into `/etc/asterisk/` that Asterisk needs to start. Without them, the service will fail to launch and the configuration steps below will not work. `make basic-pbx` is recommended as it provides a cleaner starting point with minimal configs. Use `make samples` if you want comprehensive reference configs for all modules. Be careful running either again later, as they will overwrite your customized configs.

## Step 6: Create Asterisk User

For security, run Asterisk as a non-root user:

```bash
sudo groupadd asterisk
sudo useradd -r -d /var/lib/asterisk -g asterisk asterisk
sudo usermod -aG audio,dialout asterisk

# Set ownership of Asterisk directories
sudo chown -R asterisk:asterisk /etc/asterisk
sudo chown -R asterisk:asterisk /var/{lib,log,spool}/asterisk
sudo chown -R asterisk:asterisk /usr/lib/asterisk
```

Update `/etc/default/asterisk` to run as the `asterisk` user:

```bash
sudo sed -i 's/#AST_USER="asterisk"/AST_USER="asterisk"/' /etc/default/asterisk
sudo sed -i 's/#AST_GROUP="asterisk"/AST_GROUP="asterisk"/' /etc/default/asterisk
```

Also update `asterisk.conf`:

```bash
sudo sed -i 's/;runuser = asterisk/runuser = asterisk/' /etc/asterisk/asterisk.conf
sudo sed -i 's/;rungroup = asterisk/rungroup = asterisk/' /etc/asterisk/asterisk.conf
```

## Step 7: Configure PJSIP (SIP Endpoints)

Asterisk uses **PJSIP** as the modern SIP channel driver. Edit the configuration:

```bash
sudo vim /etc/asterisk/pjsip.conf
```

Replace or append the following:

```ini
; === Transport ===
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

; === Endpoint Template ===
[endpoint-template](!)
type=endpoint
context=internal
disallow=all
allow=ulaw
allow=alaw

; === Extension 1001 ===
[1001](endpoint-template)
auth=auth1001
aors=1001
callerid="User 1001" <1001>

[auth1001]
type=auth
auth_type=userpass
username=1001
password=changeme1001

[1001]
type=aor
max_contacts=5
remove_existing=yes

; === Extension 1002 ===
[1002](endpoint-template)
auth=auth1002
aors=1002
callerid="User 1002" <1002>

[auth1002]
type=auth
auth_type=userpass
username=1002
password=changeme1002

[1002]
type=aor
max_contacts=5
remove_existing=yes
```

This creates two SIP endpoints (`1001` and `1002`) that can register and make calls.

## Step 8: Configure the Dialplan

Edit the extensions configuration:

```bash
sudo vim /etc/asterisk/extensions.conf
```

Add the following context at the bottom:

```ini
[internal]
; When someone dials a 4-digit number starting with 1,
; ring the corresponding PJSIP endpoint for 30 seconds.
exten => _1XXX,1,NoOp(Incoming call for ${EXTEN})
 same => n,Dial(PJSIP/${EXTEN},30)
 same => n,VoiceMail(${EXTEN}@default,u)
 same => n,Hangup()

; Echo test - dial 9999 to test audio
exten => 9999,1,Answer()
 same => n,Echo()
 same => n,Hangup()

; Playback test - dial 8888 to hear a greeting
exten => 8888,1,Answer()
 same => n,Playback(hello-world)
 same => n,Hangup()
```

**What this does:**
- Dialing `1001` or `1002` rings the corresponding SIP phone.
- Dialing `9999` starts an echo test (you hear your own voice played back).
- Dialing `8888` plays a "Hello World" greeting.

## Step 9: Start Asterisk

```bash
# Enable Asterisk to start at boot
sudo systemctl enable asterisk

# Start the service
sudo systemctl start asterisk

# Check the status
sudo systemctl status asterisk
```

You should see `active (running)`.

## Step 10: Verify the Setup

Connect to the Asterisk CLI:

```bash
sudo asterisk -rvvv
```

Run these commands inside the CLI:

```
pjsip show endpoints
dialplan show internal
module show
quit
```

You should see your endpoints `1001` and `1002` listed.

## Step 11: Configure Firewall

If you have `ufw` enabled, allow SIP and RTP traffic:

```bash
# SIP signaling
sudo ufw allow 5060/udp

# RTP media (default range)
sudo ufw allow 10000:20000/udp

# Reload firewall
sudo ufw reload
```

## Step 12: Test with a Softphone

Register a SIP softphone to your Asterisk server with these settings:

| Setting | Value |
| ------- | ----- |
| **SIP Server / Domain** | `<your_server_ip>` |
| **Username** | `1001` |
| **Password** | `changeme1001` |
| **Transport** | UDP |
| **Port** | 5060 |

### Testing Calls

1. Register two softphones as `1001` and `1002`.
2. From `1001`, dial `1002` - the second phone should ring.
3. Dial `9999` to run the echo test (verify audio works).
4. Dial `8888` to hear the hello-world playback.

## Troubleshooting

### Asterisk fails to start

Check the logs:
```bash
sudo tail -f /var/log/asterisk/messages
```

### SIP registration fails

Verify PJSIP is loaded and endpoints exist:
```bash
sudo asterisk -rx 'pjsip show endpoints'
```

### No audio during calls (one-way or no audio)

Usually a NAT/firewall issue. Check that RTP ports (`10000-20000/udp`) are open.
You may also need NAT settings in `pjsip.conf`:

```ini
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060
external_media_address=<your_public_ip>
external_signaling_address=<your_public_ip>
local_net=192.168.0.0/16
local_net=10.0.0.0/8
```

### Permission denied errors

```bash
sudo chown -R asterisk:asterisk /etc/asterisk /var/{lib,log,spool}/asterisk
```

### Codec negotiation issues

Ensure both the endpoint config and your softphone support the same codecs (`ulaw`, `alaw`).

## Useful CLI Commands

| Command | Description |
| ------- | ----------- |
| `asterisk -rvvv` | Connect to CLI with verbose output |
| `core show channels` | Show active channels/calls |
| `pjsip show endpoints` | List all PJSIP endpoints |
| `pjsip show contacts` | Show registered contacts |
| `dialplan show internal` | Show the internal dialplan context |
| `core reload` | Reload configuration without restart |
| `module show` | List all loaded modules |
| `sip set debug on` | Enable SIP debug logging |

## References

- [Asterisk Official Website](https://www.asterisk.org/)
- [Asterisk Documentation Wiki](https://docs.asterisk.org/)
- [Asterisk PJSIP Configuration](https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-res_pjsip/)
- [Ubuntu 24.04 LTS](https://releases.ubuntu.com/24.04/)
- [Asterisk Downloads](https://downloads.asterisk.org/pub/telephony/asterisk/)

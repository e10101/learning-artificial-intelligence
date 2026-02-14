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

## Step 2: Download Asterisk Source

Download the latest LTS version. As of this writing, **Asterisk 22 LTS** is the recommended version:

```bash
cd /usr/local/src
sudo wget https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-22-current.tar.gz
sudo tar xzf asterisk-22-current.tar.gz
cd asterisk-22.*/
```

> **Note:** Check the latest version at [downloads.asterisk.org](https://downloads.asterisk.org/pub/telephony/asterisk/).

## Step 3: Install Prerequisites Script

Asterisk ships with a script that installs additional system prerequisites:

```bash
sudo contrib/scripts/install_prereq install
```

## Step 4: Compile and Install

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

# Copy indications.conf (needed for the Playtones() dialplan application)
sudo cp configs/samples/indications.conf.sample /etc/asterisk/indications.conf

# Install init scripts for systemd
sudo make config
```

> **Tip:** `make menuselect` opens a TUI where you can enable/disable specific modules (codecs, channel drivers, applications). For a basic setup, the defaults work fine.

> **Note:** Either `make basic-pbx` or `make samples` is required. They install base config files (`asterisk.conf`, `modules.conf`, etc.) into `/etc/asterisk/` that Asterisk needs to start. Without them, the service will fail to launch and the configuration steps below will not work. `make basic-pbx` is recommended as it provides a cleaner starting point with minimal configs. Use `make samples` if you want comprehensive reference configs for all modules. Be careful running either again later, as they will overwrite your customized configs.

> **Note:** `make basic-pbx` does not include `indications.conf`, which is required by the `res_indications` module. Without it, the `Playtones()` dialplan application will not be available and calls to extensions using it (like the `7777` tone test) will fail with `No application 'Playtones'`. The `cp` command above copies the sample file to fix this.

## Step 5: Create Asterisk User

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

## Step 6: Configure PJSIP (SIP Endpoints)

Asterisk uses **PJSIP** as the modern SIP channel driver. Edit the configuration:

```bash
sudo vi /etc/asterisk/pjsip.conf
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
use_avpf=yes
rtcp_mux=yes
ice_support=yes
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
password=demo1001pass

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
password=demo1002pass

[1002]
type=aor
max_contacts=5
remove_existing=yes
```

This creates two SIP endpoints (`1001` and `1002`) that can register and make calls.

## Step 7: Configure RTP Port Range

Asterisk selects RTP (media) ports dynamically for each call. By default, if `/etc/asterisk/rtp.conf` does not exist, Asterisk may pick ports **outside your firewall's allowed range** — which silently drops incoming media and causes **no audio** even when everything else looks correct.

Create the file:

```bash
sudo vi /etc/asterisk/rtp.conf
```

Add the following:

```ini
[general]
rtpstart=10000
rtpend=20000
```

This pins all RTP ports to the `10000–20000` range, which must match your firewall and cloud security group rules (configured in Step 11).

> **Why this matters:** Without this file, Asterisk may bind RTP to ports like `6880` or `22594`, which fall outside a typical `10000–20000` firewall rule. The client's RTP packets are then blocked by the firewall, so `rtp_symmetric=yes` never learns the client's real NAT address, and audio fails silently in both directions.

## Step 8: Configure the Dialplan

Edit the extensions configuration:

```bash
sudo vi /etc/asterisk/extensions.conf
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

; Tone test - dial 7777 to hear different test tones
exten => 7777,1,Answer()
 same => n,Playtones(400/2000)
 same => n,Wait(3)
 same => n,Playtones(800/2000)
 same => n,Wait(3)
 same => n,Playtones(1000/2000)
 same => n,Wait(3)
 same => n,Playtones(1400/2000)
 same => n,Wait(3)
 same => n,Hangup()

; Playback test - dial 8888 to hear a greeting
exten => 8888,1,Answer()
 same => n,Playback(hello-world)
 same => n,Hangup()
```

**What this does:**
- Dialing `1001` or `1002` rings the corresponding SIP phone.
- Dialing `9999` starts an echo test (you hear your own voice played back).
- Dialing `7777` plays a sequence of test tones (400Hz, 800Hz, 1000Hz, 1400Hz) for 3 seconds each.
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

# RTP media (must match the range in rtp.conf)
sudo ufw allow 10000:20000/udp

# Reload firewall
sudo ufw reload
```

## Step 12: Verify Ports

After starting Asterisk, verify that the SIP port is listening:

```bash
# Check if port 5060 is open
sudo ss -ulnp | grep 5060
```

You should see output like:

```
UNCONN 0  0  0.0.0.0:5060  0.0.0.0:*  users:(("asterisk",pid=...,fd=...))
```

You can also test connectivity from another machine:

```bash
# From a remote machine, test if the port is reachable
nc -zuv <server_ip> 5060
```

## Step 13: Test with a Softphone

Register a SIP softphone to your Asterisk server with these settings:

| Setting | Value |
| ------- | ----- |
| **SIP Server / Domain** | `<your_server_ip>` |
| **Username** | `1001` |
| **Password** | `demo1001pass` |
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
local_net=172.16.0.0/12
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

## Running on a Public Cloud VM

When running Asterisk on a public cloud VM (e.g., Tencent Cloud, AWS, GCP, Azure), the VM typically has a **private IP** internally
and a **public IP** mapped via NAT by the cloud provider. This causes signaling and media failures because Asterisk
advertises the private IP in SIP headers and SDP, which is unreachable from the internet.

### The Problem

Without NAT configuration, Asterisk will:

1. Put the **private IP** in the SIP `Contact` header (e.g., `Contact: <sip:10.5.0.6:5060>`) — the client cannot send ACK or subsequent requests back to this address.
2. Put the **private IP** in the SDP `c=` line and ICE candidates (e.g., `c=IN IP4 10.5.0.6`) — RTP media has nowhere to go.
3. Fail STUN requests if no STUN server is reachable, producing errors like: `Error sending STUN request: Network is unreachable`.
4. Retransmit the `200 OK` repeatedly (because no ACK arrives), then disconnect with `408 Request Timeout`.

The result: SIP registration may work, calls may appear to connect, but there will be **no audio** and calls will **time out**.

### The Fix: Configure NAT in pjsip.conf

Find your VM's public IP. You can check it from the cloud console or run:

```bash
curl -s ifconfig.me
```

Then update the transport section in `/etc/asterisk/pjsip.conf`:

```ini
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060
external_media_address=<your_public_ip>
external_signaling_address=<your_public_ip>
local_net=<your_vpc_cidr>
```

For example, if your public IP is `203.0.113.50` and your VPC uses `10.0.0.0/8`:

```ini
[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060
external_media_address=203.0.113.50
external_signaling_address=203.0.113.50
local_net=10.0.0.0/8
local_net=172.16.0.0/12
```

This tells Asterisk to substitute the public IP in SDP and Contact headers when communicating with endpoints outside the `local_net` range.

### Update the Endpoint Template

The default endpoint template uses `ice_support=yes`, but ICE does not work on cloud VMs because:

1. **Asterisk can't discover its public IP via STUN** — it only advertises private IP candidates (`10.5.0.6`), which are unreachable from the internet.
2. **Clients behind carrier-grade NAT (CGNAT)** may have different public IPs for STUN-discovered addresses vs. actual RTP traffic, causing ICE candidate mismatches.

The fix is to **disable ICE** and use **symmetric RTP** instead. Update the endpoint template in `/etc/asterisk/pjsip.conf`:

```ini
; === Endpoint Template ===
[endpoint-template](!)
type=endpoint
use_avpf=yes
rtcp_mux=yes
ice_support=no
context=internal
disallow=all
allow=ulaw
allow=alaw
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
```

What the new options do:

- **`ice_support=no`** — Disables ICE, which cannot work without a reachable STUN server on the cloud VM.
- **`rtp_symmetric=yes`** — Sends RTP back to the address Asterisk actually *receives* RTP from, instead of the (potentially wrong) address in the client's SDP.
- **`force_rport=yes`** — Uses the actual source port from SIP requests for responses, handling NAT for signaling.
- **`rewrite_contact=yes`** — Rewrites the SIP Contact header with the client's actual source address.

After updating, reload the configuration:

```bash
sudo asterisk -rx 'core reload'
```

### Cloud Security Group Rules

In addition to the OS-level firewall (`ufw`), you must also open ports in the **cloud provider's security group** (or equivalent).
Add these **inbound rules**:

| Protocol | Port Range    | Source      | Description     |
| -------- | ------------- | ----------- | --------------- |
| UDP      | 5060          | 0.0.0.0/0   | SIP signaling   |
| UDP      | 10000-20000   | 0.0.0.0/0   | RTP media       |

> **Tip:** Restrict the source IP/CIDR if you know which networks your softphones will connect from.

### Verifying the Fix

After applying the NAT configuration, connect to the Asterisk CLI and enable SIP debug:

```bash
sudo asterisk -rvvv
```

Make a test call (e.g., dial `9999` for the echo test) and verify that:

1. The `200 OK` response contains your **public IP** in the `Contact` header and SDP `c=` line.
2. The client sends an ACK (no repeated 200 OK retransmissions).
3. Audio works in both directions.

## References

- [Asterisk Official Website](https://www.asterisk.org/)
- [Asterisk Documentation Wiki](https://docs.asterisk.org/)
- [Asterisk PJSIP Configuration](https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-res_pjsip/)
- [Ubuntu 24.04 LTS](https://releases.ubuntu.com/24.04/)
- [Asterisk Downloads](https://downloads.asterisk.org/pub/telephony/asterisk/)

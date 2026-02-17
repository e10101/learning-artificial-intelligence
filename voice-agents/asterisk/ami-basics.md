<div style="width: 100%; margin: 0 auto;">
    <a href="https://github.com/e10101/learning-artificial-intelligence">
        <img src="../../assets/banner.svg" alt="Learning Artificial Intelligence" style="width: 100%; height: auto; display: block;">
    </a>
</div>

# AMI (Asterisk Manager Interface) Basics
---

[![Github](../../assets/badges/github.svg)](https://github.com/e10101/learning-artificial-intelligence)

## Introduction

The **Asterisk Manager Interface (AMI)** is a TCP-based API that allows external programs to control and monitor Asterisk in real time. Through AMI, you can originate calls, monitor channels, reload configuration, and receive events — all programmatically.

AMI is the foundation for building custom dashboards, call center panels, auto-dialers, and integrations with external systems. It uses a simple text-based protocol over TCP (default port **5038**), making it easy to interact with using `nc` (netcat) or any programming language with socket support.

This guide covers enabling AMI, connecting to it, sending basic actions, and understanding the events Asterisk sends back.

## Prerequisites

- A working Asterisk installation (see [Ubuntu Setup](ubuntu-setup.md))
- Root or sudo access on the Asterisk server
- `nc` (netcat) installed for testing

## Step 1: Introduction to AMI Concepts

AMI communication is built around three concepts:

| Concept | Description |
| ------- | ----------- |
| **Actions** | Commands you send to Asterisk (e.g., `Login`, `CoreStatus`). Each action has an `Action` header and optional parameters. |
| **Responses** | Asterisk's reply to your action — either `Success` or `Error`, followed by relevant data. |
| **Events** | Asynchronous notifications Asterisk sends when something happens (e.g., a call starts, a channel hangs up, an endpoint registers). |

A typical AMI session looks like:

1. Connect to TCP port 5038
2. Send `Login` action with username and secret
3. Send actions and receive responses
4. Receive events as they happen in real time
5. Send `Logoff` action to disconnect

## Step 2: Configure AMI

AMI is configured in `/etc/asterisk/manager.conf`. Edit it:

```bash
sudo vi /etc/asterisk/manager.conf
```

Add or update the following:

```ini
[general]
enabled = yes
bindaddr = 0.0.0.0
port = 5038

[admin]
secret = mysecretpassword
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.0
permit = 192.168.0.0/255.255.0.0
permit = 10.0.0.0/255.0.0.0
read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan,originate
write = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan,originate
```

**What this does:**

- `enabled = yes` — Turns on the AMI listener.
- `bindaddr = 0.0.0.0` — Accepts connections from all network interfaces (needed for remote access from your client).
- `port = 5038` — The TCP port AMI listens on.
- `[admin]` — Creates an AMI user called `admin`.
- `secret` — The password for authentication.
- `deny/permit` — IP-based access control: deny all first, then permit localhost and common private subnets (`192.168.x.x`, `10.x.x.x`). Adjust to match your actual network.
- `read/write` — Permission classes this user can access.

> **Important:** Change `mysecretpassword` to a strong, unique password. Adjust the `permit` lines to match your network — for example, if your client is at `192.168.1.50`, you could use `permit = 192.168.1.50/255.255.255.255` for tighter security.

## Step 3: Restart Asterisk

Apply the configuration by restarting Asterisk:

```bash
sudo systemctl restart asterisk
```

Or, if Asterisk is already running, reload the manager module:

```bash
sudo asterisk -rx 'manager reload'
```

Verify AMI is listening:

```bash
sudo ss -tlnp | grep 5038
```

You should see output like:

```
LISTEN 0  10  127.0.0.1:5038  0.0.0.0:*  users:(("asterisk",pid=...,fd=...))
```

## Step 4: Connect to AMI via Netcat

From your client, open a connection to AMI on the Ubuntu server:

```bash
nc <server_ip> 5038
```

For example, if your Ubuntu server is at `192.168.1.100`:

```bash
nc 192.168.1.100 5038
```

You should see a banner like:

```
Asterisk Call Manager/11.0.0
```

This confirms AMI is running and accepting connections. You can now type actions directly.

> **Note:** If the connection is refused, verify the firewall allows port 5038 (see Step 10) and that `bindaddr = 0.0.0.0` is set in `manager.conf`.

## Step 5: Login Action

After connecting, authenticate by typing the following (press Enter after each line, then press Enter again on an empty line to send):

```
Action: Login
Username: admin
Secret: mysecretpassword

```

> **Note:** The blank line at the end is required — it signals the end of the action.

You should receive:

```
Response: Success
Message: Authentication accepted

Event: FullyBooted
Privilege: system,all
Uptime: 133587
LastReload: 133587
Status: Fully Booted
```

The `FullyBooted` event is sent immediately after login, confirming that Asterisk is up and ready.

If you see `Response: Error`, double-check the username, secret, and `permit` ACL in `manager.conf`.

## Step 6: Basic Actions

Once logged in, you can send actions to query Asterisk. Each action is a block of `Key: Value` headers terminated by a blank line.

### CoreStatus

Get basic system status:

```
Action: CoreStatus

```

Example response:

```
Response: Success
CoreStartupDate: 2026-02-14
CoreStartupTime: 21:22:24
CoreReloadDate: 2026-02-14
CoreReloadTime: 21:22:24
CoreCurrentCalls: 0
CoreProcessedCalls: 1
```

### CoreSettings

Get Asterisk build and configuration info:

```
Action: CoreSettings

```

Example response:

```
Response: Success
AMIversion: 11.0.0
AsteriskVersion: 22.8.2
SystemName:
CoreMaxCalls: 0
CoreMaxLoadAvg: 0.000000
CoreRunUser: asterisk
CoreRunGroup: asterisk
CoreMaxFilehandles: 0
CoreRealTimeEnabled: No
CoreCDRenabled: Yes
CoreHTTPenabled: No
SoundsSearchCustomDir: No
```

### CoreShowChannels

List all active channels (calls):

```
Action: CoreShowChannels

```

If no calls are active, you'll see:

```
Response: Success
EventList: start
Message: Channels will follow

Event: CoreShowChannelsComplete
EventList: Complete
ListItems: 0
```

During an active call, each channel appears as a separate `CoreShowChannel` event with details like caller ID, duration, and state.

### PJSIPShowEndpoints

List all configured PJSIP endpoints:

```
Action: PJSIPShowEndpoints

```

Example response (one event per endpoint):

```
Response: Success
EventList: start
Message: A listing of Endpoints follows, presented as EndpointList events

Event: EndpointList
ObjectType: endpoint
ObjectName: 1001
Transport:
Aor: 1001
Auths: auth1001
OutboundAuths:
Contacts: 1001/sip:1001@192.168.8.184:52325;transport=udp,
DeviceState: Not in use
ActiveChannels: 0

Event: EndpointList
ObjectType: endpoint
ObjectName: 1002
Transport:
Aor: 1002
Auths: auth1002
OutboundAuths:
Contacts: 1002/sip:1002@192.168.8.185:59237;transport=udp,1002/sip:1002@192.168.8.172:5060,
DeviceState: Not in use
ActiveChannels: 0

Event: EndpointListComplete
EventList: Complete
ListItems: 2
```

### Using ActionID

You can add an `ActionID` header to any action to correlate responses when sending multiple actions:

```
Action: CoreStatus
ActionID: my-request-123

```

The response and any related events will include the same `ActionID`:

```
Response: Success
ActionID: my-request-123
CoreStartupDate: 2026-02-14
CoreStartupTime: 21:22:24
CoreReloadDate: 2026-02-14
CoreReloadTime: 21:22:24
CoreCurrentCalls: 0
CoreProcessedCalls: 1
```

## Step 7: Watch Live Events (Hands-On Demo)

One of AMI's most powerful features is **real-time event streaming**. Once logged in, events flow continuously into your terminal as things happen on the Asterisk server. Let's see this in action.

### How Event Streaming Works

**Events are enabled automatically after successful login.** You don't need to send a separate action to start receiving events — they begin flowing immediately based on your user's `read` permissions in `manager.conf`.

However, you can control event flow with the optional `Events` action:

```
Action: Events
EventMask: on

```

Or disable events:

```
Action: Events
EventMask: off

```

You can also filter specific event types:

```
Action: Events
EventMask: system,call

```

> **In practice:** Most applications leave events enabled (the default after login) and simply parse the incoming stream. The `Events` action is useful if you want to temporarily pause event flow or filter to specific event classes.

### Setup

You'll need two things running at the same time:

1. **Terminal on your client** — AMI session via `nc` (already connected and logged in from Steps 4–5)
2. **A SIP softphone on your client** — registered to the Asterisk server as extension `1001` (see [Ubuntu Setup — Step 14](ubuntu-setup.md#step-14-test-with-a-softphone))

Keep the `nc` session open and visible. Events will appear automatically as you perform actions on the softphone.

### Demo 1: SIP Registration Events

On your client, **open your softphone** and register as extension `1001`. Watch your AMI terminal — you'll see registration events stream in:

```
Event: ContactStatus
ContactStatus: Created
AOR: 1001
URI: sip:1001@192.168.1.50:5060
EndpointName: 1001

Event: ContactStatus
ContactStatus: Reachable
AOR: 1001
URI: sip:1001@192.168.1.50:5060
EndpointName: 1001
```

Now **disconnect the softphone** (close it or disable the account). You'll see:

```
Event: ContactStatus
ContactStatus: Removed
AOR: 1001
URI: sip:1001@192.168.1.50:5060
EndpointName: 1001
```

> **What you're seeing:** Every SIP registration change is pushed to your AMI session in real time. This is how call center dashboards know which agents are online.

### Demo 2: Call Events

Register two softphones as `1001` and `1002`. From `1001`, **dial `1002`**. Watch the AMI terminal — you'll see the full call lifecycle:

**Call starts:**

```
Event: Newchannel
Channel: PJSIP/1001-00000001
CallerIDNum: 1001
CallerIDName: User 1001
Exten: 1002
Context: internal

Event: DialBegin
Channel: PJSIP/1001-00000001
DestChannel: PJSIP/1002-00000002
CallerIDNum: 1001
DestCallerIDNum: 1002
DialString: 1002
```

**1002 rings:**

```
Event: Newstate
Channel: PJSIP/1002-00000002
ChannelState: 5
ChannelStateDesc: Ringing
```

**1002 answers:**

```
Event: DialEnd
Channel: PJSIP/1001-00000001
DestChannel: PJSIP/1002-00000002
DialStatus: ANSWER
```

**Someone hangs up:**

```
Event: HangupRequest
Channel: PJSIP/1002-00000002

Event: Hangup
Channel: PJSIP/1002-00000002
Cause: 16
Cause-txt: Normal Clearing
```

> **Try it:** While the call is active, you can also send `Action: CoreShowChannels` in the same `nc` session to see the live channels. Events and responses are interleaved in the same stream.

### Demo 3: Echo Test Events

From your softphone, **dial `9999`** (the echo test). Watch the AMI terminal:

```
Event: Newchannel
Channel: PJSIP/1001-00000003
Exten: 9999
Context: internal

Event: Newstate
Channel: PJSIP/1001-00000003
ChannelStateDesc: Up

Event: Hangup
Channel: PJSIP/1001-00000003
Cause: 16
Cause-txt: Normal Clearing
```

### Common Event Types

| Event | When It Fires |
| ----- | ------------- |
| `ContactStatus` | A SIP endpoint registers, unregisters, or becomes reachable/unreachable |
| `Newchannel` | A new channel (call leg) is created |
| `DialBegin` | A Dial() application starts ringing the destination |
| `DialEnd` | A Dial() application completes (answered, busy, no answer) |
| `Newstate` | A channel changes state (ringing, up, etc.) |
| `Hangup` | A channel is hung up |
| `HangupRequest` | A hangup was requested |
| `DTMFBegin` / `DTMFEnd` | A DTMF digit is pressed |
| `VarSet` | A channel variable is set |
| `FullyBooted` | Asterisk has fully started |

> **Key takeaway:** AMI is not request-response only — it's an **event stream**. Once logged in, events flow continuously without you asking for them. This makes AMI ideal for building real-time monitoring tools, call center wallboards, and automated call handling systems.

## Step 8: Logoff

When you're done, disconnect cleanly:

```
Action: Logoff

```

You'll receive:

```
Response: Goodbye
Message: Thanks for all the fish.
```

The connection will close.

## Step 9: Security Best Practices

AMI gives full control over your Asterisk system. Treat it like root access.

### Bind Address

By default, bind AMI to localhost only:

```ini
bindaddr = 127.0.0.1
```

If you must allow remote access, bind to a specific internal IP — **never** `0.0.0.0` in production:

```ini
bindaddr = 10.0.1.5
```

### ACL (Access Control Lists)

Always use `deny` and `permit` rules for each AMI user:

```ini
[admin]
secret = a-very-strong-password-here
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.0
permit = 10.0.1.0/255.255.255.0
```

This denies all connections by default, then allows only localhost and the `10.0.1.x` subnet.

### Least Privilege Permissions

Don't give every user full read/write access. Create separate users with minimal permissions:

```ini
[monitor]
secret = monitor-password
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.0
read = system,call,reporting
write =
```

This user can only read system, call, and reporting events — it cannot execute any write actions.

### Strong Passwords

Use long, random passwords for AMI secrets. Avoid dictionary words or short strings. AMI authentication is plaintext over TCP, so:

- Use AMI only over trusted networks (localhost or VPN)
- Consider tunneling via SSH if remote access is needed:
  ```bash
  ssh -L 5038:127.0.0.1:5038 user@asterisk-server
  ```

## Step 10: Firewall Considerations for AMI Port

If `ufw` is not active on your Ubuntu server (check with `sudo ufw status`), no firewall rule is needed at the OS level — port 5038 is reachable as long as Asterisk is listening.

However, if your server is on a **cloud provider** (AWS, GCP, Tencent Cloud, etc.), make sure the **security group** allows inbound TCP port 5038 from your client's IP.

| Protocol | Port | Source | Description |
| -------- | ---- | ------ | ----------- |
| TCP | 5038 | `<your_client_ip>/32` | AMI access |

> **Tip:** Even without a host firewall, the `deny/permit` ACL in `manager.conf` still protects AMI. Only IPs listed in `permit` can authenticate. This is your primary line of defense.

> **Warning:** If you later enable `ufw`, remember to add a rule for port 5038 restricted to trusted IPs:
> ```bash
> sudo ufw allow from <your_client_ip> to any port 5038 proto tcp
> ```

## Useful AMI Actions Reference

| Action | Description |
| ------ | ----------- |
| `Login` | Authenticate with AMI |
| `Logoff` | Disconnect from AMI |
| `Events` | Enable/disable event flow or filter event types (default: enabled after login) |
| `CoreStatus` | Get system status (uptime, active calls) |
| `CoreSettings` | Get Asterisk version and build info |
| `CoreShowChannels` | List all active channels |
| `PJSIPShowEndpoints` | List configured PJSIP endpoints |
| `PJSIPShowContacts` | Show registered PJSIP contacts |
| `Command` | Execute an Asterisk CLI command (e.g., `Command: dialplan show internal`) |
| `Originate` | Programmatically originate a call |
| `Hangup` | Hang up a specific channel |
| `Redirect` | Transfer a channel to a different extension |
| `Reload` | Reload Asterisk configuration modules |
| `QueueStatus` | Get call queue statistics |
| `GetVar` | Get a channel variable value |
| `SetVar` | Set a channel variable |
| `Ping` | Keep-alive check (returns `Pong`) |

## Troubleshooting

### Cannot connect to AMI

Verify AMI is enabled and listening:

```bash
# Check if the port is open
sudo ss -tlnp | grep 5038

# Check manager.conf has enabled=yes
sudo asterisk -rx 'manager show settings'
```

### Login fails with "Authentication failed"

- Verify the username and secret in `manager.conf`
- Check the `permit` ACL allows your source IP
- Ensure you're sending a blank line after the action headers

### No events received after login

Some events require specific `read` permissions. Verify the user's `read` line includes the relevant class:

```bash
sudo asterisk -rx 'manager show user admin'
```

### Connection drops immediately

- Check if fail2ban or a firewall is blocking your IP
- Verify `bindaddr` matches the IP you're connecting to
- Check Asterisk logs: `sudo tail -f /var/log/asterisk/messages`

### Actions return "Permission denied"

The AMI user lacks the required `write` permission class. Update `manager.conf` and reload:

```bash
sudo asterisk -rx 'manager reload'
```

## References

- [Asterisk AMI Documentation](https://docs.asterisk.org/Configuration/Interfaces/Asterisk-Manager-Interface-AMI/)
- [AMI Actions Reference](https://docs.asterisk.org/Asterisk_22_Documentation/API_Documentation/AMI_Actions/)
- [AMI Events Reference](https://docs.asterisk.org/Asterisk_22_Documentation/API_Documentation/AMI_Events/)
- [Asterisk Official Website](https://www.asterisk.org/)
- [Asterisk Documentation Wiki](https://docs.asterisk.org/)

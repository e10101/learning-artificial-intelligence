# learning-artificial-intelligence

Learning Artificial Intelligence

## AI Platforms & Products

### LLM Frameworks

| Category | Name | Description |
|----------|------|-------------|
| Orchestration | [LangGraph](https://github.com/langchain-ai/langgraph) | Framework for building stateful, multi-actor applications with LLMs |
| Orchestration | [LangSmith](https://smith.langchain.com/) | Platform for debugging, testing, and monitoring LLM applications |
| Framework | [LangChain](https://langchain.com/) | Framework for developing applications powered by language models |
| Framework | [DSPy](https://dspy.ai/) | Declarative framework for building modular AI software with natural-language modules |
| Security | [promptfoo](https://www.promptfoo.dev/) | Open-source LLM security tool for red teaming, guardrails, and model security |

### LLM Models

| Category | Name | Description |
|----------|------|-------------|
| Base Model | [Gemini](https://ai.google.dev/gemini) | Google's multimodal AI model that understands text, code, audio, images, and video |

### Voice Agents

| Category | Name | Description |
|----------|------|-------------|
| Voice Agent | [Pipecat](https://pipecat.ai) | Open source framework for voice and multimodal conversational AI. |
| Voice Agent | [LiveKit](https://livekit.io/) | The all-in-one Voice AI platform Build, deploy, and scale realtime agents. Open source. Enterprise scale. |
| Text-to-Speech | [Cartesia](https://cartesia.ai/) | The fastest, ultra-realistic voice AI platform. |
| Visual Agente | [bitHuman](https://www.bithuman.ai/) | Visual agents enriching our lives. |
| Real-time Comms | [WebRTC](https://webrtc.org/) | Open-source project that provides web browsers and mobile applications with real-time communication capabilities. |

### AI Applications

| Category | Name | Description |
|----------|------|-------------|
| Research | [NotebookLM](https://notebooklm.google.com/) | Personalized AI Research Assistant |

### DevOps & Kubernetes

| Category | Name | Description |
|----------|------|-------------|
| Autoscaling | [KEDA](https://keda.sh/) | Kubernetes Event-driven Autoscaling enables scale of any container based on the number of events needing to be processed |

## 🐳 Running Notebooks with Docker

This project uses Docker to provide a consistent environment for running Jupyter notebooks. The setup includes:

- Jupyter Lab with scientific Python packages pre-installed

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Quick Start

1. Start the services:

   ```bash
   docker-compose up
   ```

2. Access the services in your browser:

   - Jupyter Lab: `http://localhost:58888` (token: `jupyter`)

3. You'll find the notebooks in the mounted directories:
   - Jupyter: `/home/jovyan/work`

### Features

- Jupyter Lab interface for both services
- Scientific Python stack pre-installed
- Automatic volume mounting (changes are saved to your local files)
- Persistent workspace

### Stopping the Server

To stop the server, press `Ctrl+C` in the terminal or run:

```bash
docker-compose down
```

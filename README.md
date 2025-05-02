# learning-artificial-intelligence

Learning Artificial Intelligence

## AI Platforms & Products

| Category | Name | Description |
|----------|------|-------------|
| Orchestration | [LangGraph](https://github.com/langchain-ai/langgraph) | Framework for building stateful, multi-actor applications with LLMs |
| Orchestration | [LangSmith](https://smith.langchain.com/) | Platform for debugging, testing, and monitoring LLM applications |
| Model | [Gemini](https://ai.google.dev/gemini) | Google's multimodal AI model that understands text, code, audio, images, and video |
| Framework | [LangChain](https://langchain.com/) | Framework for developing applications powered by language models |
| Voice Agent | [Pipecat](https://pipecat.ai) | Open source framework for voice and multimodal conversational AI. |

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

# learning-artificial-intelligence

Learning Artificial Intelligence

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

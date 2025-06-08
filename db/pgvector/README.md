# PostgreSQL with pgvector Installation Guide

This guide shows different ways to install and use pgvector with PostgreSQL, including both fresh installations and adding pgvector to existing PostgreSQL instances.

## Option 1: Pre-built pgvector Docker Image (Recommended)

Use the official pgvector Docker image that comes with PostgreSQL and pgvector pre-installed:

```bash
# Using the docker-compose.yml in this directory
docker-compose up -d
```

## Option 2: Adding pgvector to Existing PostgreSQL Docker Container

If you already have a PostgreSQL Docker container running, you can create a new container with pgvector:

### Method 2A: Dockerfile Approach

Create a `Dockerfile`:

```dockerfile
FROM postgres:16

# Install build dependencies
RUN apt-get update && \
    apt-get install -y \
    build-essential \
    git \
    postgresql-server-dev-16 \
    && rm -rf /var/lib/apt/lists/*

# Clone and install pgvector
RUN git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git /tmp/pgvector && \
    cd /tmp/pgvector && \
    make clean && \
    make OPTFLAGS="" && \
    make install && \
    rm -rf /tmp/pgvector

# Copy initialization scripts
COPY init/ /docker-entrypoint-initdb.d/
```

Build and run:
```bash
docker build -t postgres-with-pgvector .
docker run -d \
  --name postgres_custom \
  -e POSTGRES_DB=learning_ai \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres-with-pgvector
```

### Method 2B: Installing pgvector in Running Container

If you have an existing PostgreSQL Docker container:

```bash
# Enter the running container
docker exec -it your_postgres_container bash

# Install dependencies
apt-get update
apt-get install -y build-essential git postgresql-server-dev-16

# Clone and install pgvector
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git /tmp/pgvector
cd /tmp/pgvector
make clean
make OPTFLAGS=""
make install

# Restart PostgreSQL
pg_ctl restart -D /var/lib/postgresql/data
```

Then connect to PostgreSQL and enable the extension:
```sql
CREATE EXTENSION vector;
```

## Option 3: Native PostgreSQL Installation

### Ubuntu/Debian

```bash
# Install PostgreSQL if not already installed
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib postgresql-server-dev-16

# Install build dependencies
sudo apt-get install -y build-essential git

# Clone and install pgvector
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make clean
make OPTFLAGS=""
sudo make install

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### macOS (with Homebrew)

```bash
# Install PostgreSQL if not already installed
brew install postgresql

# Install pgvector
brew install pgvector

# Or build from source:
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make clean
make OPTFLAGS=""
make install

# Restart PostgreSQL
brew services restart postgresql
```

### CentOS/RHEL/Fedora

```bash
# Install PostgreSQL if not already installed
sudo dnf install -y postgresql postgresql-server postgresql-devel

# Install build dependencies
sudo dnf install -y gcc git make

# Clone and install pgvector
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make clean
make OPTFLAGS=""
sudo make install

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Enabling pgvector Extension

After installation, connect to your PostgreSQL database and enable the extension:

```sql
-- Connect to your database
\c your_database_name

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## Sample Usage

Once pgvector is installed, you can create tables with vector columns:

```sql
-- Create table with vector column
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding VECTOR(1536)  -- 1536 dimensions for OpenAI embeddings
);

-- Insert sample data
INSERT INTO items (content, embedding) VALUES 
('Hello world', '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]'),
('Goodbye world', '[16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1]');

-- Find similar vectors using cosine similarity
SELECT content, 1 - (embedding <=> '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]') AS similarity
FROM items
ORDER BY embedding <=> '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]'
LIMIT 5;
```

## Creating Indexes for Performance

For better performance with large datasets:

```sql
-- Create IVFFlat index for approximate search
CREATE INDEX ON items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Or create HNSW index (if available)
CREATE INDEX ON items USING hnsw (embedding vector_cosine_ops);
```

## Connection Examples

### Python (psycopg2)

```python
import psycopg2
import numpy as np

# Connect to database
conn = psycopg2.connect(
    host="localhost",
    database="learning_ai",
    user="postgres",
    password="postgres"
)

# Enable vector extension
cur = conn.cursor()
cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")

# Insert vector data
embedding = np.random.random(1536).tolist()
cur.execute(
    "INSERT INTO embeddings (content, embedding) VALUES (%s, %s)",
    ("Sample text", embedding)
)

conn.commit()
```

### Node.js (pg)

```javascript
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  database: 'learning_ai',
  user: 'postgres',
  password: 'postgres'
});

await client.connect();

// Enable vector extension
await client.query('CREATE EXTENSION IF NOT EXISTS vector;');

// Insert vector data
const embedding = Array.from({length: 1536}, () => Math.random());
await client.query(
  'INSERT INTO embeddings (content, embedding) VALUES ($1, $2)',
  ['Sample text', `[${embedding.join(',')}]`]
);
```

## Troubleshooting

### Common Issues

1. **Extension not found**: Make sure pgvector is properly installed and PostgreSQL is restarted
2. **Permission denied**: Use `sudo` for installation commands
3. **Build failures**: Ensure you have the correct PostgreSQL development headers installed
4. **Version compatibility**: Check that pgvector version is compatible with your PostgreSQL version

### Verify Installation

```sql
-- Check if extension is available
SELECT * FROM pg_available_extensions WHERE name = 'vector';

-- Check if extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Test vector operations
SELECT '[1,2,3]'::vector + '[4,5,6]'::vector;
``` 
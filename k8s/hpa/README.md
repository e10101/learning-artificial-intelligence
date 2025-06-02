# HPA in K8s

## Setup

Create a local K8s cluster in Macbook:

```shell
# Install kind with Homebew
brew install kind

# Create a new cluster
kind create cluster --config ./kind-cluster-config.yaml

# Check created nodes
kubectl get nodes
```

We will see nodes as following

```plaintext
NAME                  STATUS   ROLES           AGE   VERSION
kind-control-plane    Ready    control-plane   48s   v1.33.1
kind-control-plane2   Ready    control-plane   25s   v1.33.1
kind-control-plane3   Ready    control-plane   16s   v1.33.1
kind-worker           Ready    <none>          15s   v1.33.1
kind-worker2          Ready    <none>          15s   v1.33.1
kind-worker3          Ready    <none>          15s   v1.33.1
```

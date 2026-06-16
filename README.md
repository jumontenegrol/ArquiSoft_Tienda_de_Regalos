# 🎁 Boutique de Regalos Villapinzón

---

## 1. Team

**Group:** 3f

| # | Full Name |
|---|-----------|
| 1 | Laura Valentina Díaz Velandia |
| 2 | Juan Daniel Gonzalez Sierra |
| 3 | Juan Sebastian Muñoz Lemus|
| 4 | Juan Felipe Hernández Ochoa |
| 5 | Juan David Montenegro Lopez  |

---

## 2. Software System

### Name
**Boutique de Regalos Villapinzón**

### Logo
<img width="1206" height="1156" alt="Logo" src="assets/Logo.jpeg" />



### Description

Boutique de Regalos Villapinzón is a web-based e-commerce platform designed for a small gift shop located in Villapinzón, Colombia. The system allows customers to browse a product catalog, view product details, manage a shopping cart, place orders, and submit product reviews. It also includes an administrative panel for product management and sales monitoring.

The system is built following a **microservices architecture**, where each business domain is handled by an independent service with its own database, all coordinated through a central API Gateway.

---

## 3. Architectural Structures

### 3.1 Component-and-Connector (C&C) Structure

 #### C&C View

The following diagram illustrates the runtime components of the system and their connectors:
<img width="794" alt="C C View-Página-2 drawio (1)" src="https://github.com/user-attachments/assets/1390f7ca-3c1c-48c4-8e85-872c3b5bc054" />



#### Description of Architectural Elements and Relations

| Element | Type | Technology | Responsibility |
|---------|------|------------|----------------|
| Web Browser | External Client | Host OS / HTTP Client | Generates user input, rendering the visible layouts. Initiates asynchronous web requests towards the application boundary to interact with the catalog, carts, and user panels. |
| Frontend (CSR) | Client Component | HTML5, CSS3, Vanilla JS, Tailwind CSS | Client-Side rendering of the application's user interface. Dynamically fetches and updates DOM content for features like carts and admin dashboards without requesting full page reloads from the server. |
| Frontend SSR | Client Component | Node.js, Next.js / Express | Server-Side computational unit generating pre-rendered HTML views of the application to ensure fast initial page loads and optimal indexing. Interacts directly with MinIO to serve and manage uploaded media. |
| MinIO | Data Store / Object Storage | MinIO (S3 Compatible) | Centralized object storage system managing static assets, product imagery, and user uploads. Exposes an S3-compatible API for the SSR application and a Web Console for administration. |
| Coordinator | Failover Router | Node.js / Custom Router | Primary entry point for the public network boundary. Acts as a failover router directing external traffic securely into either the primary or the spare load balancers. |
| NGINX-LB & NGINX-LB-SPARE | Load Balancer / Reverse Proxy | Nginx Alpine | Redundant Layer 7 proxy nodes (Active/Passive or Round-Robin setup). They distribute incoming HTTP traffic evenly across the internal API Gateway cluster, ensuring continuous uptime. |
| API Gateway Cluster (x3) | Orchestrator / Proxy Service | Node.js, Express.js | Scaled cluster of reverse-proxies. Protects the internal system boundary by providing a unified endpoint. Intercepts incoming traffic, validates authorization (JWT), balances loads across inner microservices, and interacts directly with internal message brokers and caches. |
| Auth Service | Logic Service | C++ Native (GCC, libbcrypt) | Handles intensive cryptographic computing requirements. Responsible for managing credential hashing, executing secure user registration/logins, and generating valid JSON Web Tokens (JWT). *Operates in strict isolation connected only to its database.* |
| Product Service | Logic Service | Node.js, Express.js | Core domain element executing inventory algorithms. It queries, creates, updates, and removes available giftshop products, maintaining strong control over physical stock calculation rules. |
| Order Service | Logic Service | Node.js, Express.js | Transactional logic processor for cart and billing behaviors. Aggregates active checkouts, calculates final totals, and generates async checkout events by publishing payloads directly to the RabbitMQ broker. |
| Review Service | Logic Service | Python, FastAPI, Uvicorn | Independent processing node for customer feedback logic. Handles validations for ratings, captures textual opinions securely, and exposes product-rating aggregations. |
| Notification Service | Logic Worker | Node.js | Headless background process. Subscribes to the RabbitMQ broker as a listener, reacting to newly registered orders by firing external email notifications via an SMTP connection and utilizing Redis for temporal operational state. |
| Auth Database | Data Store | PostgreSQL 15 | Relational repository explicitly configured to securely encapsulate the persistent state of registered system user credentials. | 
| Products DB | Data Store | PostgreSQL 15 | Persistent relational storage enforcing strong data consistency and schema constraints (ACID) over the store's merchandise parameters. | 
| Orders DB | Data Store | PostgreSQL 15 | Highly transactional relational schema managing the integrity of active carts and archiving deeply normalized invoicing relationships. | 
| Reviews DB | Data Store | MongoDB 6 | Non-relational (Document) persistent layer enabling high-throughput writes for unpredictable text sizes regarding product reviews, utilizing a flexible BSON data structure. | 
| RabbitMQ | Message Broker | Erlang (RabbitMQ Mgmt) | Centralized asynchronous message bus. Implements durable operational queues linking the API Gateways, Order Service (Producers), and Notification Service (Consumer), completely decoupling request lifecycles. | 
| Redis | Data Cache | Redis 7 Alpine | Ultra-fast in-memory, key-value persistent storage used dynamically by the API Gateways and Notification pipelines to maintain lightweight application states, rate limiting, and log temporal operational progress. | 

##### **Connectors:**

- **Public Web Request (HTTP/HTTPS):** An asynchronous network connector that crosses the System Boundary from the External Client towards the Frontends and Coordinator. It securely routes end-user inputs using generic network payloads.
- **Reverse Proxy Stream (HTTP Proxy):** Internal HTTP connections navigating the high-availability layer. Links the Coordinator to the Nginx Load Balancers, and subsequently routes traffic from the Nginx nodes to the scaled API Gateway instances.
- **Internal JSON Connectors (HTTP Internal):** Synchronous, protocol-bound connectors (running over standard TCP channels) that mediate the execution between the API Gateway Cluster and the internal Logic Services.
- **Object Storage API (S3 Protocol / HTTP over TCP 9000):** A REST-based S3 compatible connector linking the Frontend SSR component directly to MinIO for heavy media file retrieval and uploads.
- **Relational Data Stream (SQL over TCP 5432):** A deeply stateful connection pool generated by language-specific drivers. It mediates continuous structured queries enforcing commit/rollback operations against the isolated PostgreSQL schemas.
- **Document Data Stream (NoSQL Protocol over TCP 27017):** A specialized binary wire connector controlled by the Python driver, linking the Review Service logic exclusively to the MongoDB container.
- **Asynchronous Message Bus (AMQP Protocol over TCP 5672):** A completely asynchronous push/pull connector facilitating the Publish-Subscribe mechanism. It allows the API Gateways and Order Service to drop messages into queues, and the Notification Service to consume them without blocking the main HTTP threads.
- **In-Memory Cache Stream (RESP Protocol over TCP 6379):** High-speed serialization protocol allowing the API Gateways and Notification Worker to execute nanosecond read/writes against Redis.
- **External SMTP Stream (TCP 587):** An outbound network protocol connector utilized specifically by the Notification Worker to reach external Email Server Providers for sending transactional notifications.

#### Description of Architectural Styles Used

##### **High Availability & Redundancy Pattern**
Introduced at the public boundary through the integration of a `Coordinator`, dual Load Balancers (`NGINX-LB` and `NGINX-LB-SPARE`), and an `API Gateway Cluster (x3)`.
*Why it was chosen:* To eliminate single points of failure at the entry level. If a Gateway container crashes or a Primary Nginx node becomes unresponsive, the Router/Spare seamlessly redirects traffic to healthy instances, ensuring the store remains fully accessible during spikes or localized outages.

##### **Microservices Architectural Style**
The principal approach divides the solution by strict sub-domains based on business context (Products, Orders, Reviews, and Users).
*Why it was chosen:* It neutralizes catastrophic runtime failure. If the Review engine experiences severe drops, the system’s ability to take payments or process orders remains fully operational. It allows isolated debugging and individual container deployment methodologies.

##### **API Gateway Orchestration Pattern**
Instead of exposing the full underlying system grid, the architecture employs a traffic control gate (acting as a cluster). 
*Why it was chosen:* Primarily selected for internal resource cloaking and to alleviate cross-cutting structural complexities on the client. It centralizes all core JWT authentication rules. Requests lacking authorization headers never breach the Gateway layer to reach isolated services, effectively creating a "Zero Trust" boundary policy internally.

##### **Polyglot Persistence & Programming Pattern**
Software problems demand diverse paradigms; therefore, no unified tech-stack was aggressively imposed.
*Why it was chosen:* Computationally punishing routines regarding cryptography leverage C++ Native capabilities on the Auth Service. At the database tier, structural rigidity inside cart payments relies safely on relational ACID schemas via PostgreSQL, while variable text formats from reviews stream towards the schematic flexibility offered by MongoDB. Static media utilizes optimized S3 storage via MinIO.

##### **Event-Driven / Message Broker Pattern**
Deployed explicitly in the lower runtime hierarchy involving the Gateways, Order Service, RabbitMQ, and Notification Worker.
*Why it was chosen:* It successfully implements behavioral decoupling. A user generating an Order will receive a near-instant success response precisely because the system is deferring external communications (SMTP), throwing jobs onto the asynchronous RabbitMQ Queue without stalling main HTTP processors.

##### **Database-per-Service Structural Pattern**
Enforcing strict isolation, absolutely no databases are shared or linked at an entity level amongst internal services.
*Why it was chosen:* Data layers mirror the logic component topology exclusively. This structural requirement mitigates widespread migration problems, ensuring that restructuring product tables creates no compilation cascading breakdowns within auth or order logic bounds.

### 3.2 Deployment Structure

#### Deployment View
<img width="661" height="664" alt="Deployment View (1)" src="assets/Diagrama despliegue.jpeg" />

#### Description of architectural elements and relations.
| Node (Environmental Element) | Infrastructure Type | Allocated Software Elements | Provided Properties |
|---------|------|------------|----------------|
| Client Node |	User Physical Device (PC / Mobile)	| Web Browser |	Execution environment for the DOM, client-side scripts, and TCP/IP connectivity to access the public internet. |
| Managed Execution Node |	Cloud Compute Environment | frontend, frontend-ssr, api-gateway, auth-service, product-service, order-service, review-service	| Dynamic CPU and RAM allocation for stateless processes. Provides environment variable injection, HTTP proxy capabilities, and runtime support for Node.js, Python, and C++ executables. |
| Relational Database Node	| Cloud Database Cluster | auth-db, products-db, orders-db (PostgreSQL) |	Persistent SSD storage. Provides optimized read/write operations, backup management, and specific port availability (TCP 5432) for SQL transactions. |
| Document Database Node	| Cloud Database Cluster  |	reviews-db (MongoDB) |	Flexible storage capacity designed for document collections (BSON), enabling NoSQL querying over a dedicated TCP connection. | |
| Asynchronous Node |	Cloud Compute / Container Environment |	rabbitmq, redis, notification-worker |	Specialized node maintaining active, persistent state loops. Provides memory (RAM) allocation for queue buffering and caching, separating background processing load from the main request nodes. |

##### Relations (Mappings and Connections):
- **Allocated-to Relation:** Each software component from the C&C view is mapped to a specific node based on its resource requirements. Stateless logic and routing layers are allocated-to the Managed Execution Node, whereas stateful elements (databases, queues) are strictly allocated-to the Storage and Asynchronous Nodes.
- **External Communication Channels:** The link between the Client Node and the Managed Execution Node is defined as an external Wide Area Network (WAN) channel over standard HTTPS, carrying UI payloads.
- **Internal Inter-Node Channels:** The Managed Execution Node communicates with the Database and Asynchronous nodes via specific network connections utilizing TCP/IP protocols over designated ports. These channels are restricted from public internet access, accepting requests exclusively from the designated application node.

#### Description of architectural patterns used.
##### Deployment Allocation Style:
This specific pattern within the Allocation viewtype focuses on mapping runtime software onto hardware/infrastructure entities. It documents how the required properties of a software element  dictate its assignment to an environmental element that provides those capabilities (the Asynchronous Node).
##### Distributed Infrastructure Pattern:
The architecture explicitly divides processing power across separate logical environments instead of allocating all software elements into a single monolithic server. The division into compute nodes, distinct database nodes, and asynchronous workers ensures that hardware limitations or physical faults in the document database node do not consume the computational resources allocated for the order transactions.
##### Container-Oriented Packaging:
Although deployed onto managed cloud structures, the underlying system guarantees consistency by using Docker configuration mechanisms (Dockerfiles and docker-compose.yml). The software elements encapsulate their OS-level dependencies (like the GCC compiler requirements for the C++ service), standardizing the execution context prior to its physical or cloud node allocation.

### 3.3 Layered Structure

#### Layered View
<img width="491" height="944" alt="Layered view" src="assets/Diagrama de Capas.jpeg" />
#### Description of architectural elements and relations.
| Layer Name |	Contained Modules / Components	| Responsibility |	Inter-Layer Relation |
|----|---|---|--|
| 1. Presentation Layer	| CSR Client Interfaces (/frontend)<br>SSR Client Interfaces (/frontend-ssr) |	Encapsulates User Interface (UI) rendering and layout definitions. Formats data for user interaction and captures input events.	| Allowed-to-use Layer 2 (Orchestration). Cannot query logic or data directly. |
| 2. Orchestration & Routing Layer |	API Gateway Logic (/api-gateway) |	Centralizes access control. Responsible for verifying JSON Web Tokens (JWT), managing CORS policies, and dispatching payload routes to the corresponding business domains. |	Allowed-to-use Layer 3 (Business Logic). |
| 3. Business Logic Layer |	Auth Module, Product Module, Order Module, Review Module, Notification Module |	The computational core containing the Domain-Driven boundaries. Executes the strict business rules, validations, and logic isolated by domain contexts. |	Allowed-to-use Layer 4 (Data Access). Modules here operate autonomously. |
| 4. Infrastructure & Data Access Layer |	Relational Models (PostgreSQL DAOs)<br>Document Models (MongoDB Schemas)<br>Key-Value Memory (Redis clients)<br>Message Bus wrappers (RabbitMQ) |	Provides standard abstractions for data persistence and asynchronous message dispatching. It manages queries, transactions, and state manipulation formatting. |	Terminal Layer. Does not depend on or use lower layers. |

##### Relations (Allowed-to-use / Depends-on):
- The primary relation is the Allowed-to-use constraint. It dictates that source code or components situated in an upper layer can only invoke, import, or rely on the exposed interfaces of the layer immediately below it.
- Upward restrictions: Code within the Infrastructure Layer is strictly forbidden from referencing objects or formatting rules defined in the Presentation or Business layers.
#### Description of architectural patterns used.
##### Strict Layered Pattern:
This architectural style enforces a unidirectional top-down dependency model. It ensures separation of concerns by restricting direct communication across multiple layers (layer bridging is prohibited).
Architectural Benefit: This pattern ensures Modifiability and Maintainability. If a future requirement demands switching the data persistence technology, the changes are entirely contained within the Infrastructure Layer. The Business Logic and Presentation layers require zero code modifications, as they only depend on abstract interfaces.
##### Separation of Concerns (SoC):
The design systematically separates what the system displays (Presentation), how it routes requests (Orchestration), what it computes (Business Logic), and how it stores state (Infrastructure). This prevents tightly coupled code (monolithic "spaghetti code") and allows distinct development teams to work on separate layers simultaneously without compilation conflicts.
##### Domain Sub-layering:
Within the Business Logic Layer, the modules are grouped by business subdomain (Products, Orders, Reviews, Authentication) rather than by technical function. This sub-pattern limits the horizontal allowed-to-use relations; for instance, the Product module logic does not interfere with the Authentication module code, maintaining strict functional cohesion.
### 3.4 Decomposition Structure

#### Decomposition View
<img width="601" height="491" alt="Decomposition View" src="assets/Diagrama Descomposicion.jpeg" />

#### Description of architectural elements and relations.
The entire enterprise solution (<<System>> Boutique de Regalos) is decomposed into three principal architectural modules (<<Subsystems>>), which are subsequently decomposed into functional units (<<Modules>>).
##### Presentation <<Subsystem>>
- Responsibility: Defines all logic related to generating human-readable interfaces, capturing client input events, and managing local browser sessions.
- CSR Client <<Module>>: Specifically responsible for single-page dynamic DOM updates and real-time frontend logic.
- SSR Client <<Module>>: Specifically responsible for the backend-driven generation of HTML strings tailored for Search Engine Optimization and fast initial load states.
##### Orchestration & Routing <<Subsystem>>
- Responsibility: Masks the underlying distributed topology. Concentrates edge policies and delegates network load.
- API Gateway <<Module>>: Responsible for interpreting external requests, managing Cross-Origin Resource Sharing (CORS) rules, inspecting identity boundaries (authorization), and applying proxy-routing mapping configurations.
##### Core Business Logic <<Subsystem>>
- Responsibility: Implements the proprietary algorithms, validations, and data models of the e-commerce domain. This subsystem enforces the Information-Hiding Principle by segregating into the following submodules:
- Authentication <<Module>>: Encapsulates cryptographic secrets, hashing procedures (libbcrypt), and identity tracking variables.
- Product Management <<Module>>: Manages the schemas, rules, and variations defining the available inventory entities.
- Order Management <<Module>>: Holds the algorithms computing financial totals, shopping cart modifications, and logical checkout verifications.
- Review Management <<Module>>: Manages user-generated qualitative data formatting and evaluation score verifications.
- Async Notification <<Module>>: Separates all logic concerning off-cycle communication formatting (like processing payload data resulting from successful orders).
##### Relations:
- Is-part-of (Containment): The exclusive relation depicted. For instance, the Authentication <<Module>> is defined logically as being "contained by" or "is-part-of" the Core Business Logic <<Subsystem>>. This strictly partitions the workload, making each module a discrete candidate for independent development or modification without conceptual overlap.
---

## 🏗️ Patrones de Calidad — Prototipo 3

Se implementaron 6 patrones de arquitectura distribuidos en tres categorías: **Seguridad**, **Rendimiento** y **Resiliencia**.

---

### 🔐 Security

### S1 — Network Segmentation

**Tactic:** Limit exposure  
**Pattern:** Dual-network Docker topology (public + private)  
**File:** `docker-compose.yml`

<img width="1206" height="1156" alt="Network Segmenation" src="assets/S1 Network Segementation.png" />

#### How it works

Two isolated Docker networks are defined. The `public-network` is the only network reachable from the host machine — it connects nginx (load balancer), the frontends, and MinIO. The `private-network` is completely internal and carries traffic between the API Gateway and all backend microservices (auth, product, order, review) and their databases. No database or internal service is ever exposed to the public network.

```mermaid
graph LR
    Browser -->|:80| nginx-lb
    nginx-lb --> api-gw-1
    nginx-lb --> api-gw-2
    nginx-lb --> api-gw-3

    subgraph public-network
        nginx-lb
        frontend-ssr
        frontend-csr
        minio
    end

    subgraph private-network
        api-gw-1
        api-gw-2
        api-gw-3
        auth-service
        product-service
        order-service
        review-service
        auth-db[(auth-db)]
        products-db[(products-db)]
        orders-db[(orders-db)]
        reviews-db[(reviews-db)]
        redis[(Redis)]
        rabbitmq[(RabbitMQ)]
    end

    api-gw-1 --> auth-service
    api-gw-1 --> product-service
    api-gw-1 --> order-service
    api-gw-1 --> review-service
```

#### Key configuration excerpt (`docker-compose.yml`)

```yaml
networks:
  public-network:
    driver: bridge
  private-network:
    driver: bridge
    internal: true   # no outbound internet access

services:
  nginx-lb:
    networks: [public-network, private-network]

  api-gateway-1:
    networks: [private-network]   # NOT on public-network

  products-db:
    networks: [private-network]   # database never exposed
```

#### Verification

```bash
# Attempt direct access to product-service (should timeout — not on public network)
curl http://localhost:4000/products
# Expected: Connection refused / timeout

# Access through the gateway (should work)
curl http://localhost:80/api/products
# Expected: JSON array of products
```

---

### S2 — Rate Limiting

**Tactic:** Limit access  
**Pattern:** Token-bucket rate limiting at API Gateway  
**Library:** `express-rate-limit`  
**File:** `api-gateway/index.js`

<img width="1206" height="1156" alt="Rate Limiting" src="assets/S2 Rate Limiting.png" />


#### How it works

Two rate limiters are applied at different granularities. A **general limiter** caps every client at 100 requests per minute across all endpoints. A **stricter login limiter** allows only 10 authentication attempts per 15-minute window on `/api/login` and `/api/login/verify`, protecting against brute-force credential attacks. The gateway also sets `trust proxy` so that the real client IP is read from the `X-Forwarded-For` header when behind nginx.

```mermaid
sequenceDiagram
    participant Client
    participant nginx
    participant Gateway
    participant Redis

    Client->>nginx: POST /api/login (attempt 11)
    nginx->>Gateway: forward request
    Gateway->>Gateway: loginLimiter.check()<br/>counter = 11 > 10
    Gateway-->>Client: 429 Too Many Requests<br/>Retry-After: 15 min
```

#### Key configuration excerpt (`api-gateway/index.js`)

```js
const rateLimit = require('express-rate-limit');

app.set('trust proxy', 1);

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 100,
  message: { error: 'Demasiadas solicitudes, intente más tarde' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  message: { error: 'Demasiados intentos de login' },
});

app.use(generalLimiter);
app.post('/api/login', loginLimiter, ...);
app.post('/api/login/verify', loginLimiter, ...);
```

#### Verification

```bash
# Trigger the general limiter (run 101 times quickly)
for i in $(seq 1 101); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:80/api/products; done
# Expected: first 100 return 200, 101st returns 429

# Trigger the login limiter (run 11 times)
for i in $(seq 1 11); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:80/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}';
done
# Expected: 11th attempt returns 429
```

---

### ⚡ Performance

### P1 — Cache-Aside (Redis)

**Tactic:** Manage resources  
**Pattern:** Cache-Aside (lazy population) for product catalog  
**Store:** Redis (key `products:all`, TTL 300 s)  
**File:** `api-gateway/index.js`

<img width="1206" height="1156" alt="Cache Aside" src="assets/P1 CacheAside.png" />

#### How it works

On every `GET /api/products` request, the gateway first queries Redis for the key `products:all`. On a **cache hit** the stored JSON is returned immediately with header `X-Cache: HIT`, skipping the product-service entirely. On a **cache miss**, the gateway fetches from the product-service, stores the result in Redis with a 5-minute TTL, and responds with `X-Cache: MISS`. Write operations (`POST`, `PUT`, `DELETE /api/products`) invalidate the cache key so stale data is never served.

```mermaid
flowchart TD
    A[GET /api/products] --> B{Redis\nproducts:all?}
    B -->|HIT| C[Return cached JSON\nX-Cache: HIT]
    B -->|MISS| D[Fetch from\nproduct-service]
    D --> E[Store in Redis\nTTL=300s]
    E --> F[Return JSON\nX-Cache: MISS]

    G[POST/PUT/DELETE\n/api/products] --> H[DEL products:all]
```

#### Key configuration excerpt (`api-gateway/index.js`)

```js
app.get('/api/products', async (req, res) => {
  const cached = await redis.get('products:all');
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(JSON.parse(cached));
  }
  const response = await axios.get(`${PRODUCT_SERVICE_URL}/products`);
  await redis.set('products:all', JSON.stringify(response.data), { EX: 300 });
  res.setHeader('X-Cache', 'MISS');
  res.json(response.data);
});

// Invalidation on writes
app.post('/api/products', verifyToken, async (req, res) => {
  await redis.del('products:all');
  ...
});
```

#### Verification

```bash
# First request — cache miss
curl -I http://localhost:80/api/products
# Expected header: X-Cache: MISS

# Second request — cache hit
curl -I http://localhost:80/api/products
# Expected header: X-Cache: HIT

# Inspect the key directly in Redis
docker exec -it arquisoft_tienda_de_regalos-redis-1 redis-cli GET products:all
```


---

### 🛡️ Reliability

### R1 — Circuit Breaker

**Tactic:** Prevent cascading failures  
**Pattern:** Circuit Breaker wrapping product-service calls  
**Library:** `opossum`  
**File:** `api-gateway/index.js`


<img width="1206" height="1156" alt="Circuit Breaker" src="assets/R1 Cicuit Breaker.png" />

#### How it works

Every call from the API Gateway to the product-service is wrapped in an `opossum` circuit breaker. If product-service calls begin failing (or exceed 5 s timeout), and the error rate crosses 50 % within a sampling window, the circuit **opens** — all subsequent calls are short-circuited immediately without reaching the product-service, returning the fallback (`[]`) instead. After 30 seconds the circuit enters **half-open** state to probe recovery. This prevents a slow or crashed product-service from blocking gateway threads and cascading failures to other endpoints.

```mermaid
stateDiagram-v2
    [*] --> Closed
    Closed --> Open: errors ≥ 50%\nor timeout > 5s
    Open --> HalfOpen: after 30s reset
    HalfOpen --> Closed: probe succeeds
    HalfOpen --> Open: probe fails

    Closed: CLOSED\nnormal pass-through
    Open: OPEN\nfallback [] returned
    HalfOpen: HALF-OPEN\none probe request
```

#### Key configuration excerpt (`api-gateway/index.js`)

```js
const CircuitBreaker = require('opossum');

async function fetchProducts() {
  const response = await axios.get(`${PRODUCT_SERVICE_URL}/products`);
  return response.data;
}

const breaker = new CircuitBreaker(fetchProducts, {
  timeout: 5000,          // fail if call > 5s
  errorThresholdPercentage: 50,  // open when 50%+ fail
  resetTimeout: 30000,    // retry after 30s
});
breaker.fallback(() => []);  // return empty array when open

app.get('/api/products', async (req, res) => {
  // cache-aside check first ...
  const data = await breaker.fire();
  res.json(data);
});
```

#### Verification

```bash
# 1. Stop the product-service container
docker stop arquisoft_tienda_de_regalos-product-service-1

# 2. Make several requests to trigger the open state
for i in $(seq 1 6); do curl -s http://localhost:80/api/products; echo; done
# Expected: first few return error, then [] (fallback) with near-instant response

# 3. Check circuit breaker events in gateway logs
docker logs arquisoft_tienda_de_regalos-api-gateway-1 --tail 20
# Expected: "Circuit breaker open" or similar opossum events

# 4. Restart product-service — circuit auto-recovers after 30s
docker start arquisoft_tienda_de_regalos-product-service-1
```

---

### R2 — Bulkhead (Connection Pool Cap)

**Tactic:** Limit resources  
**Pattern:** Bulkhead via bounded PostgreSQL connection pool  
**Library:** `pg.Pool`  
**Files:** `product-service/`, `order-service/`, `auth-service/`

<img width="1206" height="1156" alt="BulkHead" src="assets/R2 Bulkhead.png" />

#### How it works

Each microservice that connects to PostgreSQL uses a `pg.Pool` configured with a hard cap of **10 concurrent connections** and a **5-second connection timeout**. This acts as a bulkhead: even if one service (e.g., order-service) is under extreme load and exhausts its pool, it cannot consume more than 10 database connections — preventing resource starvation for other services. Requests that cannot acquire a connection within 5 seconds receive an immediate error rather than waiting indefinitely.

```mermaid
graph TD
    subgraph order-service [order-service — Pool max:10]
        OQ1[request 1] --> OC[(connection)]
        OQ2[request 2] --> OC2[(connection)]
        OQ11[request 11] -->|timeout 5s| ERR[503 Error]
    end

    subgraph product-service [product-service — Pool max:10]
        PQ1[request 1] --> PC[(connection)]
        PQ2[request 2] --> PC2[(connection)]
    end

    OC --> DB[(orders-db\nPostgreSQL)]
    OC2 --> DB
    PC --> DB2[(products-db\nPostgreSQL)]
    PC2 --> DB2
```

#### Key configuration excerpt (e.g. `product-service/index.js`)

```js
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'products-db',
  port:     parseInt(process.env.DB_PORT || '5432'),
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME     || 'productos',
  max: 10,                        // bulkhead cap
  connectionTimeoutMillis: 5000,  // fail-fast on exhaustion
});
```

#### Verification

```bash
# Simulate concurrent load against the products endpoint
# Install Apache Bench if needed: apt-get install apache2-utils
ab -n 200 -c 50 http://localhost:80/api/products

# Expected: requests beyond the pool cap return quickly with an error
# rather than hanging indefinitely — the pool protects the database

# Inspect pool metrics via psql
docker exec -it arquisoft_tienda_de_regalos-products-db-1 \
  psql -U postgres -d productos -c "SELECT count(*) FROM pg_stat_activity;"
# Expected: never exceeds 10 + 1 (the psql session itself)
```
### R3 — Active Redundancy (Hot Spare)

**Tactic:** Redundant Spare (Recover from Faults > Preparation and Repair)  
**Pattern:** Active Redundancy — fan-out coordinator in front of nginx-lb  
**File:** `coordinator/coordinator.js`, `docker-compose.yml`

#### Quality Scenario

| Element | Description |
|---------|-------------|
| **Source** | Hardware or runtime failure — the nginx-lb container crashes or becomes unreachable due to an unhandled process error or network partition. |
| **Stimulus** | The `nginx-lb` (active node) stops responding to HTTP requests. The coordinator receives a connection timeout or connection-refused error on all outgoing calls to `http://nginx-lb:80`. |
| **Artifact** | The `nginx-lb` service — the load balancer sitting in front of the three api-gateway instances, acting as the single traffic entry point for all client requests. |
| **Environment** | Normal operation during business hours. Users are actively browsing products, logging in, and placing orders. Both `nginx-lb` (active) and `nginx-lb-spare` (spare) are running and processing every request in parallel. |
| **Response** | The coordinator detects the failure of the active node on the first failed request. It immediately promotes `nginx-lb-spare` to primary and routes all subsequent requests to it. The response that triggered the failover is served using the spare's result. The coordinator sets the `X-Failover: true` response header and logs the promotion event. |
| **Response Measure** | Failover completes within a single request cycle (under 500 ms, bounded by the coordinator's 5 s timeout). Zero requests are lost because both nodes processed the triggering request in parallel. Clients receive HTTP 200 with no visible error. |

#### How it works

A lightweight **coordinator** service (Node.js, Express 5) sits in front of both nginx load balancers as the new external entry point on port 80. On every incoming request it fires two parallel `axios` calls — one to `nginx-lb:80` (primary) and one to `nginx-lb-spare:80` (secondary). Because both nodes always process every request, the spare maintains fully synchronized state at all times. If the primary fails, the coordinator swaps roles in memory and returns the spare's response to the client transparently. A dedicated `GET /coordinator/state` endpoint exposes the current primary/secondary mapping at any time.

The `X-Failover: true` response header (instead of a body field) is used to signal failover events because endpoints like `GET /api/products` return a raw JSON array — injecting extra fields into the body would break the API contract.

```mermaid
sequenceDiagram
    participant Client
    participant Coordinator
    participant nginx-lb (active)
    participant nginx-lb-spare

    Client->>Coordinator: GET /api/products
    par fan-out
        Coordinator->>nginx-lb (active): GET /api/products
        Coordinator->>nginx-lb-spare: GET /api/products
    end
    nginx-lb (active)-->>Coordinator: 200 OK [products]
    nginx-lb-spare-->>Coordinator: 200 OK [products]
    Coordinator-->>Client: 200 OK [products] (X-Served-By: primary)

    Note over nginx-lb (active): Container crashes

    Client->>Coordinator: GET /api/products
    par fan-out
        Coordinator->>nginx-lb (active): GET /api/products
        Coordinator->>nginx-lb-spare: GET /api/products
    end
    nginx-lb (active)--xCoordinator: timeout / connection refused
    nginx-lb-spare-->>Coordinator: 200 OK [products]
    Note over Coordinator: Promotes spare to primary
    Coordinator-->>Client: 200 OK [products] (X-Failover: true)
```

#### Architectural structure

```
Browser / Users
      │ HTTP/HTTPS
      ▼
  coordinator                 ← NEW — Hot Spare entry point (port 80)
  ┌───────────────────────────────────────────────┐
  │  fan-out in parallel to both nginx nodes      │
  └──────────────────┬────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
      nginx-lb             nginx-lb-spare
     (active)               (spare)
          │                     │
          └──────────┬──────────┘
                     │ round-robin
          ┌──────────┼──────────┐
          ▼          ▼          ▼
    api-gateway-1  api-gateway-2  api-gateway-3   ← Cluster (3 replicas)
          │
          ▼
    microservices (auth, product, order, review)
```

#### Key configuration excerpts

**`coordinator/coordinator.js` — fan-out and failover logic**

```js
let primary   = process.env.PRIMARY_URL   || "http://nginx-lb:80";
let secondary = process.env.SECONDARY_URL || "http://nginx-lb-spare:80";

app.all("/{*splat}", async (req, res) => {
  if (req.path === "/coordinator/state") {
    return res.json({ primary, secondary });
  }

  const [primaryResult, secondaryResult] = await Promise.all([
    tryRequest(primary,   req.method, req.path, req.body, forwardHeaders),
    tryRequest(secondary, req.method, req.path, req.body, forwardHeaders),
  ]);

  // Primary OK → respond normally
  if (primaryResult.ok) {
    res.set("X-Served-By", "primary");
    return res.status(primaryResult.status).json(primaryResult.data);
  }

  // Primary failed, spare responded → failover
  if (secondaryResult.ok) {
    [primary, secondary] = [secondary, primary];   // swap in memory
    res.set("X-Failover", "true");
    res.set("X-Now-Primary", primary);
    return res.status(secondaryResult.status).json(secondaryResult.data);
  }

  return res.status(502).json({ error: "Both nodes unreachable" });
});
```

**`docker-compose.yml` — coordinator and spare node**

```yaml
coordinator:
  build:
    context: ./coordinator
    dockerfile: Dockerfile.coordinator
  ports:
    - "80:8080"                          # external entry point
  environment:
    - PRIMARY_URL=http://nginx-lb:80
    - SECONDARY_URL=http://nginx-lb-spare:80
  depends_on: [nginx-lb, nginx-lb-spare]
  networks: [public-network]

nginx-lb:                                # active node — no external port
  image: nginx:alpine
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  networks: [public-network]

nginx-lb-spare:                          # spare node — identical config
  image: nginx:alpine
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  networks: [public-network]
```

#### Verification

```bash
# 1. Check initial coordinator state
curl http://localhost:80/coordinator/state
# Expected: {"primary":"http://nginx-lb:80","secondary":"http://nginx-lb-spare:80"}

# 2. Normal request — served by primary
curl -I http://localhost:80/api/products
# Expected: HTTP 200, X-Served-By: primary

# 3. Simulate failure — stop the active nginx-lb
docker stop arquisoft_tienda_de_regalos-nginx-lb-1

# 4. Next request is served by spare with zero interruption
curl -I http://localhost:80/api/products
# Expected: HTTP 200, X-Failover: true, X-Now-Primary: http://nginx-lb-spare:80

# 5. Coordinator has promoted the spare
curl http://localhost:80/coordinator/state
# Expected: {"primary":"http://nginx-lb-spare:80","secondary":"http://nginx-lb:80"}

# 6. Restart original node — system recovers
docker start arquisoft_tienda_de_regalos-nginx-lb-1

# Run the automated test suite
chmod +x test-failover.sh && ./test-failover.sh
```
---

### Summary Table

| ID | Attribute | Pattern | Where Implemented | Key Parameter |
|----|-----------|---------|-------------------|---------------|
| S1 | Security | Network Segmentation | `docker-compose.yml` | `internal: true` on private-network |
| S2 | Security | Rate Limiting | `api-gateway/index.js` | 100 req/min general · 10/15 min login |
| P1 | Performance | Cache-Aside | `api-gateway/index.js` | Redis TTL 300 s · key `products:all` |
| P2 | Performance | Event-Driven | `order-service/` + `notification-service/` | RabbitMQ AMQP · async publish/subscribe |
| R1 | Reliability | Circuit Breaker | `api-gateway/index.js` | timeout 5 s · threshold 50 % · reset 30 s |
| R2 | Reliability | Bulkhead | `*-service/index.js` (pg.Pool) | max 10 conns · timeout 5 s |
| R3 | Reliability | Active Redundancy | `coordinator/coordinator.js` | Parallel fan-out · < 500ms failover |
---

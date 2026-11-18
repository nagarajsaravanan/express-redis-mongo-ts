# Express + MongoDB + Redis — Product CRUD API

A TypeScript REST API built with **Express 5**, **MongoDB (Mongoose 9)**, and **Redis 6** implementing full Product CRUD operations with a **cache-aside caching strategy** and automatic cache invalidation.

---

## Key Features

- **Full Product CRUD**: Create, read (list & by ID), update (`PUT` / `PATCH`), and delete products.
- **Redis Cache-Aside Pattern**: Serves repeated `GET` requests directly from Redis (`5-minute` TTL) to reduce database load and latency.
- **Automatic Cache Invalidation & Warming**: Mutations (`POST`, `PUT`, `PATCH`, `DELETE`) automatically invalidate list caches and refresh or evict individual item caches.
- **Graceful Fallback**: Every cache operation checks `redisClient.isReady`, falling back cleanly to MongoDB if Redis is temporarily unavailable.
- **Strict Validation & Typing**: End-to-end TypeScript (`strict: true`) with Mongoose schema validation and Express 5 safe parameter handling.
- **Environment-Driven Configuration**: Centralized config via `dotenv` in `src/config/env.config.ts`.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Runtime & Language** | Node.js (>= 20), TypeScript |
| **Web Framework** | Express `^5.3.0` |
| **Primary Database** | MongoDB with Mongoose `^9.12.1` |
| **Caching Layer** | Redis (`redis` `^6.3.1`) |
| **Dev Tooling** | `tsx` (hot-reload), `tsc` |
| **Config** | `dotenv` |

---

## Project Structure

```text
express-redis/
├── src/
│   ├── config/
│   │   ├── db.config.ts            # MongoDB connection & lifecycle listeners
│   │   ├── env.config.ts           # Environment variable loader
│   │   └── redis.config.ts         # Redis client setup & lifecycle listeners
│   ├── controllers/
│   │   └── products/
│   │       ├── product.controller.ts  # CRUD handlers + Redis caching logic
│   │       └── router.ts              # Express router for /api/products
│   ├── models/
│   │   └── product.model.ts        # Mongoose schema & TypeScript interface
│   ├── app.ts                      # Express app setup & route mounting
│   └── index.ts                    # Entry point (connects Redis, MongoDB, starts server)
├── .env                            # Local environment variables
├── package.json
├── tsconfig.json
└── README.md
```

---

## Caching Architecture

This service uses the **Cache-Aside (Lazy Loading)** pattern with a `300s` (5-minute) TTL:

### Read Flow (`GET`)
1. Check Redis for the requested key (`products:all` or `product:<id>`).
2. **Cache HIT**: Return immediately with `"source": "redis-cache"`.
3. **Cache MISS**: Query MongoDB, store the serialized result in Redis with `EX: 300`, and return with `"source": "mongodb"`.

### Write Flow (`POST`, `PUT`, `PATCH`, `DELETE`)
- **Create (`POST`)**: Inserts into MongoDB, deletes `products:all`, and warms `product:<id>`.
- **Update (`PUT` / `PATCH`)**: Updates MongoDB (`returnDocument: "after"`, `runValidators: true`), deletes `products:all`, and refreshes `product:<id>`.
- **Delete (`DELETE`)**: Removes from MongoDB and deletes both `products:all` and `product:<id>`.

---

## Getting Started

### Prerequisites
- **Node.js** v20+
- **MongoDB** running locally or remotely
- **Redis** server running locally (default `127.0.0.1:6379`) or remotely

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/express_redis_db
REDIS_URL=redis://127.0.0.1:6379
```

> **Note:** If your MongoDB password contains special characters like `@`, URL-encode them (e.g., `password@123` → `password%40123`).

### 3. Run the Application

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start development server with hot-reload (`tsx watch`) |
| `npm run typecheck` | Run TypeScript type checking without emitting files |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled production build (`node dist/index.js`) |

---

## Product Schema

| Field | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `name` | `string` | Yes | — | Product title |
| `description` | `string` | Yes | — | Product description |
| `price` | `number` | Yes | — | Product price (`>= 0`) |
| `images` | `string[]` | No | `[]` | Array of image URLs |
| `category` | `string` | Yes | — | Product category |
| `brand` | `string` | Yes | — | Brand name |
| `sizes` | `string[]` | No | `[]` | Available sizes |
| `colors` | `string[]` | No | `[]` | Available colors |
| `stock` | `number` | Yes | `0` | Inventory count (`>= 0`) |
| `material` | `string` | Yes | — | Product material |
| `gender` | `string` | Yes | — | Target gender (e.g., `Men`, `Women`, `Unisex`) |
| `isActive` | `boolean` | No | `true` | Active/published status |
| `createdAt` | `Date` | Auto | — | Managed by Mongoose `timestamps` |
| `updatedAt` | `Date` | Auto | — | Managed by Mongoose `timestamps` |

---

## API Reference

Base URL: `http://localhost:5000/api/products`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/products` | Create a new product |
| `GET` | `/api/products` | Retrieve all products (cached) |
| `GET` | `/api/products/:id` | Retrieve a single product by ID (cached) |
| `PUT` | `/api/products/:id` | Update a product by ID |
| `PATCH` | `/api/products/:id` | Partially update a product by ID |
| `DELETE` | `/api/products/:id` | Delete a product by ID |

### Create Product (`POST /api/products`)

**Request Body:**
```json
{
  "name": "Classic Cotton T-Shirt",
  "description": "Breathable slim-fit crew neck tee.",
  "price": 799,
  "images": ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
  "category": "Apparel",
  "brand": "UrbanWear",
  "sizes": ["S", "M", "L", "XL"],
  "colors": ["Black", "White", "Navy"],
  "stock": 50,
  "material": "100% Cotton",
  "gender": "Unisex",
  "isActive": true
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "_id": "673b1a2f9c8d4e0012ab3456",
    "name": "Classic Cotton T-Shirt",
    "price": 799,
    "stock": 50,
    "isActive": true,
    "createdAt": "2026-11-18T06:20:00.000Z",
    "updatedAt": "2026-11-18T06:20:00.000Z"
  }
}
```

### Get All Products (`GET /api/products`)

**Response (`200 OK`):**
```json
{
  "success": true,
  "source": "redis-cache",
  "count": 1,
  "data": [
    {
      "_id": "673b1a2f9c8d4e0012ab3456",
      "name": "Classic Cotton T-Shirt",
      "price": 799
    }
  ]
}
```
> First request returns `"source": "mongodb"`; subsequent requests within 5 minutes return `"source": "redis-cache"`.

### Error Responses

- **`400 Bad Request`**: Invalid MongoDB `ObjectId` or schema validation failure:
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": ["Product name is required"]
  }
  ```
- **`404 Not Found`**: Product ID does not exist.
- **`500 Internal Server Error`**: Unexpected server error.

---

## Author & License

- **Author**: `ngrj`
- **License**: `ISC`


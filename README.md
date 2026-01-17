
```md
# 🧠 Infrastructure Weaver  
### Systemic Failure & Dependency Analysis in Public Infrastructure

Infrastructure Weaver is a full-stack system that models **urban public infrastructure as a dependency network** and helps analyze **root causes of failures** and **cascading impacts** using graph traversal techniques.

The project demonstrates how interconnected systems such as **power, water, telecom, and transport** influence one another, and how ignoring dependencies leads to repeated failures.

---

## 🚀 Key Features

- 📊 **Graph-based infrastructure modeling**
- 🔍 **Root cause analysis of failures**
- 🔁 **Cascading impact detection**
- ⚠️ **Critical infrastructure identification**
- 🖱️ **Interactive network visualization**
- 🏙️ **Real-world dataset (Chennai city infrastructure)**

---

## 🧩 Problem Statement

In modern cities, infrastructure systems are tightly interconnected:

- Power
- Water
- Telecom
- Transport

However, failures are often handled in isolation.  
This results in:
- Repeated breakdowns
- Inefficient repairs
- Ignored root causes

**Infrastructure Weaver solves this by modeling dependencies explicitly using graphs**, allowing planners and engineers to understand how failures propagate across systems.

---

## 🧠 Core Idea

> _“Analyze public infrastructure as a dependency network to identify root causes of failures and detect cascading impacts using graph traversal.”_

---

## 🏗️ System Architecture

### 🔹 Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Force Graph

### 🔹 Backend
- Node.js
- Express.js
- Neo4j Driver

### 🔹 Database
- Neo4j (Graph Database)

---

## 🗂️ Project Structure

```

infrastructure-weaver/
│
├── backend/                # Node.js + Neo4j backend
│   ├── server.js
│   ├── routes.js
│   ├── neo4j.js
│   ├── package.json
│   └── .env                # (not committed)
│
├── src/                    # React frontend
│   ├── components/
│   ├── pages/
│   ├── lib/
│   ├── data/
│   └── main.tsx
│
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── README.md

````

---

## ⚙️ Local Setup Instructions

### 1️⃣ Prerequisites

Make sure you have:
- Node.js ≥ 18
- npm
- Git
- Neo4j Desktop **or** Neo4j Aura

Verify:
```bash
node -v
npm -v
git --version
````

---

### 2️⃣ Clone the Repository

```bash
git clone https://github.com/ssrivarsha06/infrastructure-weaver.git
cd infrastructure-weaver
```

---

### 3️⃣ Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here
```

Start the backend:

```bash
node server.js
```

Backend runs at:

```
http://localhost:4000
```

---

### 4️⃣ Neo4j Database

* Start Neo4j using Neo4j Desktop or Aura
* Ensure `InfrastructureUnit` nodes and `DEPENDS_ON` relationships exist

Example relationship:

```
(A)-[:DEPENDS_ON]->(B)
```

---

### 5️⃣ Frontend Setup

```bash
cd ..
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

## 🧪 How to Use

1. Open the web app
2. Navigate to **Infrastructure Network**
3. Click on any node to view:

   * Location
   * Department
   * Status
   * Dependencies
4. Use **Failure Analysis** to explore cascading impacts
5. Use **Critical Infrastructure** to identify high-risk components

---

## ❌ What This Project Is NOT

* ❌ No machine learning
* ❌ No failure prediction
* ❌ No real-time sensors

✅ Focuses on **logical dependency analysis** and **graph traversal**

---


## 📌 Future Enhancements

* Failure path highlighting
* Time-based failure simulations
* Geographic mapping
* Automated dataset ingestion
* Cloud deployment

---

## 📄 License

This project is for academic and educational use.


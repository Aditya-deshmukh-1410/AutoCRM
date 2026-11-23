<div align="center">

<img src="img/logo.svg" alt="AutoCRM Logo" width="100" />

# AutoCRM

### *Your All-in-One Dealership CRM Platform*

> A full-stack multi-tenant CRM for automobile dealerships, combining lead tracking, inventory, test drives, sales records and a public showroom website, built for India's automotive retail and real-world use.

<br/>

![Java](https://img.shields.io/badge/Java-Backend-ED8B00?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1-6DB33F?logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Typed-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Status](https://img.shields.io/badge/Status-Active%20Development-orange)
![PRs](https://img.shields.io/badge/PRs-Welcome-brightgreen)

<br/>

![Stars](https://img.shields.io/github/stars/Aditya-deshmukh-1410/AutoCRM?style=for-the-badge&logo=github)
![Forks](https://img.shields.io/github/forks/Aditya-deshmukh-1410/AutoCRM?style=for-the-badge&logo=github)
![Last Commit](https://img.shields.io/github/last-commit/Aditya-deshmukh-1410/AutoCRM?style=for-the-badge&logo=github)
![Contributors](https://img.shields.io/github/contributors/Aditya-deshmukh-1410/AutoCRM?style=for-the-badge&logo=github)

</div>

---

<p align="center">
  <b>Customer</b> → <b>Lead</b> → <b>Vehicle</b> → <b>Test Drive</b> → <b>Sale</b> → <b>Finance/EMI</b>
</p>

---

## What does it do?

## What does it do?

| Module | What it does |
|---|---|
| **Customers & Leads** | Record enquiries, track source and interested vehicle, move leads through stages, assign owners, message on WhatsApp |
| **Activities & Follow-ups** | Schedule follow-ups, see overdue ones on the dashboard |
| **Inventory** | Manage vehicles, photos, inspections and availability, choose what shows on the public site |
| **Test Drives** | Schedule and track test drives for a lead and vehicle |
| **Sales & Finance** | Record sales with payment and sale status, plus finance/EMI details |
| **Users & Roles** | Admins create and manage `ADMIN` and `SALES` users |
| **Audit History** | Filterable log of who changed what and when |
| **Website Builder** | Branded public site with custom colours, fonts, logo and an EMI calculator |
| **Public Showroom** | Buyers browse published vehicles and send enquiries into the CRM |
| **Control Panel** | `PLATFORM_ADMIN` onboards new dealerships |

**Lead stages:** `New` → `Contacted` → `Qualified` → `Converted` / `Lost`

**Sale payment status:** `Pending` · `Partial` · `Paid`

## The real-life problem it solves

Small dealerships usually run on notebooks, spreadsheets, phone contacts and WhatsApp chats. That causes:

| Problem | How AutoCRM solves it |
|---|---|
| Customer, vehicle, test-drive and sale info is scattered | One connected workflow with linked records |
| Follow-ups depend on staff memory | Follow-ups and overdue alerts on the dashboard |
| No record of which vehicle a customer tested or bought | Test drives and sales tied to customer + vehicle |
| No traceability of who changed what | Audit History with actor, action, date and record |
| Anyone can edit anything | JWT login + role-based access (`PLATFORM_ADMIN`, `ADMIN`, `SALES`) |
| Many dealerships on one platform could leak data | Backend-enforced tenant isolation |
| Heavy, expensive CRMs don't fit small showrooms | Lightweight modular monolith, low running cost |
| Buyers can't see stock online | Public showroom + enquiry form feeding the CRM |

---

## Screenshots

### 1. Landing page
![Landing hero](img/01.png)
![Why AutoCRM](img/02.png)
![Modules](img/03.png)
![Records in view](img/04.png)

### 2. Sign up
![Sign up](img/05.png)

### 3. Login
![Login](img/06.png)

### 4. Dashboard
![Dashboard](img/07.png)

### 5. Leads
![Leads](img/08.png)

### 6. Inventory
![Inventory](img/09.png)

### 7. Sales
![Sales](img/10.png)

### 8. Users & Roles
![Users and roles](img/12.png)

### 9. Audit History
![Audit history](img/11.png)

### 10. Website Builder
![Website builder](img/13.png)

### 11. Public Dealership Website
![Public site](img/14.png)

---

## Tech Stack

**Backend**
- Java, Spring Boot 4.1
- Spring Security with JWT authentication
- Role-based access control (`PLATFORM_ADMIN`, `ADMIN`, `SALES`)
- Spring Data JPA / Hibernate
- Jakarta Bean Validation (custom validators)
- Maven

**Frontend**
- React + TypeScript
- Vite

**Database**
- PostgreSQL (shared database, tenant-scoped rows)

**Architecture**
- Modular monolith, REST (JSON) APIs
- Pooled multi-tenancy: tenant resolved from the authenticated user, never from the request body

---

## Project Structure

```
AutoCRM/
├── src/
│   ├── main/
│   │   ├── java/com/autocrm/
│   │   │   ├── AutoCrmApplication.java
│   │   │   ├── validation/          # Custom validators (test drive status, payment status, fuel type)
│   │   │   └── ...                  # controllers, services, repositories, entities, security
│   │   └── resources/               # application config
│   └── test/                        # Backend tests
├── Frontend/
│   ├── src/
│   │   ├── assets/
│   │   └── components/              # AppLayout, AuthLayout, PageHeader, RequireAuth, ui/ ...
│   └── dist/                        # Production build
├── docs/
│   └── screenshots/                 # README images
├── pom.xml
├── mvnw / mvnw.cmd
└── .env                             # Local config (not committed)
```

> Request flow: Spring Security filter (JWT + tenant + role) → Controller (DTO validation) → Service (business rules) → Repository (tenant-scoped) → PostgreSQL.

### Project in IDE
![Project structure and backend running](img/15.png)

---

## Getting Started

**Prerequisites:** JDK, Node.js, PostgreSQL

```bash
# 1. Clone
git clone https://github.com/Aditya-deshmukh-1410/AutoCRM.git
cd AutoCRM

# 2. Configure environment
# create a .env with your database URL, username, password and JWT secret

# 3. Build the frontend
cd Frontend
npm install
npm run build
cd ..

# 4. Run the backend
./mvnw clean package
java -jar target/autoCRM-0.0.1-SNAPSHOT.jar
```

App runs at **http://localhost:8080**

## Roles

| Role | Responsibility |
|---|---|
| `PLATFORM_ADMIN` | Onboards and manages dealerships (tenants) via the Control Panel |
| `ADMIN` | Manages one dealership: users, inventory, settings, showroom publishing |
| `SALES` | Day-to-day work on customers, leads, activities, test drives and sales |

## Contributing

Contributions are welcome. Fork the repo, create a feature branch, and open a pull request.

## License

Add a license of your choice (e.g. MIT).

# AutoCRM

AutoCRM is the combined dealership CRM and website project. The Spring Boot backend is at the project root; the React frontend is in `Frontend/`.

## Requirements and configuration

- Java 17 or newer (use the project Maven wrapper), Node.js/npm, and PostgreSQL.
- Create a PostgreSQL database named `autocrm` and make sure the local PostgreSQL service is running.
- Set these variables in the Eclipse Run Configuration's **Environment** tab before starting Spring Boot:
  - `DB_USERNAME` and `DB_PASSWORD`: PostgreSQL credentials with access to `autocrm`.
  - `JWT_SECRET`: a private key of at least 32 UTF-8 bytes.
  - `MAIL_USERNAME` and `MAIL_PASSWORD`: SMTP credentials used by email OTP/password recovery.
  - `VEHICLE_IMAGE_STORAGE_DIRECTORY` (optional): persistent directory for inventory image files. If omitted, images go to `${user.home}/.autocrm/vehicle-images`.

Spring Boot does not load a root `.env` file automatically. Do not commit real secrets. The schema uses Hibernate `ddl-auto=update`; the added vehicle listing columns are nullable, so existing vehicle records do not need a manual data rewrite.

Back up the PostgreSQL database **and** the vehicle image directory together. PostgreSQL stores image metadata, while the image bytes live in that directory.

## Run during development

1. In Eclipse, import this project as an existing Maven project, set the environment variables above in **Run Configurations → Java Application → Environment**, then run `src/main/java/com/autocrm/AutoCrmApplication.java` as a Spring Boot app. The backend listens on port 8080.
2. Open a terminal in this project's `Frontend/` folder. Run `npm ci` once, then run `npm run dev`.
3. Open the local Vite address, usually `http://localhost:5173`. Vite forwards `/api` and `/public` requests to the backend on port 8080.

## Run as one packaged app

1. In `Frontend/`, run `npm ci` once and `npm run build` whenever the frontend changes.
2. From the project root, run `mvnw.cmd package` on Windows (or `./mvnw package` on macOS/Linux). Maven copies `Frontend/dist/` into the application so the same app serves the UI and API.

Use the dealership admin account to open **Website Builder**, save the site, and publish it. A published dealership website is available at `/site/{slug}`. Website contact messages, vehicle enquiries, seller submissions, and test-drive requests are assigned to that dealership; admins can manage seller requests and website activity in **Sell Requests** and **Notifications**.

The ZIP's separate Supabase setup and credentials are not used. Website data is stored through this project's existing PostgreSQL and tenant-scoped services. Dealership admins manage Website Builder; SALES employees can see notifications and work assigned seller requests. All records remain scoped to the authenticated dealership.

# Agent Visit Survey (AVS) Application

A production-ready MERN stack application for managing field agent visit surveys for Kanan International.

## Tech Stack
- **Frontend**: React 18 (Vite), Tailwind CSS, React Hook Form, Zod, Lucide React, Recharts.
- **Backend**: Node.js 20, Express, MongoDB (Mongoose), JWT (httpOnly cookies).
- **Security**: Helmet, Rate Limiting, NoSQL Sanitisation.

## Project Structure
- `/client`: React frontend.
- `/server`: Express backend.

## Setup Instructions

### 1. Backend Setup
1. Navigate to `server/`: `cd server`
2. Install dependencies: `npm install`
3. Configure `.env`: Copy `.env.example` to `.env` and fill in credentials.
4. Seed the database (Optional): `node seed.js`
5. Start server: `npm start` (or `npm run dev` with nodemon)

### 2. Frontend Setup
1. Navigate to `client/`: `cd client`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`

## Default Users (if seeded)
| Internal Title | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | superadmin@kanan.co | Admin@123 |
| **Admin (B2C)** | adminb2c@kanan.co | Admin@123 |
| **Admin (B2B)** | adminb2b@kanan.co | Admin@123 |
| **User (B2C)** | b2c@kanan.co | Admin@123 |
| **User (B2B)** | b2b@kanan.co | Admin@123 |

## Features Implemented
- **Role-based Access Control**: User, Admin, and SuperAdmin tiers.
- **Audit Logging**: Every mutating action is tracked with timestamp and IP.
- **Multi-step Survey**: 9-group form with 24-hour edit lock and auto-save.
- **Reporting**: Exporting of visit data to Excel and PDF.
- **Analytics**: Key performance indicators and visit trends on the dashboard.
- **User Management**: Creation and management of staff accounts by SuperAdmin.

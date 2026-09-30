---
title: 'YourPlan: Course Planning and Registration'
subtitle: 'A full-stack website inspired by UW’s MyPlan'
authors: ['Zhiyuan Jia', 'Yuekai Xu']
date: 2023-11-01
keywords: ['Web Development', 'Course Planning', 'JavaScript', 'Express', 'SQLite']
---

YourPlan is a course-planning and registration website we built for CSE 154, inspired by the University of Washington’s MyPlan. It brings course discovery, section selection, registration, and degree progress into one student-facing application.

## What we built

- **Course search and details.** Browse courses and filter by keyword, academic category, or credits. Each course page shows its description, prerequisites, instructors, lecture and quiz schedules, and enrollment capacity.
- **Planning and registration.** Sign in, add lecture–quiz pairs to a cart, remove selections, and submit the cart for registration. The backend checks schedule conflicts, prerequisites, duplicate or previously taken courses, available seats, and an 18-credit limit, then returns a confirmation code for successful registration.
- **Academic history and degree audits.** Review past courses, grades, and credits by quarter. Select a major or minor to see completed, in-progress, failed, and still-needed courses, along with credit totals.

## How we built it

The frontend uses **HTML, CSS, and vanilla JavaScript**. Event handlers and DOM updates drive the search results, course details, cart, and audit tables. Asynchronous requests through the Fetch API connect these pages to the backend, with browser local storage retaining selections and navigation context between pages.

The backend uses **Node.js and Express** to expose JSON endpoints for course search, sign-in, cart updates, registration, history, and degree audits. **SQLite** stores students, courses, sections, prerequisites, degree requirements, and enrollment records. SQL joins connect those records, while server-side validation implements the registration rules and compares academic history with degree requirements.

The project gave us practice connecting an interactive interface to a relational database and translating familiar academic rules into application logic—from checking overlapping class times to identifying the courses a student still needs.

[View the project on GitHub](https://github.com/zhiyuanfx/YourPlan) · [Explore the API documentation](https://github.com/zhiyuanfx/YourPlan/blob/main/backend/APIDOC.md)

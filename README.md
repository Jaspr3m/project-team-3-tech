# TravelLink Matching App

TravelLink is a web application for spontaneous meetups and real connections. Users can create, join, and manage meets, find matches, and connect with friends. The app features a robust friend system, responsive design, and a smooth registration/profile setup flow.

---

## 📁 Project Structure

```
├── server.js                # Main Express server
├── models/                  # Mongoose/MongoDB models (e.g., profile.js)
├── routes/                  # Express route handlers (user.js, homepage.js)
├── static/                  # Static assets (CSS, images, JS)
│   ├── css/                 # Component/page-specific CSS
│   ├── images/              # App images and icons
│   └── script/              # Client-side JS (login, register, etc.)
├── uploads/                 # Uploaded images (meet/profile)
├── view/                    # EJS templates (pages & partials)
│   ├── partials/            # Reusable EJS partials (header, footer, etc.)
│   └── ...                  # Main pages (home, profile, meets, etc.)
├── package.json             # NPM dependencies and scripts
├── postcss.config.js        # CSS minification config
└── README.md                # Project documentation (this file)
```

---

## 🤝 Matching & Friend System

- **Matching:**
  - Users are matched based on profile data and meet participation.
  - Matches are shown in the `user-match-list` partial, with an "Add Friend" button.
- **Friend Requests:**
  - Sending a friend request creates a notification for the recipient.
  - Recipients can accept or decline requests from the notifications page.
  - Accepted requests add users to each other's friends list.
- **Notifications:**
  - Friend requests and other actions generate notifications, visible in the UI.

---

## 🛣️ Main API Routes

- **User & Auth:**
  - `POST /register` — Register a new account
  - `GET/POST /setup-profile` — Complete profile after registration
  - `GET /profile/:id` — View user profile
  - `POST /profile/:id/edit` — Edit profile
- **Meets:**
  - `GET /create-meet` — Show create meet form
  - `POST /create-meet` — Create a new meet
  - `GET /meets` — List joined/created meets
  - `POST /meets/:id/edit` — Edit a meet
  - `POST /meets/:id/join` — Join a meet
  - `POST /meets/:id/leave` — Leave a meet
- **Friends & Notifications:**
  - `POST /users/add-friend` — Send friend request
  - `POST /respond-friend-request` — Accept/decline friend request
  - `GET /notifications` — View notifications

---

## 🖥️ Installation & Running Locally

1. **Clone the repository:**
   ```sh
   git clone <repo-url>
   cd <project-folder>
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Set up environment variables:**
   - Create a `.env` file with your MongoDB URI and session secret:
     ```env
     MONGODB_URI=your_mongodb_uri
     SESSION_SECRET=your_secret
     ```
4. **Run the app:**
   ```sh
   npm run dev
   ```
   The app will be available at `http://localhost:3000` (default).

---

## 🎨 Styling & Responsiveness

- Uses custom CSS and Bootstrap for layout and components.
- Meet cards display in a responsive 4-column grid (breakpoints for 3, 2, 1 column).
- Mobile-first design for all main pages and modals.

---

## 📚 Further Documentation

- See the [Wiki](./wiki) for:
  - Detailed matching logic
  - Data models
  - API details
  - UI/UX guidelines

---

**Author:** Ivy Vo  
**License:** ISC

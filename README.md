# LMS Mobile

A Learning Management System (LMS) mobile app built with **React Native, Expo (SDK 58), Expo Router and TypeScript**.
Students and instructors can store presentations and exercises, organise them into courses, track progress, take
quizzes, and – with an account – join instructor-led classes with announcements, shared materials, quizzes and
discussion.

> Project folder used during development: `D:\Project2\lms-mobile` (Windows, VS Code).
> The app is built for **Android / Expo Go**. It is not designed to run in a web browser.

---

## 1. What the app does

### Works on the device, no account needed
| Area | Features |
|---|---|
| **Home** | Dashboard with real counts of courses, presentations and exercises, storage used, learning progress, recent quiz results and recently added files. |
| **Slides (Presentations)** | Upload `.ppt`, `.pptx`, `.pdf`; search; sort (newest, oldest, name, size); file details; open, share, delete (with confirmation). |
| **Exercises** | Upload `.pdf`, `.doc`, `.docx`, `.txt`, `.rtf`, `.odt`, `.xls`, `.xlsx`, `.csv`; same search, sort, details, open, share and delete. |
| **Courses** | Create courses, add materials from your library, tick materials off as done, see completion %, approximate time in course, and build/take personal multiple-choice quizzes with automatic grading and score history. |
| **Settings** | App version, storage statistics, account section, about. |

Files are copied into the app's private storage and their metadata is saved, so everything survives closing and
reopening the app. Invalid file types are rejected, duplicate file names are made unique (`notes (1).pdf`).

### Needs an account (Supabase backend)
| Area | Features |
|---|---|
| **Accounts & roles** | Sign up / sign in with email and password as **Learner** or **Instructor**; an **Administrator** role exists. New instructors must be approved by an admin before they can create classes. |
| **Classes** | Instructors create classes with a 6-character join code; learners join with the code. |
| **Announcements** | Instructors post updates; members read them. |
| **Discussion** | Everyone in a class can post; authors (and the instructor) can delete. |
| **Materials** | Instructors upload files from their library to private cloud storage; learners download/open them and tick them off. |
| **Quizzes** | Instructors publish and later edit multiple-choice quizzes. Grading is done on the server, so answer keys never reach learners before submitting. |
| **Progress & analytics** | Instructors see each learner's materials completed, quizzes taken and average score. |
| **Admin panel** | Approve or decline instructor requests and see every account. |
| **Unread badges** | The Classes tab and each class card show how many new items appeared since you last opened the class (live while the app is open). |
| **Live updates** | New announcements, messages, materials and quizzes appear without refreshing. |
| **Account deletion** | Settings → Delete account removes your login and cloud data (and an instructor's class files). |

---

## 2. Tech stack

- Expo SDK **58**, React Native 0.88, React 19, Expo Router (typed routes), TypeScript (strict)
- `expo-document-picker`, `expo-file-system` (legacy API for storage, new API only for the optional in-app preview), `expo-sharing`
- `@react-native-async-storage/async-storage` – metadata (file records, courses, quizzes, progress) and the login session
- `@supabase/supabase-js` – authentication, Postgres database, file storage and realtime
- `@expo/vector-icons` – icons

---

## 3. Project structure

```
src/
  app/                      Screens (Expo Router)
    _layout.tsx             Providers + stack navigation
    (tabs)/                 Home, Courses, Classes, Slides, Exercises, Settings
    file-details/[id].tsx   File details
    course/[id].tsx         Course detail      course-form.tsx   Create/edit course
    quiz/[id].tsx           Take personal quiz quiz-form.tsx     Build personal quiz
    auth.tsx                Sign in / create account
    class/[id].tsx          Class (Updates, Materials, Quizzes, Discussion, People)
    class-form.tsx          Create class       class-quiz-form.tsx  Create/edit class quiz
    class-quiz/[id].tsx     Take class quiz    admin.tsx            Administrator panel
  components/               ActionButton, ClassCard, CourseCard, EmptyState, FileCard, FileLibraryScreen,
                            Header, MaterialPickerModal, MaterialsTab, PeopleTab, ProgressBar, QuizBuilder,
                            QuizRunner, QuizzesTab, SearchBar, SegmentedControl, TextField
  constants/                colors.ts (design tokens), fileTypes.ts
  hooks/                    useFiles, useLms, useAuth, useUnread (React context providers)
  lib/supabase.ts           Supabase client
  services/                 fileService, storageService, lmsStorage, cloudService, classworkService,
                            notificationService
  types/                    file.ts, lms.ts, cloud.ts, classwork.ts
  utils/                    format, id, progress, time, webAlert
supabase/
  schema.sql                Accounts, classes, announcements, discussion        (run 1st)
  schema_part3.sql          Materials + storage bucket, quizzes, progress       (run 2nd)
  schema_part4.sql          Administrator role, instructor approval, realtime   (run 3rd)
  schema_part5.sql          Delete own account                                  (run 4th)
  schema_part6.sql          Unread tracking, quiz editing                       (run 5th)
.env.example                Template for your Supabase keys
```

### How data is stored
- **On the device:** file contents live in the app's document directory (`library/<category>/`); file records,
  courses, quizzes, attempts and progress are JSON in AsyncStorage. Nothing here is uploaded.
- **In the cloud (Supabase):** profiles, classes, enrollments, announcements, posts, class materials, quizzes,
  quiz attempts, material progress and unread markers. Class files are in the private bucket `class-materials`.
- Security is enforced by **Postgres row level security** and server functions, not by the app. Learners cannot
  read answer keys; only instructors can post announcements or upload materials; people only see classes they belong to.

---

## 4. Setting it up

### 4.1 Easiest: use the complete project zip
`lms-mobile-complete.zip` contains the final `src/` folder, the `supabase/` scripts and `.env.example`.

1. Create the project (once) and install packages:
   ```powershell
   cd D:\Project2
   npx create-expo-app@latest lms-mobile
   cd lms-mobile
   npm run reset-project          # choose to delete the example files
   npx expo install expo-document-picker expo-file-system expo-sharing @react-native-async-storage/async-storage @expo/vector-icons @supabase/supabase-js
   ```
2. Delete the generated `src` folder and `example` folder, then extract the zip into the project root:
   ```powershell
   Remove-Item -Recurse -Force .\src, .\example
   Expand-Archive -Path "PATH\TO\lms-mobile-complete.zip" -DestinationPath . -Force
   ```
3. In `app.json`, make sure the `expo` object contains `"experiments": { "typedRoutes": true }`.
   Optional: set `"web": { "output": "single" }` so the dev server never renders web pages.

> If `C:` is short on space, point npm at another drive first:
> `npm config set cache "D:\npm-cache"` and, per terminal session, `$env:TEMP="D:\npm-temp"; $env:TMP="D:\npm-temp"`.
> Never run `npm audit fix --force` – it would downgrade Expo.

### 4.2 Supabase (needed only for accounts and classes)
1. Create a free project at <https://supabase.com>.
2. In **SQL Editor → New query**, paste and run each file in `supabase/` **in order**:
   `schema.sql`, `schema_part3.sql`, `schema_part4.sql`, `schema_part5.sql`, `schema_part6.sql`.
3. Authentication → Sign In / Providers → Email: turn **off "Confirm email"** while testing.
4. Copy `.env.example` to `.env` and fill in your **Project URL** and **publishable key**
   (Project Settings → API Keys; never use the secret key):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxx
   ```
   No quotes, no spaces, no trailing slash. Add `.env` to `.gitignore`.
5. Restart Expo with a cache clear – environment variables are only read at start-up.

### 4.3 First administrator
1. Sign up in the app (as Learner).
2. Run in the SQL Editor with your own email, then sign out and in again:
   ```sql
   update public.profiles
   set role = 'admin', instructor_status = 'none'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

### 4.4 Approving instructors
- **In the app (admin):** Settings → Admin panel (or the button on the Classes tab) → **Pending** → **Approve** / **Decline**.
  The instructor pulls down to refresh on the Classes tab to see **New class**.
- **Shortcut in SQL:**
  ```sql
  update public.profiles set instructor_status = 'approved'
  where id = (select id from auth.users where email = 'instructor@example.com');
  ```

---

## 5. Running and checking the app

```powershell
npx expo start -c      # then press "a" (Android emulator) or scan the QR code with Expo Go
npx tsc --noEmit       # type check (run after the first start so route types exist)
```
Use **Expo Go on a phone** (same Wi-Fi as the PC) or an Android emulator. Do not press `w`.
If a phone shows old behaviour, stop Expo, run `npx expo start -c`, fully close Expo Go and rescan the QR code.

### Manual test checklist
1. **Files:** upload a `.pptx`/`.pdf` under Slides and a `.docx` under Exercises; check name, size and date; search and sort; close and reopen the app; delete one with confirmation; try a `.zip` (must be rejected); upload the same file twice (second becomes `name (1).ext`).
2. **Courses:** create a course, add two files, tick one (50%); build and take a quiz; delete the course.
3. **Accounts:** sign up an instructor (shows "Waiting for approval"), approve it as admin, create a class, post an announcement.
4. **Learner:** sign up a learner on another device or after signing out, join with the code, read the announcement, post in Discussion, open a material, take a quiz.
5. **Instructor views:** check Materials ("x of N learners done"), Quizzes (attempts) and People (progress).
6. **Badges:** post as instructor and watch the learner's Classes tab badge; opening the class clears it.
7. **Account:** sign out; delete a throw-away account.

---

## 6. Roles and permissions

| Action | Learner | Instructor (approved) | Administrator |
|---|:-:|:-:|:-:|
| Use files, courses, personal quizzes (local) | ✔ | ✔ | ✔ |
| Join a class with a code | ✔ | – | – |
| Create classes, post announcements, upload materials, publish/edit quizzes | – | ✔ | – |
| Post in discussion, take class quizzes, tick materials | ✔ | ✔ (discussion) | – |
| See learner progress and quiz results | own only | their classes | – |
| Approve/decline instructors, list all accounts | – | – | ✔ |
| Delete own account | ✔ | ✔ | ✔ (not if the only admin) |

---

## 7. Development history (build order)

The app was built in stages; each stage was delivered as a zip that overwrites files in the project.
`lms-mobile-complete.zip` already contains all of them.

| # | Delivered zip | What it added |
|---|---|---|
| 1 | `lms-mobile-src.zip` | Core app: dashboard, Slides, Exercises, file details, settings, local file storage, search, sort, share, delete. |
| 2 | `lms-mobile-courses-update.zip` | Courses, progress tracking, personal quizzes with auto-grading, dashboard analytics. |
| 3 | `lms-mobile-cloud-update.zip` | Supabase accounts, roles, classes, announcements, discussion. |
| 4 | `lms-mobile-classwork-update.zip` | Class materials (cloud storage), server-graded class quizzes, learner progress for instructors. |
| 5 | `lms-mobile-admin-update.zip` | Administrator role, instructor approval, live updates. |
| 6 | `lms-mobile-account-update.zip` | Delete account, class file clean-up, browser-safe dialogs. |
| 7 | `lms-mobile-final-update.zip` | Unread badges, editing published quizzes, visual refresh (colours, shadows, headers, tab bar). |
| – | Fix zips | `copyfix`, `webfix`, `authfix`, `signoutfix`, `typefix`, `webguard`, `filefix`, `filefix2` (see section 8). |

---

## 8. Problems met along the way and their fixes

| Symptom | Cause | Fix |
|---|---|---|
| `ENOSPC: no space left on device` during install | `C:` drive full | Moved the npm cache and temp folder to `D:`. |
| 31 `tsc` errors in `example/` | Starter files moved by `reset-project` | Delete the `example` folder. |
| `npx tsc` tried to install a package called `tsc` | TypeScript was not installed in the folder yet | Use `npx tsc --noEmit` only inside the project. |
| `expo/tsconfig.base` not found / yellow file names in VS Code | Editor cache; yellow = Git "modified" colour | Restart the TS server; ignore the colour. |
| Route and icon type errors | Route types not generated yet; icon `color` can be `null` | Start Metro once; icon colour now chosen from `focused`. |
| `File.copy` appeared to work but failed randomly | In SDK 58 `copy` is asynchronous and was not awaited | Added `await` (later replaced by the legacy copy). |
| `ReferenceError: window is not defined` | Supabase read AsyncStorage while Expo rendered the web version in Node | Supabase client uses an empty storage on the server. |
| Sign-in/sign-out looked like it did nothing | `Alert` is invisible in browsers; `router.back()` with no history | Inline messages on the auth screen; browser dialog shim; safe navigation. |
| `UnknownHostException your-project-id.supabase.co` | `.env` still had the template values / phone had an old bundle | Fill in real keys, restart with `-c`, reload Expo Go. |
| `this.validatePath is not a function` | New file-system classes do not exist in a web browser | Test on the phone; browser now shows a clear message. |
| "Location 'file://data/…' isn't readable" | Picker returned a malformed `file://data/...` address | Pick without the cache copy, repair the address, fall back to a `fetch` copy; storage uses the legacy file API. |
| `ListEmptyComponent` and `Alert.alert` type errors | List accepts `undefined`, not `null`; Alert button types | Fixed in `typefix`. |

---

## 9. Troubleshooting

- **Classes tab says "Cloud features are not set up"** – `.env` missing or misnamed; the two variable names must be exactly `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Restart with `npx expo start -c`.
- **"Database error saving new user" / "Profile not found"** – `schema.sql` was not run (or failed). Run the scripts in order, delete test users under Authentication → Users, and sign up again.
- **"Email not confirmed"** – turn off Confirm email (or click the emailed link).
- **Instructor sees "Waiting for approval"** – approve them (section 4.4).
- **Admin panel missing** – the role update did not apply; check the email and sign out and in again.
- **Upload says the file could not be read** – update to the latest `fileService.ts`; the message now ends with the system reason in brackets.
- **Changes do not show on the phone** – stop Expo, `npx expo start -c`, fully close and reopen Expo Go.
- **Red screen on start** – read the first lines; they name the file. Run `npx tsc --noEmit` and fix reported errors first.

---

## 10. Known limitations and ideas for later

- **No push notifications.** They need a development build and Firebase credentials (Expo Go on Android no longer supports remote push). Unread badges and live updates cover the in-app case.
- The Admin panel shows names, not email addresses, and admins cannot suspend or delete other accounts.
- Class quizzes are multiple-choice only; learners can retake them any number of times.
- Anyone can choose "Instructor" at sign-up; admin approval is the safeguard.
- Local courses and cloud classes are separate: a personal course cannot be shared as a class.
- Upload size is limited to 20 MB per class file (bucket limit); large files are read into memory.
- No dark mode, no offline sync for cloud data, no web support.
- A full test on real devices is still the final check; the code was type-checked but the SQL scripts and
  on-device behaviour were verified only through your testing.

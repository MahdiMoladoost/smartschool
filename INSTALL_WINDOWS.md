# SmartSchool Windows Local Setup

## 1) Clean npm state if install was interrupted
Close VS Code terminals and stop any running `node`/`npm` processes, then run PowerShell as normal user in the project folder:

```powershell
npm config set registry https://registry.npmjs.org/
npm cache verify
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
```

If you want to keep the included lockfile, do not remove `package-lock.json`; just run `npm install` after setting the registry.

## 2) Create `.env`

```powershell
Copy-Item .env.example .env
notepad .env
```

Set at least:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=smart_school
JWT_SECRET=replace_with_a_long_random_local_secret_min_32_chars
```

## 3) Create and seed database

Make sure MySQL is running, then:

```powershell
npm run db:init
npm run db:seed
npm start
```

Open:

```text
http://localhost:3000/login
```

## 4) Common Windows fixes

### EPERM removing nodemon
Usually another process is using `node_modules`. Close terminals/VS Code, stop Node processes, then delete `node_modules` again.

### Access denied for root@localhost using password: NO
The `.env` file is missing or `DB_PASSWORD` is empty. Create `.env` from `.env.example` and set the password.

### ETIMEDOUT to internal OpenAI registry
Your old lockfile or npm config points to an internal registry. Run:

```powershell
npm config set registry https://registry.npmjs.org/
npm config get registry
```

It should print:

```text
https://registry.npmjs.org/
```

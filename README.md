{
"name": "base-launchpad-frontend",
"version": "1.0.0",
"private": true,
"description": "Frontend for Base Launchpad project",
"scripts": {
"start": "react-scripts start",
"build": "react-scripts build",
"test": "react-scripts test",
"eject": "react-scripts eject"
},
"dependencies": {
"react": "^18.3.0",
"react-dom": "^18.3.0",
"react-router-dom": "^6.17.0", // For routing pages like Home, TokenDetail, Profile
"web3": "^1.10.0", // For wallet & blockchain interactions
"ethers": "^6.9.0", // Another option for smart contract interactions
"axios": "^1.5.0", // For API requests
"socket.io-client": "^4.9.0", // Real-time updates
"tailwindcss": "^4.3.0", // UI framework
"classnames": "^2.4.2", // Conditional styling helper
"react-icons": "^4.11.0" // For icons in UI
},
"devDependencies": {
"postcss": "^8.4.30",
"autoprefixer": "^10.4.20"
},
"browserslist": {
"production": [
">0.2%",
"not dead",
"not op_mini all"
],
"development": [
"last 1 chrome version",
"last 1 firefox version",
"last 1 safari version"
]
}
}

# Launchpad Backend (FastAPI + MongoDB)

This is a starter backend for a Web3 Launchpad. It includes:

- Token metadata (socials, logo, category, description, creator wallet)
- Comments on tokens
- User profiles created on first wallet connect
- Tracking of tokens created / bought by users
- Placeholder services for holder and transaction indexing (web3.py)

Run:

1. Install dependencies:
   pip install -r requirements.txt

2. Start MongoDB (or set MONGO_URI in .env)

3. Run:
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Notes:

- This is a scaffold. Fill in web3 provider URL and file storage (S3) as needed.

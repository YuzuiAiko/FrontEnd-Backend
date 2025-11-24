// config.js
import dotenv from "dotenv"; // Import the dotenv module to load environment variables
import path from "path"; // Import the path module for working with file paths
import { fileURLToPath } from "url"; // Import fileURLToPath to convert the module URL to a file path

// Get the current directory using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the .env file into process.env
dotenv.config({ path: path.resolve(__dirname, '.env') }); // Load environment variables from the .env file into process.env

// Try loading .env from repo root, then backend, then frontend
const envPaths = [
	path.resolve(__dirname, '../.env'),
	path.resolve(__dirname, '.env'),
	path.resolve(__dirname, '../frontend/.env'),
];
let loadedEnv = false;
for (const envPath of envPaths) {
	const result = dotenv.config({ path: envPath });
	if (result.parsed) {
		loadedEnv = envPath;
		break;
	}
}
console.log("Loaded GMAIL_REDIRECT_URI:", process.env.GMAIL_REDIRECT_URI, "from", loadedEnv || "no .env found");

// Support multiple Gmail OAuth clients via comma-separated env vars.
// Two environment variables can be used:
// - GMAIL_CLIENT_IDS: comma-separated list of client IDs
// - GMAIL_CLIENT_SECRETS: comma-separated list of client secrets (in same order)
// Select which pair to use with GMAIL_CLIENT_INDEX (0-based index). If not set, defaults to 0.

function splitList(raw) {
	if (!raw) return [];
	return raw.split(',').map(s => s.trim()).filter(Boolean);
}

const ids = splitList(process.env.GMAIL_CLIENT_IDS);
const secrets = splitList(process.env.GMAIL_CLIENT_SECRETS);

const gmailClients = [];
if (ids.length && secrets.length && ids.length === secrets.length) {
	for (let i = 0; i < ids.length; i++) {
		gmailClients.push({ clientId: ids[i], clientSecret: secrets[i] });
	}
} else if (process.env.GMAIL_CLIENT_ID) {
	// Fallback to single variables for backward compatibility
	gmailClients.push({ clientId: process.env.GMAIL_CLIENT_ID, clientSecret: process.env.GMAIL_CLIENT_SECRET });
}

function getSelectedGmailClient() {
	const rawIndex = process.env.GMAIL_CLIENT_INDEX;
	let idx = 0;
	if (rawIndex !== undefined && rawIndex !== null && rawIndex !== '') {
		const parsed = Number(rawIndex);
		if (!Number.isNaN(parsed) && parsed >= 0) idx = parsed;
	}
	return gmailClients[idx] || gmailClients[0] || { clientId: process.env.GMAIL_CLIENT_ID, clientSecret: process.env.GMAIL_CLIENT_SECRET };
}

const selected = getSelectedGmailClient();

export const GMAIL_CLIENT_ID = selected.clientId;
export const GMAIL_CLIENT_SECRET = selected.clientSecret;
export const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI;
export const FRONTEND_REDIRECT_URL = process.env.FRONTEND_REDIRECT_URL;

// Export for advanced usage
export const GMAIL_CLIENTS = gmailClients;
export function getGmailClients() { return gmailClients; }
export function getSelectedGmailClientIndex() { return process.env.GMAIL_CLIENT_INDEX || '0'; }
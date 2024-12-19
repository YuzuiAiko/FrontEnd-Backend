// config.js
import dotenv from "dotenv"; // Import the dotenv module to load environment variables
import path from "path"; // Import the path module for working with file paths
import { fileURLToPath } from "url"; // Import fileURLToPath to convert the module URL to a file path

// Get the current directory using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the .env file into process.env
dotenv.config({ path: path.resolve(__dirname, '.env') }); // Load environment variables from the .env file into process.env
// console.log("Environment variables loaded:", process.env);

export const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
export const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
export const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI;
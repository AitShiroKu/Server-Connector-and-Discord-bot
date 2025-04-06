import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Required environment variables
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '5000', 10); // Timeout in milliseconds
const DATA_FILE = path.join(__dirname, '../data/servers.json');

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('Missing required environment variables (DISCORD_TOKEN, CLIENT_ID, GUILD_ID)');
  process.exit(1);
}

// Create the data directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, '../data'))) {
  fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
}

// Define server interface
interface Server {
  name: string;
  url: string;
  status: string;
  lastChecked: Date | null;
  data?: any;
  error?: string | null;
}

// Server list (should be in a database or config in a real app)
let servers: Server[] = [
  {
    name: 'Main Server',
    url: 'http://localhost:24444',
    status: 'unknown',
    lastChecked: null
  }
];

// Discord client setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// Load servers from file
function loadServersFromFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const loadedServers = JSON.parse(data);
      servers = loadedServers;
      console.log(`Loaded ${servers.length} servers from ${DATA_FILE}`);
    } else {
      saveServersToFile(); // Save default servers
      console.log(`Created new servers file at ${DATA_FILE}`);
    }
  } catch (error) {
    console.error('Error loading servers from file:', error);
  }
}

// Save servers to file
function saveServersToFile() {
  try {
    const data = JSON.stringify(servers, null, 2);
    fs.writeFileSync(DATA_FILE, data, 'utf8');
    console.log(`Saved ${servers.length} servers to ${DATA_FILE}`);
  } catch (error) {
    console.error('Error saving servers to file:', error);
  }
}

// Command to check server status
const commands = [
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check the status of servers'),
  new SlashCommandBuilder()
    .setName('add-server')
    .setDescription('Add a server to monitor')
    .addStringOption(option => 
      option.setName('name')
        .setDescription('Server name')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('url')
        .setDescription('Server URL with port (e.g., http://myserver.net:4120/status)')
        .setRequired(true))
];

// Register commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log('Successfully registered application commands');
  } catch (error) {
    console.error('Error registering application commands:', error);
  }
})();

// Check server status
async function checkServerStatus(server: Server): Promise<Server> {
  try {
    const response = await axios.get(`${server.url}/status`, { 
      timeout: REQUEST_TIMEOUT // Use configurable timeout value
    });
    server.status = 'online';
    server.lastChecked = new Date();
    server.data = response.data;
    server.error = null; // Clear any previous errors
    return server;
  } catch (error: any) {
    server.status = 'offline';
    server.lastChecked = new Date();
    
    // Handle timeout specifically
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      server.error = `Connection timed out after ${REQUEST_TIMEOUT}ms`;
    } else {
      server.error = error.message;
    }
    
    // Clear any previous server data
    server.data = null;
    return server;
  }
}

// Format status message with Discord formatting
function formatStatusMessage(server: Server): string {
  const status = server.status === 'online' ? '🟢 Online' : '🔴 Offline';
  const lastChecked = server.lastChecked ? new Date(server.lastChecked).toLocaleString() : 'Never';
  
  let message = `**${server.name}** | ${status}\n`;
  message += `>>> URL: ${server.url}\n`;
  message += `Last Checked: ${lastChecked}\n`;
  
  if (server.status === 'online' && server.data) {
    const data = server.data;
    message += `**System Info:**\n`;
    message += `Hostname: \`${data.hostname}\`\n`;
    message += `Platform: \`${data.platform}\`\n`;
    message += `Uptime: \`${Math.floor(data.uptime / 3600)} hours\`\n`;
    message += `Memory Usage: \`${data.memory.usedPercentage}%\`\n`;
    message += `CPU Usage: \`${data.cpu.usagePercentage}%\`\n`;
  } else if (server.error) {
    if (server.error.includes('timeout')) {
      message += `❌ **Timeout Error**: Server did not respond within ${REQUEST_TIMEOUT}ms\n`;
    } else if (server.error.includes('ECONNREFUSED')) {
      message += `❌ **Connection Error**: Server is not accepting connections\n`;
    } else {
      message += `❌ **Error**: ${server.error}\n`;
    }
  }
  
  return message;
}

// Listen for commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'status') {
    await interaction.deferReply();
    
    try {
      // Check all servers
      const statusPromises = servers.map(server => checkServerStatus(server));
      const updatedServers = await Promise.all(statusPromises);
      
      // Format response
      let response = '# Server Status Report\n\n';
      updatedServers.forEach(server => {
        response += formatStatusMessage(server) + '\n';
      });
      
      await interaction.editReply(response);
    } catch (error) {
      console.error('Error checking server status:', error);
      await interaction.editReply('Error checking server status');
    }
  } else if (commandName === 'add-server') {
    const name = interaction.options.getString('name');
    const url = interaction.options.getString('url');
    
    if (!name || !url) {
      await interaction.reply('Missing required parameters');
      return;
    }
    
    // Add server to list
    const newServer = {
      name,
      url,
      status: 'unknown',
      lastChecked: null
    };
    
    servers.push(newServer);
    saveServersToFile(); // Save servers after adding a new one
    await interaction.reply(`Added server: ${name} (${url})`);
  }
});

// Ready event
client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
  
  // Load servers from file when bot starts
  loadServersFromFile();
  
  // Set up periodic status checking
  setInterval(async () => {
    try {
      for (const server of servers) {
        await checkServerStatus(server);
      }
      // Save servers to file after checking status
      saveServersToFile();
      console.log('Server status check completed');
    } catch (error) {
      console.error('Error in periodic status check:', error);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
});

// Login to Discord
client.login(TOKEN); 